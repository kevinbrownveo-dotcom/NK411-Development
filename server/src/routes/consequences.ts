import { createCrudRouter } from '../utils/crudFactory';

export const consequenceRouter = createCrudRouter({
  table: 'rr_core.consequences',
  entityType: 'fəsad',
  permissionPrefix: 'consequences',
  searchColumns: ['consequence_description'],
});
