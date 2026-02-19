import { createCrudRouter } from '../utils/crudFactory';

export const consequenceRouter = createCrudRouter({
  table: 'consequences',
  entityType: 'fəsad',
  permissionPrefix: 'consequences',
  searchColumns: ['consequence_description'],
});
