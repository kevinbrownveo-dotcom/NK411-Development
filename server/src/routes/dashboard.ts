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
