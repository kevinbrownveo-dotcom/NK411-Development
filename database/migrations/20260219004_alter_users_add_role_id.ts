import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (t) => {
    // Dinamik rol ID-si — users.role enum-u qalır (geri uyğunluq),
    // role_id doldurulduqda prioritet kimi istifadə olunur
    t.uuid('role_id').nullable().references('id').inTable('roles');
  });

  // Mövcud istifadəçilərin role enum-larını roles cədvəlindəki ID-yə köçür
  await knex.raw(`
    UPDATE users u
    SET role_id = r.id
    FROM roles r
    WHERE r.name = u.role::text
      AND u.role_id IS NULL
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (t) => {
    t.dropColumn('role_id');
  });
}
