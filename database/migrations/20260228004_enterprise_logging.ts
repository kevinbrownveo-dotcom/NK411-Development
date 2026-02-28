import type { Knex } from 'knex';

/**
 * Faza 15 — Enterprise Logging & SIEM Architecture
 *
 * 1. security_event_log (login/lockout/brute-force — §4)
 * 2. audit_log genişləndirilməsi (hash chaining, immutability — §2)
 * 3. application_log (§1)
 * 4. integration_log (LDAP/SIEM/SMTP — §1)
 * 5. siem_destinations (admin config — §3)
 * 6. log_retention_policies (§8)
 * 7. Immutability triggers (§2)
 */
export async function up(knex: Knex): Promise<void> {
    // ─────────────────────────────────────────────────────
    // 1. security_event_log — §4 Auth Security Logging
    // ─────────────────────────────────────────────────────
    await knex.schema.withSchema('rr_system').createTable('security_event_log', (t) => {
        t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
        t.uuid('correlation_id').notNullable();
        t.uuid('request_id').nullable();
        t.string('event_type', 50).notNullable();
        t.uuid('user_id').references('id').inTable('rr_system.users').nullable();
        t.string('role_snapshot', 50).nullable();
        t.specificType('source_ip', 'INET').nullable();
        t.text('user_agent').nullable();
        t.string('result', 10).notNullable(); // SUCCESS | DENY | FAIL
        t.string('reason_code', 50).nullable();
        t.string('severity', 10).notNullable().defaultTo('INFO');
        t.string('data_classification', 20).defaultTo('internal');
        t.jsonb('metadata').nullable();
        t.integer('latency_ms').nullable();
        t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    });

    await knex.raw('CREATE INDEX idx_sec_event_type ON rr_system.security_event_log(event_type)');
    await knex.raw('CREATE INDEX idx_sec_event_user ON rr_system.security_event_log(user_id)');
    await knex.raw('CREATE INDEX idx_sec_event_created ON rr_system.security_event_log(created_at)');
    await knex.raw('CREATE INDEX idx_sec_event_severity ON rr_system.security_event_log(severity)');
    await knex.raw('CREATE INDEX idx_sec_event_corr ON rr_system.security_event_log(correlation_id)');

    // ─────────────────────────────────────────────────────
    // 2. audit_log genişləndirilməsi — §2 Hash Chaining
    // ─────────────────────────────────────────────────────
    await knex.schema.withSchema('rr_system').alterTable('audit_log', (t) => {
        t.uuid('correlation_id').nullable();
        t.uuid('request_id').nullable();
        t.string('role_snapshot', 50).nullable();
        t.string('result', 10).defaultTo('SUCCESS');
        t.string('severity', 10).defaultTo('INFO');
        t.string('data_classification', 20).defaultTo('internal');
        t.integer('latency_ms').nullable();
        t.string('before_hash', 64).nullable();  // SHA-256 of entity state before
        t.string('after_hash', 64).nullable();   // SHA-256 of entity state after
        t.jsonb('diff_json').nullable();          // [{field, old_value, new_value}]
        t.string('prev_audit_hash', 64).nullable(); // hash chain link
        t.string('source_ip_v2').nullable();   // INET fallback
    });

    await knex.raw('CREATE INDEX idx_audit_corr ON rr_system.audit_log(correlation_id)');
    await knex.raw('CREATE INDEX idx_audit_severity ON rr_system.audit_log(severity)');

    // ─────────────────────────────────────────────────────
    // 3. application_log — §1 Structured App Logging
    // ─────────────────────────────────────────────────────
    await knex.schema.withSchema('rr_system').createTable('application_log', (t) => {
        t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
        t.uuid('correlation_id').nullable();
        t.string('level', 10).notNullable(); // DEBUG|INFO|WARN|ERROR
        t.text('message').notNullable();
        t.text('stack_trace').nullable();
        t.string('module', 50).nullable();
        t.jsonb('metadata').nullable();
        t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    });

    await knex.raw('CREATE INDEX idx_app_log_level ON rr_system.application_log(level)');
    await knex.raw('CREATE INDEX idx_app_log_created ON rr_system.application_log(created_at)');

    // ─────────────────────────────────────────────────────
    // 4. integration_log — §1 LDAP/SIEM/SMTP Logging
    // ─────────────────────────────────────────────────────
    await knex.schema.withSchema('rr_system').createTable('integration_log', (t) => {
        t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
        t.uuid('correlation_id').nullable();
        t.string('direction', 10).notNullable(); // INBOUND | OUTBOUND
        t.string('protocol', 20).nullable();     // LDAP | SYSLOG | API | SMTP
        t.string('destination', 255).nullable();
        t.string('status', 10).nullable();       // SUCCESS | FAIL | TIMEOUT
        t.jsonb('request_payload').nullable();
        t.integer('response_code').nullable();
        t.integer('latency_ms').nullable();
        t.text('error_message').nullable();
        t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    });

    await knex.raw('CREATE INDEX idx_integration_proto ON rr_system.integration_log(protocol)');
    await knex.raw('CREATE INDEX idx_integration_created ON rr_system.integration_log(created_at)');

    // ─────────────────────────────────────────────────────
    // 5. siem_destinations — §3 Admin SIEM Config
    // ─────────────────────────────────────────────────────
    await knex.schema.withSchema('rr_system').createTable('siem_destinations', (t) => {
        t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
        t.string('name', 100).notNullable();
        t.string('protocol', 10).notNullable();  // UDP | TCP | TLS
        t.string('host', 255).notNullable();
        t.integer('port').notNullable();
        t.integer('facility').defaultTo(1);
        t.string('severity_threshold', 10).defaultTo('INFO');
        t.boolean('tls_enabled').defaultTo(false);
        t.text('ca_cert').nullable();
        t.text('client_cert').nullable();
        t.text('client_key_encrypted').nullable();
        t.integer('retry_max').defaultTo(3);
        t.integer('retry_backoff_ms').defaultTo(1000);
        t.integer('queue_size').defaultTo(10000);
        t.boolean('is_active').defaultTo(true);
        t.timestamp('last_health_check', { useTz: true }).nullable();
        t.string('health_status', 10).defaultTo('UNKNOWN');
        t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
        t.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    });

    // ─────────────────────────────────────────────────────
    // 6. log_retention_policies — §8 Retention config
    // ─────────────────────────────────────────────────────
    await knex.schema.withSchema('rr_system').createTable('log_retention_policies', (t) => {
        t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
        t.string('log_table', 50).notNullable().unique();
        t.integer('retention_days').notNullable();
        t.boolean('archive_enabled').defaultTo(false);
        t.text('archive_path').nullable();
        t.timestamp('last_cleanup', { useTz: true }).nullable();
        t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    });

    // Default retention policies
    await knex('rr_system.log_retention_policies').insert([
        { log_table: 'audit_log', retention_days: 2555 },         // 7 il
        { log_table: 'security_event_log', retention_days: 365 },  // 1 il
        { log_table: 'application_log', retention_days: 90 },      // 3 ay
        { log_table: 'integration_log', retention_days: 180 },     // 6 ay
    ]);

    // ─────────────────────────────────────────────────────
    // 7. Immutability Triggers — §2
    // ─────────────────────────────────────────────────────

    // audit_log — UPDATE/DELETE qadağan
    await knex.raw(`
    CREATE OR REPLACE FUNCTION rr_system.audit_log_immutable()
    RETURNS TRIGGER AS $$
    BEGIN
      RAISE EXCEPTION 'AUDIT_IMMUTABLE: % əməliyyatı audit_log üzərində qadağandır (§9.5)', TG_OP;
    END;
    $$ LANGUAGE plpgsql;
  `);

    await knex.raw(`
    CREATE TRIGGER trg_audit_log_immutable
    BEFORE UPDATE OR DELETE ON rr_system.audit_log
    FOR EACH ROW EXECUTE FUNCTION rr_system.audit_log_immutable();
  `);

    // security_event_log — UPDATE/DELETE qadağan
    await knex.raw(`
    CREATE OR REPLACE FUNCTION rr_system.security_event_immutable()
    RETURNS TRIGGER AS $$
    BEGIN
      RAISE EXCEPTION 'AUDIT_IMMUTABLE: % əməliyyatı security_event_log üzərində qadağandır', TG_OP;
    END;
    $$ LANGUAGE plpgsql;
  `);

    await knex.raw(`
    CREATE TRIGGER trg_security_event_immutable
    BEFORE UPDATE OR DELETE ON rr_system.security_event_log
    FOR EACH ROW EXECUTE FUNCTION rr_system.security_event_immutable();
  `);

    // ─────────────────────────────────────────────────────
    // 8. Users table: progressive lockout sütunları — §4
    // ─────────────────────────────────────────────────────
    await knex.schema.withSchema('rr_system').alterTable('users', (t) => {
        t.integer('failed_login_count').defaultTo(0);
        t.timestamp('locked_until', { useTz: true }).nullable();
        t.timestamp('last_failed_login', { useTz: true }).nullable();
        t.integer('lockout_level').defaultTo(0); // 0=unlocked, 1=15min, 2=1h, 3=24h
    });
}

