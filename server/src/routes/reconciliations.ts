import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { writeAuditLog } from '../middleware/auditLog';
import db from '../config/database';

export const reconciliationRouter = Router();

// GET / — Uzlaşdırma siyahısı
reconciliationRouter.get('/', authenticate, authorize('reconciliations:read'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { entity_type, source_system, sync_status, page = '1', limit = '20' } = req.query;
      const p = parseInt(page as string);
      const l = Math.min(parseInt(limit as string), 100);

      let query = db('reconciliations');
      let countQuery = db('reconciliations');

      if (entity_type) {
        query = query.where({ entity_type: entity_type as string });
        countQuery = countQuery.where({ entity_type: entity_type as string });
      }
      if (source_system) {
        query = query.where({ source_system: source_system as string });
        countQuery = countQuery.where({ source_system: source_system as string });
      }
      if (sync_status) {
        query = query.where({ sync_status: sync_status as string });
        countQuery = countQuery.where({ sync_status: sync_status as string });
      }

      const [{ count }] = await countQuery.count();
      const data = await query.orderBy('created_at', 'desc').limit(l).offset((p - 1) * l);

      res.json({
        data,
        pagination: {
          page: p, limit: l,
          total: parseInt(count as string),
          totalPages: Math.ceil(parseInt(count as string) / l),
        },
      });
    } catch (error) {
      res.status(500).json({ error: 'Uzlaşdırma siyahısı alınarkən xəta' });
    }
  }
);

// PATCH /:id/resolve — Conflict həll et
reconciliationRouter.patch('/:id/resolve', authenticate, authorize('reconciliations:update'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { conflict_notes } = req.body;
      if (!conflict_notes) {
        res.status(400).json({ error: 'Conflict qeydi məcburidir' });
        return;
      }

      const [updated] = await db('reconciliations')
        .where({ id: req.params.id })
        .update({
          sync_status: 'ok',
          conflict_notes,
          updated_at: new Date(),
        })
        .returning('*');

      await writeAuditLog({
        entity_type: 'reconciliation',
        entity_id: req.params.id,
        action: 'resolve_conflict',
        reason: conflict_notes,
        actor_user_id: req.user!.userId,
        actor_role: req.user!.role,
        ip_address: req.ip,
      });

      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: 'Conflict həll edilərkən xəta' });
    }
  }
);
