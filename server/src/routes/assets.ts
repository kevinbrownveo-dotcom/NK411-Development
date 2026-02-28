import { createCrudRouter } from '../utils/crudFactory';
import { generateCode } from '../utils/codeGenerator';
import { authenticate, AuthRequest } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import db from '../config/database';
import { Response } from 'express';

export const assetRouter = createCrudRouter({
  table: 'rr_local.assets',
  entityType: 'aktiv',
  permissionPrefix: 'assets',
  codeColumn: 'asset_code',
  searchColumns: ['name', 'location', 'description'],
  defaultSort: 'created_at',
  beforeCreate: async (data) => {
    data.asset_code = await generateCode('AST');
    return data;
  },
});

assetRouter.get('/dependency-map', authenticate, authorize('assets:read'), async (req: AuthRequest, res: Response) => {
  try {
    const nodes = await db('assets')
      .select('id', 'name', 'asset_code', 'criticality', 'category')
      .orderBy('created_at', 'desc')
      .limit(500);

    const links = await db('risk_assets as ra1')
      .join('risk_assets as ra2', function joinPair() {
        this.on('ra1.risk_id', '=', 'ra2.risk_id').andOn('ra1.asset_id', '<', 'ra2.asset_id');
      })
      .select('ra1.asset_id as source', 'ra2.asset_id as target')
      .count<{ source: string; target: string; count: string }[]>('* as count')
      .groupBy('ra1.asset_id', 'ra2.asset_id');

    res.json({
      nodes,
      links: links.map((link) => ({
        source: link.source,
        target: link.target,
        count: parseInt(link.count, 10) || 1,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: 'Asılılıq xəritəsi alınarkən xəta' });
  }
});
