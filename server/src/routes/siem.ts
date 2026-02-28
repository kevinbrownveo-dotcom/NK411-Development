/**
 * SIEM Admin Routes — Faza 15 §3
 *
 * SIEM destination CRUD + health check + test log
 * Log retention policy management
 * Security event viewer
 * Audit chain verification
 */
import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { writeAuditLog, verifyAuditChain } from '../middleware/auditLog';
import { logger } from '../utils/logger';
import { mailService } from '../utils/mailer';
import db from '../config/database';
import { isForwardingEnabled, setForwardingEnabled, sendTestLog, reloadDestinations, getLogLevel, setLogLevel } from '../services/siemForwarder';

export const siemRouter = Router();

// ══════════════════════════════════════════════════════════════
// Global Forwarding Toggle
// ══════════════════════════════════════════════════════════════

/** GET /api/siem/forwarding-status */
siemRouter.get('/forwarding-status', authenticate, authorize('users:read'),
    (_req: AuthRequest, res: Response) => {
        res.json({ enabled: isForwardingEnabled(), logLevel: getLogLevel() });
    }
);

/** POST /api/siem/forwarding-status — { enabled: true/false } */
siemRouter.post('/forwarding-status', authenticate, authorize('users:update'),
    async (req: AuthRequest, res: Response) => {
        const { enabled } = req.body;
        setForwardingEnabled(!!enabled);

        await writeAuditLog({
            entity_type: 'siem_config', entity_id: 'forwarding-toggle',
            action: 'update', changed_fields: { forwarding_enabled: enabled },
            actor_user_id: req.user!.userId, actor_role: req.user!.role,
            ip_address: req.ip,
        });

        // Epic 2.2: Critical Alert if SIEM is disabled
        if (!enabled) {
            const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip || 'Naməlum';
            const identifier = `${req.user!.email} (Rolu: ${req.user!.role})`;
            mailService.sendSiemDisabledAlert(Array.isArray(ip) ? ip[0] : ip, identifier).catch(() => { });
        }

        res.json({ enabled: isForwardingEnabled(), logLevel: getLogLevel() });
    }
);

/** POST /api/siem/log-level — { level: 'DEBUG'|'INFO'|'WARN'|'ERROR'|'CRITICAL' } */
siemRouter.post('/log-level', authenticate, authorize('users:update'),
    async (req: AuthRequest, res: Response) => {
        const { level } = req.body;
        const validLevels = ['OFF', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL'];
        if (!level || !validLevels.includes(level.toUpperCase())) {
            res.status(400).json({ error: 'Düzgün level seçin: DEBUG, INFO, WARN, ERROR, CRITICAL' });
            return;
        }
        const oldLevel = getLogLevel();
        setLogLevel(level);
        await writeAuditLog({
            entity_type: 'siem_config', entity_id: 'log-level',
            action: 'update', changed_fields: { old_level: oldLevel, new_level: level.toUpperCase() },
            actor_user_id: req.user!.userId, actor_role: req.user!.role,
            ip_address: req.ip, severity: 'WARN',
        });
        res.json({ logLevel: getLogLevel() });
    }
);

// ══════════════════════════════════════════════════════════════
// SIEM Destinations CRUD
// ══════════════════════════════════════════════════════════════

/** GET /api/siem/destinations — Bütün SIEM hədəfləri */
siemRouter.get('/destinations', authenticate, authorize('users:read'),
    async (_req: AuthRequest, res: Response) => {
        try {
            const destinations = await db('siem_destinations').orderBy('created_at', 'desc');
            res.json(destinations);
        } catch (error) {
            res.status(500).json({ error: 'SIEM hədəfləri alınarkən xəta' });
        }
    }
);

/** POST /api/siem/destinations — Yeni hədəf əlavə et */
siemRouter.post('/destinations', authenticate, authorize('users:create'),
    async (req: AuthRequest, res: Response) => {
        try {
            const { name, protocol, host, port, facility, severity_threshold,
                tls_enabled, ca_cert, client_cert, retry_max, retry_backoff_ms, queue_size } = req.body;

            if (!name || !protocol || !host || !port) {
                res.status(400).json({ error: 'name, protocol, host, port tələb olunur' });
                return;
            }

            const [dest] = await db('siem_destinations').insert({
                name, protocol, host, port,
                facility: facility || 1,
                severity_threshold: severity_threshold || 'INFO',
                tls_enabled: tls_enabled || false,
                ca_cert: ca_cert || null,
                client_cert: client_cert || null,
                retry_max: retry_max || 3,
                retry_backoff_ms: retry_backoff_ms || 1000,
                queue_size: queue_size || 10000,
            }).returning('*');

            await writeAuditLog({
                entity_type: 'siem_destination', entity_id: dest.id,
                action: 'create', changed_fields: { name, protocol, host, port },
                actor_user_id: req.user!.userId, actor_role: req.user!.role,
                ip_address: req.ip,
            });

            res.status(201).json(dest);
            reloadDestinations().catch(() => { });
        } catch (error) {
            res.status(500).json({ error: 'SIEM hədəfi yaradılarkən xəta' });
        }
    }
);

/** PUT /api/siem/destinations/:id */
siemRouter.put('/destinations/:id', authenticate, authorize('users:update'),
    async (req: AuthRequest, res: Response) => {
        try {
            const existing = await db('siem_destinations').where({ id: req.params.id }).first();
            if (!existing) { res.status(404).json({ error: 'Hədəf tapılmadı' }); return; }

            const [updated] = await db('siem_destinations')
                .where({ id: req.params.id })
                .update({ ...req.body, updated_at: new Date() })
                .returning('*');

            await writeAuditLog({
                entity_type: 'siem_destination', entity_id: req.params.id,
                action: 'update', before_state: existing, after_state: updated,
                actor_user_id: req.user!.userId, actor_role: req.user!.role,
                ip_address: req.ip,
            });

            res.json(updated);
            reloadDestinations().catch(() => { });
        } catch (error) {
            res.status(500).json({ error: 'SIEM hədəfi yenilənərkən xəta' });
        }
    }
);

/** DELETE /api/siem/destinations/:id */
siemRouter.delete('/destinations/:id', authenticate, authorize('users:delete'),
    async (req: AuthRequest, res: Response) => {
        try {
            const existing = await db('siem_destinations').where({ id: req.params.id }).first();
            if (!existing) { res.status(404).json({ error: 'Hədəf tapılmadı' }); return; }

            await db('siem_destinations').where({ id: req.params.id }).delete();

            await writeAuditLog({
                entity_type: 'siem_destination', entity_id: req.params.id,
                action: 'delete', changed_fields: existing,
                actor_user_id: req.user!.userId, actor_role: req.user!.role,
                ip_address: req.ip,
            });

            res.json({ message: 'SIEM hədəfi silindi' });
            reloadDestinations().catch(() => { });
        } catch (error) {
            res.status(500).json({ error: 'SIEM hədəfi silinərkən xəta' });
        }
    }
);

/** POST /api/siem/destinations/:id/test — Real test log göndər */
siemRouter.post('/destinations/:id/test', authenticate, authorize('users:read'),
    async (req: AuthRequest, res: Response) => {
        try {
            const result = await sendTestLog(req.params.id);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: 'Test log göndərilə bilmədi' });
        }
    }
);

