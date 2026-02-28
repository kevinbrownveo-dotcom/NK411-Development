import { Router, Response } from 'express';
import { createCrudRouter } from '../utils/crudFactory';
import { generateCode } from '../utils/codeGenerator';
import { authenticate, AuthRequest } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { writeAuditLog } from '../middleware/auditLog';
import db from '../config/database';

export const threatRouter = createCrudRouter({
  table: 'rr_central.threats',
  entityType: 'təhdid',
  permissionPrefix: 'threats',
  searchColumns: ['name', 'realization_tech'],
  beforeCreate: async (data) => {
    data.threat_code = await generateCode('THR');
    return data;
  },
});

// POST /api/threats/sync — DXƏIT sinxronizasiyası
threatRouter.post('/sync', authenticate, authorize('threats:create'),
  async (req: AuthRequest, res: Response) => {
    try {
      const threats = req.body.threats;
      if (!Array.isArray(threats)) {
        res.status(400).json({ error: 'threats massivi tələb olunur' });
        return;
      }

      const results = { created: 0, updated: 0, skipped: 0 };

      for (const threat of threats) {
        const existing = await db('threats')
          .where({ threat_code: threat.threat_code })
          .first();

        if (existing) {
          if (existing.is_external) {
            await db('threats')
              .where({ id: existing.id })
              .update({ ...threat, updated_at: new Date() });
            results.updated++;
          } else {
            results.skipped++;
          }
        } else {
          const code = await generateCode('THR');
          await db('threats').insert({
            ...threat,
            threat_code: code,
            is_external: true,
            created_by: req.user!.userId,
          });
          results.created++;
        }
      }

      await writeAuditLog({
        entity_type: 'threat',
        entity_id: 'batch',
        action: 'sync',
        changed_fields: results,
        actor_user_id: req.user!.userId,
        actor_role: req.user!.role,
        ip_address: req.ip,
      });

      res.json({ message: 'DXƏIT sinxronizasiyası tamamlandı', results });
    } catch (error) {
      res.status(500).json({ error: 'Sinxronizasiya zamanı xəta' });
    }
  }
);
