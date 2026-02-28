import { Router, Response } from 'express';
import { createCrudRouter } from '../utils/crudFactory';
import { generateCode } from '../utils/codeGenerator';
import { authenticate, AuthRequest } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { writeAuditLog } from '../middleware/auditLog';
import db from '../config/database';

export const incidentRouter = createCrudRouter({
  table: 'rr_central.incidents',
  entityType: 'insident',
  permissionPrefix: 'incidents',
  searchColumns: ['title', 'description'],
  beforeCreate: async (data) => {
    data.incident_code = await generateCode('INC');
    return data;
  },
});

// POST /api/incidents/webhook — SIEM / xarici sistem webhook (PATCH-01)
incidentRouter.post('/webhook', async (req, res: Response) => {
  try {
    const { title, type, severity, description, source_system } = req.body;

    if (!title || !type || !severity || !description) {
      res.status(400).json({ error: 'Bütün məcburi sahələr tələb olunur' });
      return;
    }

    const code = await generateCode('INC');
    const [incident] = await db('incidents').insert({
      incident_code: code,
      title,
      type,
      severity,
      description,
      detection_datetime: new Date(),
      status: 'yeni',
    }).returning('*');

    // Uzlaşdırma qeydi yarat (PATCH-01)
    if (source_system) {
      await db('reconciliations').insert({
        entity_type: 'incident',
        entity_id: incident.id,
        source_system,
        source_record_id: req.body.source_record_id || null,
        sync_direction: 'inbound',
        last_sync_at: new Date(),
        sync_status: 'ok',
      });
    }

    await writeAuditLog({
      entity_type: 'incident',
      entity_id: incident.id,
      action: 'create',
      changed_fields: { source: 'webhook', source_system },
    });

    res.status(201).json(incident);
  } catch (error) {
    res.status(500).json({ error: 'Webhook emalı zamanı xəta' });
  }
});

// POST /api/incidents/:id/actions — İnsident cavab addımı əlavə et
incidentRouter.post('/:id/actions', authenticate, authorize('incidents:update'),
  async (req: AuthRequest, res: Response) => {
    try {
      const incident = await db('incidents').where({ id: req.params.id }).first();
      if (!incident) {
        res.status(404).json({ error: 'İnsident tapılmadı' });
        return;
      }

      const [action] = await db('incident_actions').insert({
        incident_id: req.params.id,
        action_title: req.body.action_title,
        action_description: req.body.action_description,
        assigned_to: req.body.assigned_to || null,
        due_date: req.body.due_date || null,
      }).returning('*');

      await writeAuditLog({
        entity_type: 'incident_action',
        entity_id: action.id,
        action: 'create',
        changed_fields: req.body,
        actor_user_id: req.user!.userId,
        actor_role: req.user!.role,
        ip_address: req.ip,
      });

      res.status(201).json(action);
    } catch (error) {
      res.status(500).json({ error: 'Cavab addımı əlavə edilərkən xəta' });
    }
  }
);

// ── 13-phase sequential workflow (Annex §6.1.5 compliance) ──────
const PHASE_ORDER = [
  'detect', 'notify', 'monitor', 'assess', 'block', 'restore',
  'change', 'update_info', 'improve', 'failover', 'rollback',
  'evidence', 'anticrisis',
] as const;

// PUT /api/incidents/:id/phase — Mərhələ keçidi (ardıcıl)
incidentRouter.put('/:id/phase', authenticate, authorize('incidents:update'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { next_phase } = req.body;
      if (!next_phase || !PHASE_ORDER.includes(next_phase)) {
        res.status(400).json({
          error: 'Etibarsız mərhələ',
          valid_phases: PHASE_ORDER,
        });
        return;
      }

      const incident = await db('incidents').where({ id: req.params.id }).first();
      if (!incident) {
        res.status(404).json({ error: 'İnsident tapılmadı' });
        return;
      }

      const currentIdx = PHASE_ORDER.indexOf(incident.response_phase || 'detect');
      const nextIdx = PHASE_ORDER.indexOf(next_phase);

      // Yalnız +1 addım irəli (ardıcıl)
      if (nextIdx !== currentIdx + 1) {
        res.status(400).json({
          error: `Ardıcıl keçid pozuldu: "${incident.response_phase}" → "${next_phase}" icazə verilmir. Növbəti mərhələ: "${PHASE_ORDER[currentIdx + 1] || 'son mərhələ'}"`,
          current_phase: incident.response_phase,
          expected_next: PHASE_ORDER[currentIdx + 1] || null,
        });
        return;
      }

      const history = Array.isArray(incident.phase_history) ? incident.phase_history : [];
      history.push({
        from: incident.response_phase,
        to: next_phase,
        at: new Date().toISOString(),
        by: req.user!.userId,
      });

      const [updated] = await db('incidents')
        .where({ id: req.params.id })
        .update({
          response_phase: next_phase,
          phase_changed_at: new Date(),
          phase_history: JSON.stringify(history),
          updated_at: new Date(),
        })
        .returning('*');

      await writeAuditLog({
        entity_type: 'incident',
        entity_id: req.params.id,
        action: 'update',
        changed_fields: { response_phase: { old: incident.response_phase, new: next_phase } },
        actor_user_id: req.user!.userId,
        actor_role: req.user!.role,
        ip_address: req.ip,
      });

      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: 'Mərhələ keçidi zamanı xəta' });
    }
  }
);

// GET /api/incidents/:id/actions — İnsident cavab addımları siyahısı
incidentRouter.get('/:id/actions', authenticate, authorize('incidents:read'),
  async (req: AuthRequest, res: Response) => {
    try {
      const actions = await db('incident_actions')
        .where({ incident_id: req.params.id })
        .orderBy('created_at', 'asc');
      res.json(actions);
    } catch (error) {
      res.status(500).json({ error: 'Cavab addımları alınarkən xəta' });
    }
  }
);
