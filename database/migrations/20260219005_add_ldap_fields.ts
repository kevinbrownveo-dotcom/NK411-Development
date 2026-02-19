import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ── users cədvəlinə auth_source + ldap_dn əlavə et ─────────
  await knex.schema.alterTable('users', (t) => {
    t.enum('auth_source', ['local', 'ldap']).notNullable().defaultTo('local');
    t.text('ldap_dn').nullable();
  });

  // ── ldap_group_mappings cədvəli ─────────────────────────────
  await knex.schema.createTable('ldap_group_mappings', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('ldap_group_dn').notNullable().unique();
    t.string('ldap_group_label').nullable();
    t.uuid('role_id').references('id').inTable('roles').onDelete('CASCADE').notNullable();
    t.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('ldap_group_mappings');
  await knex.schema.alterTable('users', (t) => {
    t.dropColumn('auth_source');
    t.dropColumn('ldap_dn');
  });
}
