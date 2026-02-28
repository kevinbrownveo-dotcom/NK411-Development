import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import db from '../config/database';

export const dashboardRouter = Router();

// GET /api/dashboard/stats — Ümumi statistika
dashboardRouter.get('/stats', authenticate, authorize('dashboard:read'),
  async (_req: AuthRequest, res: Response) => {
    try {
      const [
        riskStats, incidentStats, assetCount, vulnCount, threatCount,
      ] = await Promise.all([
        db('risks').select('priority').count('* as count').groupBy('priority'),
        db('incidents').select('status').count('* as count').groupBy('status'),
        db('assets').where({ status: 'aktiv' }).count('* as count').first(),
        db('vulnerabilities').where({ status: 'açıq' }).count('* as count').first(),
        db('threats').count('* as count').first(),
      ]);

      // Risk heat map data: ehtimal vs təsir
      const heatMapData = await db('risks')
        .select('probability_factor', 'impact_max')
        .count('* as count')
        .whereNotNull('probability_factor')
        .whereNotNull('impact_max')
        .groupBy('probability_factor', 'impact_max');

      // Son 30 gün insidentlər
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentIncidents = await db('incidents')
        .where('created_at', '>=', thirtyDaysAgo)
        .select(db.raw("DATE(created_at) as date"))
        .count('* as count')
        .groupBy(db.raw("DATE(created_at)"))
        .orderBy('date');

      res.json({
        risks: {
          byPriority: riskStats,
          total: riskStats.reduce((sum: number, r: any) => sum + parseInt(r.count), 0),
        },
        incidents: {
          byStatus: incidentStats,
          recent: recentIncidents,
        },
        assets: { activeCount: parseInt(assetCount?.count as string || '0') },
        vulnerabilities: { openCount: parseInt(vulnCount?.count as string || '0') },
        threats: { totalCount: parseInt(threatCount?.count as string || '0') },
        heatMap: heatMapData,
        financial: {
          totalALE: await db('rr_core.risks').sum('total_ale_value as total').first().then(r => parseFloat(r?.total as string || '0')),
          count: await db('rr_core.risks').where({ has_financial_assessment: true }).count('* as count').first().then(r => parseInt(r?.count as string || '0'))
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Dashboard statistikaları alınarkən xəta' });
    }
  }
);

// GET /api/dashboard/kpi — KPI-1 + KPI-2 (PATCH-07)
dashboardRouter.get('/kpi', authenticate, authorize('dashboard:read'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { date_from, date_to } = req.query;

      // KPI-1: Residual Risk vs Appetite
      // KPI1 = 1 - (Count(residual > appetite) / Count(all where appetite set))
      const appetiteRisks = await db('risks')
        .whereNotNull('appetite_threshold')
        .whereNotNull('residual_risk_score');

      const exceedingCount = appetiteRisks.filter(
        (r: any) => parseFloat(r.residual_risk_score) > parseFloat(r.appetite_threshold)
      ).length;
      const totalWithAppetite = appetiteRisks.length;
      const kpi1 = totalWithAppetite > 0
        ? 1 - (exceedingCount / totalWithAppetite)
        : null;

      // KPI-2: İnsident Outcome vs Residual Risk Consistency
      // KPI2 = 1 - (Count(incident.impact_law > risk.residual_band_law) / Count(mapped incidents))
      let incidentQuery = db('incidents')
        .join('risks', 'incidents.risk_id', 'risks.id')
        .whereNotNull('incidents.impact_law')
        .whereNotNull('risks.residual_band_law');

      if (date_from) incidentQuery = incidentQuery.where('incidents.created_at', '>=', date_from as string);
      if (date_to) incidentQuery = incidentQuery.where('incidents.created_at', '<=', date_to as string);

      const mappedIncidents = await incidentQuery.select(
        'incidents.impact_law',
        'risks.residual_band_law'
      );

      const severityOrder: Record<string, number> = {
        'çox_aşağı': 1, 'aşağı': 2, 'orta': 3, 'yüksək': 4, 'kritik': 5,
      };

      const inconsistentCount = mappedIncidents.filter(
        (i: any) => (severityOrder[i.impact_law] || 0) > (severityOrder[i.residual_band_law] || 0)
      ).length;
      const totalMapped = mappedIncidents.length;
      const kpi2 = totalMapped > 0
        ? 1 - (inconsistentCount / totalMapped)
        : null;

      res.json({
        kpi1: {
          value: kpi1,
          percentage: kpi1 !== null ? Math.round(kpi1 * 100) : null,
          exceeding: exceedingCount,
          total: totalWithAppetite,
        },
        kpi2: {
          value: kpi2,
          percentage: kpi2 !== null ? Math.round(kpi2 * 100) : null,
          inconsistent: inconsistentCount,
          total: totalMapped,
        },
      });
    } catch (error) {
      res.status(500).json({ error: 'KPI hesablanarkən xəta' });
    }
  }
);

// ══════════════════════════════════════════════════════════════
// GET /api/dashboard/kpi-detailed — §10.2 Uyğunluq indikatorları
// 10.2.1.1–10.2.2.5  (10 xüsusi ölçmə parametri)
// ══════════════════════════════════════════════════════════════
dashboardRouter.get('/kpi-detailed', authenticate, authorize('dashboard:read'),
  async (_req: AuthRequest, res: Response) => {
    try {
      const [
        totalAssets, assetsInScope, totalThreats, threatsLinked,
        totalVulns, vulnsLinked, totalRisks, risksTreated,
        totalSolutions, solutionsLinked, totalIncidents,
        incidentsResolved, totalReconciliations, reconOk,
      ] = await Promise.all([
        db('assets').count('* as c').first(),
        db('risk_assets').countDistinct('asset_id as c').first(),
        db('threats').count('* as c').first(),
        db('risk_threats').countDistinct('threat_id as c').first(),
        db('vulnerabilities').count('* as c').first(),
        db('risk_vulnerabilities').countDistinct('vulnerability_id as c').first(),
        db('risks').count('* as c').first(),
        db('risks').whereIn('status', ['emalda', 'həll_edilib', 'qəbul_edilib', 'bağlı']).count('* as c').first(),
        db('solutions').count('* as c').first(),
        db('risk_solutions').countDistinct('solution_id as c').first(),
        db('incidents').count('* as c').first(),
        db('incidents').whereIn('status', ['bağlı']).count('* as c').first(),
        db('reconciliations').count('* as c').first(),
        db('reconciliations').where({ sync_status: 'ok' }).count('* as c').first(),
      ]);

      const pct = (a: any, b: any) => {
        const na = parseInt(a?.c || '0');
        const nb = parseInt(b?.c || '0');
        return nb > 0 ? Math.round((na / nb) * 100) : 0;
      };

      res.json({
        // §10.2.1.1 – Aktivlər əhatə dairəsi
        kpi_10_2_1_1: { label: 'Aktivlərin əhatə dairəsi', value: pct(assetsInScope, totalAssets), unit: '%' },
        // §10.2.1.4 – Təhdidlər uçotu uyğunluğu
        kpi_10_2_1_4: { label: 'Təhdidlərin risk-ə bağlılıq dərəcəsi', value: pct(threatsLinked, totalThreats), unit: '%' },
        // §10.2.1.5 – Risklər ↔ Təhdidlər uyğunluğu
        kpi_10_2_1_5: { label: 'Boşluqların risk-ə bağlılıq dərəcəsi', value: pct(vulnsLinked, totalVulns), unit: '%' },
        // §10.2.1.6 – Emal variantlarının uyğunluğu
        kpi_10_2_1_6: { label: 'Risklərin emal edilmə dərəcəsi', value: pct(risksTreated, totalRisks), unit: '%' },
        // §10.2.1.8 – Emal vasitələrinin uyğunluğu
        kpi_10_2_1_8: { label: 'Həllərin tətbiq dərəcəsi', value: pct(solutionsLinked, totalSolutions), unit: '%' },
        // §10.2.1.9 – İnsidentlərə cavab uyğunluğu
        kpi_10_2_1_9: { label: 'İnsidentlərin həll dərəcəsi', value: pct(incidentsResolved, totalIncidents), unit: '%' },
        // §10.2.2.1 – Məlumatlara əlçatanlıq (reconciliation ok rate)
        kpi_10_2_2_1: { label: 'Uzlaşdırma uğur dərəcəsi', value: pct(reconOk, totalReconciliations), unit: '%' },
        // §10.2.2.4 – Qalıq risk uyğunluğu (same as KPI-1)
        kpi_10_2_2_4: { label: 'Qalıq risk iştaha daxilində', value: 'KPI-1 ilə eynidir', unit: '' },
        // §10.2.2.5 – İnsident ↔ qalıq risk (same as KPI-2)
        kpi_10_2_2_5: { label: 'İnsident ↔ qalıq risk uyğunluğu', value: 'KPI-2 ilə eynidir', unit: '' },
        // Ümumi saylar
        totals: {
          assets: parseInt(totalAssets?.c as string || '0'),
          threats: parseInt(totalThreats?.c as string || '0'),
          vulnerabilities: parseInt(totalVulns?.c as string || '0'),
          risks: parseInt(totalRisks?.c as string || '0'),
          solutions: parseInt(totalSolutions?.c as string || '0'),
          incidents: parseInt(totalIncidents?.c as string || '0'),
        },
      });
    } catch (error) {
      res.status(500).json({ error: 'KPI detailed hesablanarkən xəta' });
    }
  }
);

// ══════════════════════════════════════════════════════════════
// GET /api/dashboard/review-overdue — §10.3 İllik review yoxlaması
// "ildə 1 dəfədən az olmayaraq dəyərləndirilməlidir"
// ══════════════════════════════════════════════════════════════
dashboardRouter.get('/review-overdue', authenticate, authorize('dashboard:read'),
  async (_req: AuthRequest, res: Response) => {
    try {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      // Aktivlər: last_review > 1 il
      const overdueAssets = await db('assets')
        .where('last_review', '<', oneYearAgo.toISOString().split('T')[0])
        .select('id', 'asset_code', 'name', 'last_review');

      // Risklər: updated_at > 1 il (heç yenilənməyib)
      const overdueRisks = await db('risks')
        .where('updated_at', '<', oneYearAgo)
        .select('id', 'risk_code', 'name', 'updated_at');

      // Tələblər: updated_at > 1 il
      const overdueRequirements = await db('requirements')
        .where('updated_at', '<', oneYearAgo)
        .select('id', 'req_code', 'req_title', 'updated_at');

      res.json({
        overdue_count: overdueAssets.length + overdueRisks.length + overdueRequirements.length,
        assets: overdueAssets,
        risks: overdueRisks,
        requirements: overdueRequirements,
        threshold: '1 il',
        checked_at: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({ error: 'Review overdue yoxlaması xəta' });
    }
  }
);

// ══════════════════════════════════════════════════════════════
// GET /api/dashboard/audit-siem — §6.9.2 Structured JSON log output
// SIEM/ELK-a forwarding üçün strukturlaşdırılmış audit logları
// ══════════════════════════════════════════════════════════════
dashboardRouter.get('/audit-siem', authenticate, authorize('audit:read'),
  async (req: AuthRequest, res: Response) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
      const since = req.query.since as string;

      let query = db('audit_log')
        .join('users', 'audit_log.actor_user_id', 'users.id')
        .select(
          'audit_log.id',
          'audit_log.entity_type',
          'audit_log.entity_id',
          'audit_log.action',
          'audit_log.changed_fields',
          'audit_log.reason',
          'audit_log.ip_address',
          'audit_log.created_at',
          'users.email as actor_email',
          'users.role as actor_role',
          'users.full_name as actor_name'
        )
        .orderBy('audit_log.created_at', 'desc')
        .limit(limit);

      if (since) {
        query = query.where('audit_log.created_at', '>=', since);
      }

      const logs = await query;

      // SIEM-uyğun format: CEF/JSON
      const siemLogs = logs.map((log: any) => ({
        '@timestamp': log.created_at,
        event: {
          action: log.action,
          category: 'database',
          type: log.action === 'create' ? 'creation' : log.action === 'delete' ? 'deletion' : 'change',
          outcome: 'success',
        },
        user: {
          email: log.actor_email,
          name: log.actor_name,
          roles: [log.actor_role],
        },
        source: { ip: log.ip_address },
        risk_registry: {
          entity_type: log.entity_type,
          entity_id: log.entity_id,
          changed_fields: log.changed_fields,
          reason: log.reason,
        },
      }));

      res.json({
        count: siemLogs.length,
        format: 'ECS (Elastic Common Schema)',
        logs: siemLogs,
      });
    } catch (error) {
      res.status(500).json({ error: 'SIEM audit log xəta' });
    }
  }
);
