import type { Knex } from 'knex';

/**
 * Faza 11 — Compliance Gap Remediation Migration
 *
 * 1. threats: əlavə sahələr (Annex §3 — 21 parametr)
 * 2. incidents: 13-mərhələli response_phase əlavəsi (Annex §6.1.5)
 * 3. risks: approved_by (SoD — §3.1.4)
 */
export async function up(knex: Knex): Promise<void> {
    // ── 1. threats — Əlavə Annex §3 sahələri ──────────────────────
    await knex.schema.alterTable('threats', (t: Knex.TableBuilder) => {
        // §3 field-18: Milli İS təhdidi
        t.boolean('national_is_threat').defaultTo(false);
        // §3 field-19: CIA mülkiyyət təhdidi
        t.boolean('cia_property_threat').defaultTo(false);
        // §3 field-20: Təfsilatlı təsvir
        t.text('description').nullable();
        // §3 field-21: IS hadisə potensialı (yes/no)
        t.boolean('is_potential_incident').defaultTo(false);
        // §3 field-22: Həssaslıq dərəcəsi (1-5)
        t.integer('sensitivity_level').nullable().checkBetween([1, 5]);
        // §3 field-23: Son nəzərdən keçmə tarixi
        t.date('last_review_date').nullable();
        // §3 field-24: Aktiv/passiv status
        t.enum('threat_status', ['aktiv', 'passiv', 'arxivləşdirilmiş']).defaultTo('aktiv');
    });

    // ── 2. incidents — 13-mərhələli response_phase ─────────────────
    // Mövcud response_option saxlanılır (backward compat),
    // yeni response_phase sütunu əlavə olunur
    await knex.raw(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'incident_phase_enum') THEN
        CREATE TYPE incident_phase_enum AS ENUM (
          'detect',       -- 1.  Aşkarlama
          'notify',       -- 2.  Bildiriş
          'monitor',      -- 3.  Monitorinq
          'assess',       -- 4.  Qiymətləndirmə
          'block',        -- 5.  Bloklama
          'restore',      -- 6.  Bərpa
          'change',       -- 7.  Dəyişiklik idarəetməsi
          'update_info',  -- 8.  Məlumat yeniləmə
          'improve',      -- 9.  Təkmilləşdirmə
          'failover',     -- 10. Ehtivat keçid
          'rollback',     -- 11. Geri qaytarma
          'evidence',     -- 12. Sübut toplama
          'anticrisis'    -- 13. Anti-böhran
        );
      END IF;
    END $$;
  `);

    await knex.schema.alterTable('incidents', (t: Knex.TableBuilder) => {
        // Yeni mərhələ sütunu (nullable, default 'detect')
        t.specificType('response_phase', 'incident_phase_enum').defaultTo('detect');
        // Mərhələ keçid tarixi
        t.timestamp('phase_changed_at').nullable();
        // Mərhələ keçid qeydiyyatı (JSON array of {phase, at, by})
        t.jsonb('phase_history').defaultTo('[]');
    });

    // ── 3. risks — SoD (approved_by) ──────────────────────────────
    await knex.schema.alterTable('risks', (t: Knex.TableBuilder) => {
        t.uuid('approved_by').references('id').inTable('users').nullable();
        t.timestamp('approved_at').nullable();
    });

    // ── 4. Index-lər ──────────────────────────────────────────────
    await knex.raw('CREATE INDEX IF NOT EXISTS idx_incidents_phase ON incidents(response_phase)');
    await knex.raw('CREATE INDEX IF NOT EXISTS idx_threats_status_v2 ON threats(threat_status)');
}

export async function down(knex: Knex): Promise<void> {
    // threats
    await knex.schema.alterTable('threats', (t: Knex.TableBuilder) => {
        t.dropColumns(
            'national_is_threat', 'cia_property_threat', 'description',
            'is_potential_incident', 'sensitivity_level', 'last_review_date', 'threat_status',
        );
    });

    // incidents
    await knex.schema.alterTable('incidents', (t: Knex.TableBuilder) => {
        t.dropColumns('response_phase', 'phase_changed_at', 'phase_history');
    });
    await knex.raw('DROP TYPE IF EXISTS incident_phase_enum');

    // risks
    await knex.schema.alterTable('risks', (t: Knex.TableBuilder) => {
        t.dropColumns('approved_by', 'approved_at');
    });

    // indexes
    await knex.raw('DROP INDEX IF EXISTS idx_incidents_phase');
    await knex.raw('DROP INDEX IF EXISTS idx_threats_status_v2');
}