export async function down(knex: Knex): Promise<void> {
    // Drop triggers first
    await knex.raw('DROP TRIGGER IF EXISTS trg_audit_log_immutable ON rr_system.audit_log');
    await knex.raw('DROP TRIGGER IF EXISTS trg_security_event_immutable ON rr_system.security_event_log');
    await knex.raw('DROP FUNCTION IF EXISTS rr_system.audit_log_immutable()');
    await knex.raw('DROP FUNCTION IF EXISTS rr_system.security_event_immutable()');

    // Drop new tables
    await knex.schema.withSchema('rr_system').dropTableIfExists('log_retention_policies');
    await knex.schema.withSchema('rr_system').dropTableIfExists('siem_destinations');
    await knex.schema.withSchema('rr_system').dropTableIfExists('integration_log');
    await knex.schema.withSchema('rr_system').dropTableIfExists('application_log');
    await knex.schema.withSchema('rr_system').dropTableIfExists('security_event_log');

    // Remove added columns from audit_log
    await knex.schema.withSchema('rr_system').alterTable('audit_log', (t) => {
        t.dropColumn('correlation_id');
        t.dropColumn('request_id');
        t.dropColumn('role_snapshot');
        t.dropColumn('result');
        t.dropColumn('severity');
        t.dropColumn('data_classification');
        t.dropColumn('latency_ms');
        t.dropColumn('before_hash');
        t.dropColumn('after_hash');
        t.dropColumn('diff_json');
        t.dropColumn('prev_audit_hash');
        t.dropColumn('source_ip_v2');
    });

    // Remove lockout columns from users
    await knex.schema.withSchema('rr_system').alterTable('users', (t) => {
        t.dropColumn('failed_login_count');
        t.dropColumn('locked_until');
        t.dropColumn('last_failed_login');
        t.dropColumn('lockout_level');
    });
}
