import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (t) => {
    t.integer('login_attempts').notNullable().defaultTo(0);
    t.timestamp('locked_until').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (t) => {
    t.dropColumn('login_attempts');
    t.dropColumn('locked_until');
  });
}
