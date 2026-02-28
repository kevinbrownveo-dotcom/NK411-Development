import { Router, Response } from 'express';
import { createCrudRouter } from '../utils/crudFactory';
import { generateCode } from '../utils/codeGenerator';
import { authenticate, AuthRequest } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { writeAuditLog } from '../middleware/auditLog';
import db from '../config/database';

// Risk hesablama servisi — Qayda §4.2.3
function calculateRiskScores(data: any) {
  const assetValue = parseFloat(data.asset_value) || 1;
  const probFactor = parseInt(data.probability_factor) || 1;
  const statProb = parseFloat(data.statistical_probability) || 0;
  const techImpact = parseInt(data.technical_impact) || 1;
  const bizImpact = parseInt(data.business_impact) || 1;

  // prob_max = MAX(probability_factor normalized, statistical_probability/20)
  const probFactorNorm = probFactor; // 1-5 skala
  const statProbNorm = statProb / 20; // 0-100% → 0-5
  const probMax = Math.max(probFactorNorm, statProbNorm);

  // impact_max = MAX(technical_impact, business_impact)
  const impactMax = Math.max(techImpact, bizImpact);

  // Keyfiyyət: qualitative_score = asset_value × prob_max × impact_max
  const qualitativeScore = assetValue * probMax * impactMax;

  // Kəmiyyət: quantitative_value = asset_value × freq_value × impact_max (Faza 18)
  const freqValue = statProb > 0 ? statProb : (probFactor * 20); // 0-100% arası rəqəm
  const quantitativeValue = assetValue * freqValue * impactMax;

  // Prioritet: 0-4=Aşağı | 5-9=Orta | 10-14=Yüksək | 15-25=Kritik
  let priority: string;
  if (qualitativeScore <= 4) priority = 'aşağı';
  else if (qualitativeScore <= 9) priority = 'orta';
  else if (qualitativeScore <= 14) priority = 'yüksək';
  else priority = 'kritik';

  return {
    prob_max: probMax,
    impact_max: impactMax,
    qualitative_score: qualitativeScore,
    quantitative_value: quantitativeValue,
    priority,
    inherent_risk_score: qualitativeScore, // PATCH-07
  };
}

export const riskRouter = createCrudRouter({
  table: 'rr_core.risks',
  entityType: 'risk',
  permissionPrefix: 'risks',
  searchColumns: ['name', 'description'],
  // DLP (RR-REQ-0035): admin olmayan istifadəçilər üçün həssas sahələri maskalayır
  sensitiveColumns: ['description', 'treatment_method'],
  dlpMaxLimit: 50,
  beforeCreate: async (data) => {
    data.risk_code = await generateCode('RSK');
    const scores = calculateRiskScores(data);
    return { ...data, ...scores };
  },
  beforeUpdate: async (data, existing) => {
    // Yenidən hesabla əgər inputlar dəyişibsə
    const merged = { ...existing, ...data };
    const scores = calculateRiskScores(merged);
    return { ...data, ...scores };
  },
});

// GET /api/risks/:id/score — Real vaxtda risk skoru hesabla
riskRouter.get('/:id/score', authenticate, authorize('risks:read'),
  async (req: AuthRequest, res: Response) => {
    try {
      const risk = await db('risks').where({ id: req.params.id }).first();
      if (!risk) {
        res.status(404).json({ error: 'Risk tapılmadı' });
        return;
      }

      // Əlaqəli aktivlərin ortalama dəyərini hesabla
      const assetAvg = await db('risk_assets')
        .join('assets', 'risk_assets.asset_id', 'assets.id')
        .where('risk_assets.risk_id', req.params.id)
        .avg('assets.value as avg_value')
        .first();

      const assetValue = assetAvg?.avg_value || risk.asset_value || 1;
      const scores = calculateRiskScores({ ...risk, asset_value: assetValue });

      res.json({
        risk_id: risk.id,
        risk_code: risk.risk_code,
        asset_value: assetValue,
        ...scores,
      });
    } catch (error) {
      res.status(500).json({ error: 'Risk skoru hesablanarkən xəta' });
    }
  }
);

// GET /api/risks/:id/relations — Riskə bağlı bütün əlaqələr
riskRouter.get('/:id/relations', authenticate, authorize('risks:read'),
  async (req: AuthRequest, res: Response) => {
    try {
      const [assets, threats, vulnerabilities, consequences, solutions] = await Promise.all([
        db('risk_assets').join('assets', 'risk_assets.asset_id', 'assets.id')
          .where('risk_assets.risk_id', req.params.id).select('assets.*'),
        db('risk_threats').join('threats', 'risk_threats.threat_id', 'threats.id')
          .where('risk_threats.risk_id', req.params.id)
          .select('threats.*', 'risk_threats.link_type', 'risk_threats.rationale'),
        db('risk_vulnerabilities').join('vulnerabilities', 'risk_vulnerabilities.vulnerability_id', 'vulnerabilities.id')
          .where('risk_vulnerabilities.risk_id', req.params.id).select('vulnerabilities.*'),
        db('consequences').where({ risk_id: req.params.id }),
        db('risk_solutions').join('solutions', 'risk_solutions.solution_id', 'solutions.id')
          .where('risk_solutions.risk_id', req.params.id).select('solutions.*'),
      ]);

      res.json({ assets, threats, vulnerabilities, consequences, solutions });
    } catch (error) {
      res.status(500).json({ error: 'Əlaqələr alınarkən xəta' });
    }
  }
);

// ── SoD: Risk təsdiqi (§3.1.4 — creator ≠ approver) ────────────
riskRouter.put('/:id/approve', authenticate, authorize('risks:update'),
  async (req: AuthRequest, res: Response) => {
    try {
      const risk = await db('risks').where({ id: req.params.id }).first();
      if (!risk) {
        res.status(404).json({ error: 'Risk tapılmadı' });
        return;
      }

      // SoD: Yaradan özü təsdiqləyə bilməz
      if (risk.created_by === req.user!.userId) {
        res.status(403).json({
          error: 'SoD pozuntusu: Riski yaradan şəxs onu təsdiqləyə bilməz (§3.1.4)',
          created_by: risk.created_by,
          approver: req.user!.userId,
        });
        return;
      }

      const [updated] = await db('risks')
        .where({ id: req.params.id })
        .update({
          approved_by: req.user!.userId,
          approved_at: new Date(),
          updated_at: new Date(),
        })
        .returning('*');

      await writeAuditLog({
        entity_type: 'risk',
        entity_id: req.params.id,
        action: 'update',
        changed_fields: { approved_by: req.user!.userId, approved_at: new Date() },
        actor_user_id: req.user!.userId,
        actor_role: req.user!.role,
        ip_address: req.ip,
      });

      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: 'Təsdiq zamanı xəta' });
    }
  }
);
