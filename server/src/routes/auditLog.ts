import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import db from '../config/database';

export const auditLogRouter = Router();

// GET /api/audit-log — Audit jurnalı (admin / auditor)
auditLogRouter.get('/', authenticate, authorize('audit:read'),
  async (req: AuthRequest, res: Response) => {
    try {
      const {
        entity_type, entity_id, action, actor_user_id,
        date_from, date_to,
        page = '1', limit = '50',
      } = req.query;

      const p = parseInt(page as string);
      const l = Math.min(parseInt(limit as string), 100);

      let query = db('audit_log').leftJoin('users', 'audit_log.actor_user_id', 'users.id');
      let countQuery = db('audit_log');

      if (entity_type) {
        query = query.where('audit_log.entity_type', entity_type as string);
        countQuery = countQuery.where('entity_type', entity_type as string);
      }
      if (entity_id) {
        query = query.where('audit_log.entity_id', entity_id as string);
        countQuery = countQuery.where('entity_id', entity_id as string);
      }
      if (action) {
        query = query.where('audit_log.action', action as string);
        countQuery = countQuery.where('action', action as string);
      }
      if (actor_user_id) {
        query = query.where('audit_log.actor_user_id', actor_user_id as string);
        countQuery = countQuery.where('actor_user_id', actor_user_id as string);
      }
      if (date_from) {
        query = query.where('audit_log.created_at', '>=', date_from as string);
        countQuery = countQuery.where('created_at', '>=', date_from as string);
      }
      if (date_to) {
        query = query.where('audit_log.created_at', '<=', date_to as string);
        countQuery = countQuery.where('created_at', '<=', date_to as string);
      }

      const [{ count }] = await countQuery.count();
      const data = await query
        .select(
          'audit_log.*',
          'users.full_name as actor_name',
          'users.email as actor_email'
        )
        .orderBy('audit_log.created_at', 'desc')
        .limit(l)
        .offset((p - 1) * l);

      res.json({
        data,
        pagination: {
          page: p, limit: l,
          total: parseInt(count as string),
          totalPages: Math.ceil(parseInt(count as string) / l),
        },
      });
    } catch (error) {
      res.status(500).json({ error: 'Audit jurnalı alınarkən xəta' });
    }
  }
);
