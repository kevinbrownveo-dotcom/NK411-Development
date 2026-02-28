import { createCrudRouter } from '../utils/crudFactory';

export const thresholdRouter = createCrudRouter({
  table: 'rr_inventory.thresholds',
  entityType: 'həd',
  permissionPrefix: 'thresholds',
  searchColumns: ['value', 'owner_role'],
});
