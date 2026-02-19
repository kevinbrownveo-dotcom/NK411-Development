import type { Knex } from 'knex';

const RESOURCES = [
  'assets', 'threats', 'vulnerabilities', 'risks', 'incidents',
  'solutions', 'requirements', 'thresholds', 'consequences',
  'reconciliations', 'audit', 'dashboard', 'users', 'roles',
];

const ACTIONS = ['create', 'read', 'update', 'delete'] as const;

// Mövcud statik RBAC matrisindən götürülmüş standart icazələr
const SYSTEM_ROLE_PERMISSIONS: Record<string, { resource: string; action: string }[]> = {
  admin: RESOURCES.flatMap((r) => ACTIONS.map((a) => ({ resource: r, action: a }))),

  risk_manager: [
    ...['assets', 'threats', 'vulnerabilities', 'risks', 'incidents', 'solutions',
      'requirements', 'thresholds', 'consequences', 'dashboard'].flatMap((r) => [
      { resource: r, action: 'read' }, { resource: r, action: 'create' }, { resource: r, action: 'update' },
    ]),
    { resource: 'reconciliations', action: 'read' },
    { resource: 'reconciliations', action: 'create' },
    { resource: 'reconciliations', action: 'update' },
  ],

  asset_owner: [
    ...['assets', 'threats', 'vulnerabilities', 'risks', 'dashboard'].map((r) => ({ resource: r, action: 'read' })),
    { resource: 'assets', action: 'update' },
  ],

  incident_coordinator: [
    ...['assets', 'risks', 'incidents', 'dashboard'].map((r) => ({ resource: r, action: 'read' })),
    { resource: 'incidents', action: 'create' },
    { resource: 'incidents', action: 'update' },
  ],

  auditor: [
    ...['assets', 'threats', 'vulnerabilities', 'risks', 'incidents', 'solutions',
      'requirements', 'thresholds', 'consequences', 'reconciliations', 'dashboard'].map(
      (r) => ({ resource: r, action: 'read' }),
    ),
    { resource: 'audit', action: 'read' },
  ],

  dxeit_rep: [
    ...['assets', 'threats', 'vulnerabilities', 'risks', 'incidents', 'solutions',
      'requirements', 'thresholds', 'consequences', 'dashboard'].map(
      (r) => ({ resource: r, action: 'read' }),
    ),
  ],
};

const SYSTEM_ROLES = [
  { name: 'admin', label: 'Sistem İdarəçisi', description: 'Tam idarəetmə hüququ' },
  { name: 'risk_manager', label: 'Risk Meneceri', description: 'Risk idarəetmə əməliyyatları' },
  { name: 'asset_owner', label: 'Aktiv Sahibi', description: 'Aktivlər üzrə oxuma və yeniləmə' },
  { name: 'incident_coordinator', label: 'İnsident Koordinatoru', description: 'İnsident idarəetməsi' },
  { name: 'auditor', label: 'Auditor', description: 'Oxuma və audit icazəsi' },
  { name: 'dxeit_rep', label: 'DXƏIT Nümayəndəsi', description: 'Dövlət qurumu oxuma icazəsi' },
];

export async function up(knex: Knex): Promise<void> {
  // ── roles cədvəli ──────────────────────────────────────────
  await knex.schema.createTable('roles', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('name').unique().notNullable();
    t.string('label').notNullable();
    t.boolean('is_system').defaultTo(false);
    t.boolean('is_custom').defaultTo(false);
    t.text('description').nullable();
    t.timestamps(true, true);
  });

  // ── role_permissions cədvəli ──────────────────────────────
  await knex.schema.createTable('role_permissions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('role_id').references('id').inTable('roles').onDelete('CASCADE').notNullable();
    t.string('resource').notNullable();
    t.enum('action', ACTIONS as unknown as string[]).notNullable();
    t.unique(['role_id', 'resource', 'action']);
    t.timestamps(true, true);
  });

  // ── 6 standart rolu seed et ───────────────────────────────
  for (const roleData of SYSTEM_ROLES) {
    const [role] = await knex('roles')
      .insert({ name: roleData.name, label: roleData.label, description: roleData.description, is_system: true })
      .returning('id');

    const perms = SYSTEM_ROLE_PERMISSIONS[roleData.name] || [];
    if (perms.length > 0) {
      await knex('role_permissions').insert(
        perms.map((p) => ({ role_id: role.id, resource: p.resource, action: p.action })),
      );
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('role_permissions');
  await knex.schema.dropTableIfExists('roles');
}
