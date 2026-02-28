import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { writeAuditLog } from '../middleware/auditLog';
import db from '../config/database';

export const riskRelationsRouter = Router();

// ── Risk ↔ Asset ──────────────────────────────────
riskRelationsRouter.post('/:id/assets', authenticate, authorize('risks:update'),
    async (req: AuthRequest, res: Response) => {
        try {
            const { asset_id } = req.body;
            if (!asset_id) { res.status(400).json({ error: 'asset_id tələb olunur' }); return; }

            const [record] = await db('risk_assets').insert({
                risk_id: req.params.id, asset_id,
            }).returning('*');

            await writeAuditLog({
                entity_type: 'risk_asset', entity_id: record.id, action: 'create',
                changed_fields: { risk_id: req.params.id, asset_id },
                actor_user_id: req.user!.userId, actor_role: req.user!.role, ip_address: req.ip,
            });

            res.status(201).json(record);
        } catch (error: any) {
            if (error.code === '23505') { res.status(409).json({ error: 'Bu əlaqə artıq mövcuddur' }); return; }
            res.status(500).json({ error: 'Aktiv əlavə edilərkən xəta' });
        }
    }
);

riskRelationsRouter.delete('/:id/assets/:assetId', authenticate, authorize('risks:update'),
    async (req: AuthRequest, res: Response) => {
        try {
            await db('risk_assets').where({ risk_id: req.params.id, asset_id: req.params.assetId }).delete();
            res.json({ message: 'Aktiv əlaqəsi silindi' });
        } catch (error) {
            res.status(500).json({ error: 'Əlaqə silinərkən xəta' });
        }
    }
);

// ── Risk ↔ Threat ──────────────────────────────────
riskRelationsRouter.post('/:id/threats', authenticate, authorize('risks:update'),
    async (req: AuthRequest, res: Response) => {
        try {
            const { threat_id, link_type, rationale } = req.body;
            if (!threat_id) { res.status(400).json({ error: 'threat_id tələb olunur' }); return; }

            const [record] = await db('risk_threats').insert({
                risk_id: req.params.id, threat_id,
                link_type: link_type || 'primary',
                rationale: rationale || null,
                created_by: req.user!.userId,
            }).returning('*');

            await writeAuditLog({
                entity_type: 'risk_threat', entity_id: record.id, action: 'create',
                changed_fields: { risk_id: req.params.id, threat_id },
                actor_user_id: req.user!.userId, actor_role: req.user!.role, ip_address: req.ip,
            });

            res.status(201).json(record);
        } catch (error: any) {
            if (error.code === '23505') { res.status(409).json({ error: 'Bu əlaqə artıq mövcuddur' }); return; }
            res.status(500).json({ error: 'Təhdid əlavə edilərkən xəta' });
        }
    }
);

riskRelationsRouter.delete('/:id/threats/:threatId', authenticate, authorize('risks:update'),
    async (req: AuthRequest, res: Response) => {
        try {
            await db('risk_threats').where({ risk_id: req.params.id, threat_id: req.params.threatId }).delete();
            res.json({ message: 'Təhdid əlaqəsi silindi' });
        } catch (error) {
            res.status(500).json({ error: 'Əlaqə silinərkən xəta' });
        }
    }
);

// ── Risk ↔ Vulnerability ──────────────────────────────────
riskRelationsRouter.post('/:id/vulnerabilities', authenticate, authorize('risks:update'),
    async (req: AuthRequest, res: Response) => {
        try {
            const { vulnerability_id } = req.body;
            if (!vulnerability_id) { res.status(400).json({ error: 'vulnerability_id tələb olunur' }); return; }

            const [record] = await db('risk_vulnerabilities').insert({
                risk_id: req.params.id, vulnerability_id,
            }).returning('*');

            await writeAuditLog({
                entity_type: 'risk_vulnerability', entity_id: record.id, action: 'create',
                changed_fields: { risk_id: req.params.id, vulnerability_id },
                actor_user_id: req.user!.userId, actor_role: req.user!.role, ip_address: req.ip,
            });

            res.status(201).json(record);
        } catch (error: any) {
            if (error.code === '23505') { res.status(409).json({ error: 'Bu əlaqə artıq mövcuddur' }); return; }
            res.status(500).json({ error: 'Boşluq əlavə edilərkən xəta' });
        }
    }
);

riskRelationsRouter.delete('/:id/vulnerabilities/:vulnId', authenticate, authorize('risks:update'),
    async (req: AuthRequest, res: Response) => {
        try {
            await db('risk_vulnerabilities').where({ risk_id: req.params.id, vulnerability_id: req.params.vulnId }).delete();
            res.json({ message: 'Boşluq əlaqəsi silindi' });
        } catch (error) {
            res.status(500).json({ error: 'Əlaqə silinərkən xəta' });
        }
    }
);

// ── Risk ↔ Solution ──────────────────────────────────
riskRelationsRouter.post('/:id/solutions', authenticate, authorize('risks:update'),
    async (req: AuthRequest, res: Response) => {
        try {
            const { solution_id } = req.body;
            if (!solution_id) { res.status(400).json({ error: 'solution_id tələb olunur' }); return; }

            const [record] = await db('risk_solutions').insert({
                risk_id: req.params.id, solution_id,
            }).returning('*');

            await writeAuditLog({
                entity_type: 'risk_solution', entity_id: record.id, action: 'create',
                changed_fields: { risk_id: req.params.id, solution_id },
                actor_user_id: req.user!.userId, actor_role: req.user!.role, ip_address: req.ip,
            });

            res.status(201).json(record);
        } catch (error: any) {
            if (error.code === '23505') { res.status(409).json({ error: 'Bu əlaqə artıq mövcuddur' }); return; }
            res.status(500).json({ error: 'Həll əlavə edilərkən xəta' });
        }
    }
);

riskRelationsRouter.delete('/:id/solutions/:solutionId', authenticate, authorize('risks:update'),
    async (req: AuthRequest, res: Response) => {
        try {
            await db('risk_solutions').where({ risk_id: req.params.id, solution_id: req.params.solutionId }).delete();
            res.json({ message: 'Həll əlaqəsi silindi' });
        } catch (error) {
            res.status(500).json({ error: 'Əlaqə silinərkən xəta' });
        }
    }
);
