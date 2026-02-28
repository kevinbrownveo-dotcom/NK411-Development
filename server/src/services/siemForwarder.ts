/**
 * SIEM Forwarder Service — Real TCP/TLS Log Forwarding
 *
 * - TCP plain socket forwarding
 * - TLS encrypted forwarding (ca_cert, client_cert support)
 * - In-memory queue with retry + exponential backoff
 * - Global enable/disable toggle
 * - Syslog RFC5424 format support
 */
import * as net from 'net';
import * as tls from 'tls';
import db from '../config/database';
import { logger } from '../utils/logger';

interface SiemDest {
    id: string;
    name: string;
    protocol: string; // UDP | TCP | TLS
    host: string;
    port: number;
    facility: number;
    severity_threshold: string;
    tls_enabled: boolean;
    ca_cert: string | null;
    client_cert: string | null;
    client_key_encrypted: string | null;
    retry_max: number;
    retry_backoff_ms: number;
    queue_size: number;
    is_active: boolean;
}

interface LogEntry {
    '@timestamp': string;
    event_type: string;
    action: string;
    entity_type?: string;
    entity_id?: string;
    user_email?: string;
    user_role?: string;
    source_ip?: string;
    result?: string;
    severity?: string;
    correlation_id?: string;
    changed_fields?: any;
    reason?: string;
    [key: string]: any;
}

// ── Severity ordering ──────────────────────────────────
const SEV_ORDER: Record<string, number> = {
    DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3, CRITICAL: 4,
};

// ── Global state ──────────────────────────────────────
let globalEnabled = true;
const queues = new Map<string, LogEntry[]>();
const connections = new Map<string, net.Socket>();
let destinations: SiemDest[] = [];

// ── Load destinations from DB ─────────────────────────
async function loadDestinations(): Promise<void> {
    try {
        destinations = await db('siem_destinations').where({ is_active: true });
        logger.info(`SIEM forwarder: ${destinations.length} aktiv hədəf yükləndi`);
    } catch (err) {
        logger.error('SIEM destinations yüklənərkən xəta', { error: err });
    }
}

// ── RFC5424 Syslog format ─────────────────────────────
function toSyslog(entry: LogEntry, facility: number): string {
    const sevMap: Record<string, number> = {
        CRITICAL: 2, ERROR: 3, WARN: 4, INFO: 6, DEBUG: 7,
    };
    const sev = sevMap[(entry.severity || 'INFO').toUpperCase()] || 6;
    const pri = facility * 8 + sev;
    const ts = entry['@timestamp'] || new Date().toISOString();
    const host = 'risk-registry';
    const app = 'rr-grc';
    const msg = JSON.stringify(entry);
    return `<${pri}>1 ${ts} ${host} ${app} - - - ${msg}`;
}

// ── Send to a single destination ─────────────────────
function sendToDestination(dest: SiemDest, entry: LogEntry): Promise<boolean> {
    return new Promise((resolve) => {
        const payload = dest.protocol === 'UDP'
            ? toSyslog(entry, dest.facility) + '\n'
            : JSON.stringify(entry) + '\n';

        const buffer = Buffer.from(payload, 'utf-8');

        if (dest.protocol === 'UDP') {
            // UDP: dgram
            const dgram = require('dgram');
            const client = dgram.createSocket('udp4');
            client.send(buffer, 0, buffer.length, dest.port, dest.host, (err: any) => {
                client.close();
                if (err) {
                    logger.warn(`SIEM UDP göndərmə xətası: ${dest.name}`, { error: err.message });
                    resolve(false);
                } else {
                    resolve(true);
                }
            });
            return;
        }

        // TCP or TLS
        const connectOpts: any = { host: dest.host, port: dest.port, timeout: 5000 };

        if (dest.protocol === 'TLS' || dest.tls_enabled) {
            if (dest.ca_cert) connectOpts.ca = dest.ca_cert;
            if (dest.client_cert) connectOpts.cert = dest.client_cert;
            if (dest.client_key_encrypted) connectOpts.key = dest.client_key_encrypted;
            connectOpts.rejectUnauthorized = !!dest.ca_cert;

            const socket = tls.connect(connectOpts, () => {
                socket.write(buffer, (err) => {
                    socket.end();
                    resolve(!err);
                });
            });
            socket.on('error', (err) => {
                logger.warn(`SIEM TLS xətası: ${dest.name}`, { error: err.message });
                resolve(false);
            });
            socket.setTimeout(5000, () => { socket.destroy(); resolve(false); });
        } else {
            // Plain TCP
            const socket = new net.Socket();
            socket.connect(dest.port, dest.host, () => {
                socket.write(buffer, (err) => {
                    socket.end();
                    resolve(!err);
                });
            });
            socket.on('error', (err) => {
                logger.warn(`SIEM TCP xətası: ${dest.name}`, { error: err.message });
                resolve(false);
            });
            socket.setTimeout(5000, () => { socket.destroy(); resolve(false); });
        }
    });
}