// ══════════════════════════════════════════════════════════════
// Log Retention Policies
// ══════════════════════════════════════════════════════════════

/** GET /api/siem/retention — Retention siyasətləri */
siemRouter.get('/retention', authenticate, authorize('users:read'),
    async (_req: AuthRequest, res: Response) => {
        try {
            const policies = await db('log_retention_policies').orderBy('log_table');
            res.json(policies);
        } catch (error) {
            res.status(500).json({ error: 'Retention siyasətləri alınarkən xəta' });
        }
    }
);

/** PUT /api/siem/retention/:id */
siemRouter.put('/retention/:id', authenticate, authorize('users:update'),
    async (req: AuthRequest, res: Response) => {
        try {
            const { retention_days, archive_enabled, archive_path } = req.body;
            const [updated] = await db('log_retention_policies')
                .where({ id: req.params.id })
                .update({ retention_days, archive_enabled, archive_path })
                .returning('*');
            res.json(updated);
        } catch (error) {
            res.status(500).json({ error: 'Retention siyasəti yenilənərkən xəta' });
        }
    }
);

/** POST /api/siem/retention/run — Manual cleanup işə salır */
siemRouter.post('/retention/run', authenticate, authorize('users:update'),
    async (req: AuthRequest, res: Response) => {
        try {
            // Import dynamically to avoid circular dependency issues at the router level
            const { runLogRetentionCleanup } = await import('../services/logRetentionService');
            await runLogRetentionCleanup();
            await writeAuditLog({
                entity_type: 'siem_config', entity_id: 'retention-cleanup',
                action: 'update', changed_fields: { action: 'manual_cleanup_triggered' },
                actor_user_id: req.user!.userId, actor_role: req.user!.role,
                ip_address: req.ip, severity: 'WARN'
            });
            res.json({ success: true, message: 'Verilənlər bazası köhnə loglardan təmizləndi.' });
        } catch (err: any) {
            logger.error('Manual log cleanup failed', err);
            res.status(500).json({ error: 'Məlumat bazası təmizlənərkən xəta baş verdi' });
        }
    }
);

// ══════════════════════════════════════════════════════════════
// Security Events & Audit Chain
// ══════════════════════════════════════════════════════════════

/** GET /api/siem/security-events — Son security hadisələri */
siemRouter.get('/security-events', authenticate, authorize('audit:read'),
    async (req: AuthRequest, res: Response) => {
        try {
            const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
            const eventType = req.query.event_type as string;
            const severity = req.query.severity as string;

            let query = db('security_event_log')
                .orderBy('created_at', 'desc')
                .limit(limit);

            if (eventType) query = query.where('event_type', eventType);
            if (severity) query = query.where('severity', severity);

            const events = await query;
            res.json(events);
        } catch (error) {
            res.status(500).json({ error: 'Security hadisələri alınarkən xəta' });
        }
    }
);

/** POST /api/siem/audit-verify-chain — Hash chain yoxlaması */
siemRouter.post('/audit-verify-chain', authenticate, authorize('audit:read'),
    async (req: AuthRequest, res: Response) => {
        try {
            const { entity_type, entity_id } = req.body;
            if (!entity_type || !entity_id) {
                res.status(400).json({ error: 'entity_type və entity_id tələb olunur' });
                return;
            }

            const result = await verifyAuditChain(entity_type, entity_id);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: 'Audit chain yoxlaması xəta' });
        }
    }
);
