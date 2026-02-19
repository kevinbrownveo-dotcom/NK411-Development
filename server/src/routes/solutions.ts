import { createCrudRouter } from '../utils/crudFactory';
import { generateCode } from '../utils/codeGenerator';

export const solutionRouter = createCrudRouter({
  table: 'solutions',
  entityType: 'həll',
  permissionPrefix: 'solutions',
  searchColumns: ['name', 'description', 'playbook'],
  beforeCreate: async (data) => {
    data.solution_code = await generateCode('SOL');
    return data;
  },
});