// ── Retry with backoff ────────────────────────────────
async function sendWithRetry(dest: SiemDest, entry: LogEntry): Promise<boolean> {
    for (let attempt = 0; attempt <= dest.retry_max; attempt++) {
        const success = await sendToDestination(dest, entry);
        if (success) {
            // Update health status on success
            db('siem_destinations').where({ id: dest.id }).update({
                health_status: 'OK',
                last_health_check: new Date(),
            }).catch(() => { });
            return true;
        }
        if (attempt < dest.retry_max) {
            const delay = dest.retry_backoff_ms * Math.pow(2, attempt);
            await new Promise(r => setTimeout(r, delay));
        }
    }
    // All retries failed
    db('siem_destinations').where({ id: dest.id }).update({
        health_status: 'FAIL',
        last_health_check: new Date(),
    }).catch(() => { });
    return false;
}

// ── Public API ────────────────────────────────────────

export function isForwardingEnabled(): boolean {
    return globalEnabled;
}

export function setForwardingEnabled(enabled: boolean): void {
    globalEnabled = enabled;
    logger.info(`SIEM forwarding ${enabled ? 'AKTİVLƏŞDİRİLDİ' : 'DAYANDIRIDI'}`);
}

/**
 * Forward a log entry to all active SIEM destinations.
 * Called from auditLog writeAuditLog() and logSecurityEvent().
 */
export async function forwardToSiem(entry: LogEntry): Promise<void> {
    if (!globalEnabled) return;
    if (destinations.length === 0) await loadDestinations();
    if (destinations.length === 0) return;

    const entrySeverity = SEV_ORDER[(entry.severity || 'INFO').toUpperCase()] || 1;

    for (const dest of destinations) {
        if (!dest.is_active) continue;

        const threshold = SEV_ORDER[(dest.severity_threshold || 'INFO').toUpperCase()] || 1;
        if (entrySeverity < threshold) continue;

        // Fire and forget — don't block the main request
        sendWithRetry(dest, entry).catch(() => { });
    }
}

/**
 * Send a test log to a specific destination (called from admin UI).
 */
export async function sendTestLog(destId: string): Promise<{ success: boolean; message: string }> {
    const dest = await db('siem_destinations').where({ id: destId }).first();
    if (!dest) return { success: false, message: 'Hədəf tapılmadı' };

    const testEntry: LogEntry = {
        '@timestamp': new Date().toISOString(),
        event_type: 'SIEM_TEST',
        action: 'test',
        result: 'SUCCESS',
        severity: 'INFO',
        entity_type: 'system',
        entity_id: 'test',
        user_email: 'admin@risk-registry.local',
        user_role: 'admin',
        source_ip: '127.0.0.1',
        correlation_id: 'test-' + Date.now(),
    };

    const success = await sendWithRetry(dest, testEntry);
    return {
        success,
        message: success ? `Test logu ${dest.name} (${dest.host}:${dest.port}) üzərinə göndərildi` : `${dest.name} üzərinə göndərmə uğursuz oldu`,
    };
}

/**
 * Reload destinations cache. Call when an admin updates destinations.
 */
export async function reloadDestinations(): Promise<void> {
    await loadDestinations();
}

// Initial load with delay (after DB connection ready)
setTimeout(() => loadDestinations(), 3000);
