import type { Knex } from 'knex';

/**
 * Faza 16 — Security Hardening
 *
 * 1. MFA (TOTP) sütunları users cədvəlinə
 * 2. token_blacklist cədvəli (JWT instant revocation)
 */
export async function up(knex: Knex): Promise<void> {
    // ── 1. MFA sütunları ───────────────────────────────────
    await knex.schema.withSchema('rr_system').alterTable('users', (t) => {
        t.boolean('mfa_enabled').defaultTo(false);
        t.text('mfa_secret').nullable();          // encrypted TOTP secret
        t.text('mfa_backup_codes').nullable();     // JSON array of hashed backup codes
        t.timestamp('mfa_enabled_at', { useTz: true }).nullable();
    });

    // ── 2. Token Blacklist ─────────────────────────────────
    await knex.schema.withSchema('rr_system').createTable('token_blacklist', (t) => {
        t.string('jti', 64).primary();                           // JWT ID
        t.uuid('user_id').references('id').inTable('rr_system.users').nullable();
        t.string('reason', 50).notNullable().defaultTo('logout'); // logout | forced | password_change
        t.timestamp('expires_at', { useTz: true }).notNullable(); // Token expiry (auto-cleanup)
        t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    });

    await knex.raw('CREATE INDEX idx_blacklist_expires ON rr_system.token_blacklist(expires_at)');
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.withSchema('rr_system').dropTableIfExists('token_blacklist');
    await knex.schema.withSchema('rr_system').alterTable('users', (t) => {
        t.dropColumn('mfa_enabled');
        t.dropColumn('mfa_secret');
        t.dropColumn('mfa_backup_codes');
        t.dropColumn('mfa_enabled_at');
    });
}
