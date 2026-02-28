import { createCrudRouter } from '../utils/crudFactory';
import { generateCode } from '../utils/codeGenerator';
import db from '../config/database';

export const requirementRouter = createCrudRouter({
  table: 'rr_central.requirements',
  entityType: 'tələb',
  permissionPrefix: 'requirements',
  searchColumns: ['req_title', 'req_description', 'source_ref'],
  beforeCreate: async (data) => {
    data.req_code = await generateCode('REQ');
    return data;
  },
  beforeUpdate: async (data, existing, req) => {
    // PATCH-02: Versioning — dəyişiklikdə köhnə versiyanı tarixə yaz
    const currentVersion = await db('requirements_history')
      .where({ requirement_id: existing.id })
      .max('version_number as max_version')
      .first();

    const nextVersion = (currentVersion?.max_version || 0) + 1;

    await db('requirements_history').insert({
      requirement_id: existing.id,
      version_number: nextVersion,
      snapshot: JSON.stringify(existing),
      changed_by: req.user!.userId,
      change_reason: data._change_reason || null,
    });

    delete data._change_reason;
    return data;
  },
});
