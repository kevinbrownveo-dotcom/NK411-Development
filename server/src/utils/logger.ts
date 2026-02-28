/**
 * Enterprise Logger — Faza 15 §1
 *
 * Multi-layer structured JSON logging:
 * - Console (development)
 * - File (enterprise_app.log)
 * - DB write (application_log cədvəli) — ERROR+
 *
 * Sensitive data scrubbing: password, token, secret → ***REDACTED***
 */
import winston from 'winston';
import { getCorrelationId, getRequestId } from '../middleware/correlationId';
import db from '../config/database';
import { forwardToSiem } from '../services/siemForwarder';

// ── Sensitive field scrubbing ──────────────────────────────
const SENSITIVE_KEYS = /password|token|secret|authorization|cookie|api_key|private_key|client_key/i;

function scrubSensitive(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(scrubSensitive);

  const scrubbed: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.test(key)) {
      scrubbed[key] = '***REDACTED***';
    } else if (typeof value === 'object' && value !== null) {
      scrubbed[key] = scrubSensitive(value);
    } else {
      scrubbed[key] = value;
    }
  }
  return scrubbed;
}

// ── Custom format: inject correlation_id ──────────────────
const correlationFormat = winston.format((info) => {
  info.correlation_id = getCorrelationId();
  info.request_id = getRequestId();
  info.service = 'risk-registry';

  // Scrub sensitive data from message metadata
  if (info.metadata) {
    info.metadata = scrubSensitive(info.metadata);
  }
  return info;
});

// ── Winston Logger ────────────────────────────────────────
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
    winston.format.errors({ stack: true }),
    correlationFormat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'risk-registry' },
  transports: [
    // Console — development
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production'
        ? winston.format.json()
        : winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, correlation_id, ...rest }) => {
            const corr = correlation_id ? ` [${(correlation_id as string).slice(0, 8)}]` : '';
            return `${timestamp} ${level}${corr}: ${message} ${Object.keys(rest).length > 2 ? JSON.stringify(scrubSensitive(rest)) : ''}`;
          })
        ),
    }),
    // File — enterprise_app.log (production)
    ...(process.env.NODE_ENV === 'production' ? [
      new winston.transports.File({
        filename: 'logs/enterprise_app.log',
        maxsize: 50 * 1024 * 1024, // 50 MB
        maxFiles: 10,
        format: winston.format.json(),
      }),
      new winston.transports.File({
        filename: 'logs/enterprise_error.log',
        level: 'error',
        maxsize: 50 * 1024 * 1024,
        maxFiles: 5,
        format: winston.format.json(),
      }),
    ] : []),
  ],
});

// ── DB Write for ERROR+ ──────────────────────────────────
// Asinxron olaraq ERROR+ logları application_log-a yazır
logger.on('data', (info) => {
  if (['error', 'crit', 'alert', 'emerg'].includes(info.level)) {
    db('application_log').insert({
      correlation_id: info.correlation_id || null,
      level: info.level.toUpperCase(),
      message: typeof info.message === 'string' ? info.message : JSON.stringify(info.message),
      stack_trace: info.stack || null,
      module: info.module || null,
      metadata: info.metadata ? JSON.stringify(scrubSensitive(info.metadata)) : null,
    }).catch(() => { /* DB write failure should not crash the app */ });
  }
});

// ── Security Event Logger ─────────────────────────────────
export interface SecurityEvent {
  event_type: string;
  user_id?: string;
  role_snapshot?: string;
  source_ip?: string;
  user_agent?: string;
  result: 'SUCCESS' | 'DENY' | 'FAIL';
  reason_code?: string;
  severity?: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
  data_classification?: string;
  metadata?: Record<string, any>;
  latency_ms?: number;
}

export async function logSecurityEvent(event: SecurityEvent): Promise<void> {
  try {
    const correlationId = getCorrelationId();
    const requestId = getRequestId();

    await db('security_event_log').insert({
      correlation_id: correlationId,
      request_id: requestId,
      event_type: event.event_type,
      user_id: event.user_id || null,
      role_snapshot: event.role_snapshot || null,
      source_ip: event.source_ip || null,
      user_agent: event.user_agent || null,
      result: event.result,
      reason_code: event.reason_code || null,
      severity: event.severity || 'INFO',
      data_classification: event.data_classification || 'internal',
      metadata: event.metadata ? JSON.stringify(scrubSensitive(event.metadata)) : null,
      latency_ms: event.latency_ms || null,
    });

    // Winston-a da qeyd et
    logger.log({
      level: event.severity === 'CRITICAL' ? 'error' : event.severity === 'WARN' ? 'warn' : 'info',
      message: `SECURITY_EVENT: ${event.event_type} — ${event.result}`,
      event_type: event.event_type,
      user_id: event.user_id,
      result: event.result,
      source_ip: event.source_ip,
      module: 'security',
    });

    // SIEM forward (fire-and-forget)
    forwardToSiem({
      '@timestamp': new Date().toISOString(),
      event_type: event.event_type,
      action: event.event_type,
      user_role: event.role_snapshot,
      source_ip: event.source_ip,
      result: event.result,
      severity: event.severity || 'INFO',
      correlation_id: correlationId,
    }).catch(() => { });
  } catch (error) {
    // Fallback: Winston-a yaz amma crash etmə
    logger.error('Security event log yazma xətası', { error, event: scrubSensitive(event) });
  }
}

// ── Integration Logger ──────────────────────────────────────
export interface IntegrationEvent {
  direction: 'INBOUND' | 'OUTBOUND';
  protocol: 'LDAP' | 'SYSLOG' | 'API' | 'SMTP' | string;
  destination?: string;
  status: 'SUCCESS' | 'FAIL' | 'TIMEOUT';
  request_payload?: any;
  response_code?: number;
  latency_ms?: number;
  error_message?: string;
}

export async function logIntegrationEvent(event: IntegrationEvent): Promise<void> {
  try {
    await db('integration_log').insert({
      correlation_id: getCorrelationId(),
      direction: event.direction,
      protocol: event.protocol,
      destination: event.destination || null,
      status: event.status,
      request_payload: event.request_payload ? JSON.stringify(scrubSensitive(event.request_payload)) : null,
      response_code: event.response_code || null,
      latency_ms: event.latency_ms || null,
      error_message: event.error_message || null,
    });
  } catch (error) {
    logger.error('Integration log yazma xətası', { error });
  }
}
