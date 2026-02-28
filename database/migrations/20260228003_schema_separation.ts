import type { Knex } from 'knex';

/**
 * Faza 13 — Schema Separation (Qanun Maddə 5.2)
 *
 * Mövcud `public` schema-dakı cədvəlləri 5 ayrı PostgreSQL schema-sına köçürür:
 *   rr_core      — Əsas risk cədvəlləri (§5.2.1)
 *   rr_local     — Lokal mənbələr / aktivlər (§5.2.2)
 *   rr_central   — Mərkəzi mənbələr / təhdidlər (§5.2.3)
 *   rr_inventory — İnventar uçotu / həllər (§5.2.4)
 *   rr_system    — İstifadəçilər + audit (§9.3/9.5)
 */
export async function up(knex: Knex): Promise<void> {
    // 1. Schema-ları yarat
    await knex.raw('CREATE SCHEMA IF NOT EXISTS rr_core');
    await knex.raw('CREATE SCHEMA IF NOT EXISTS rr_local');
    await knex.raw('CREATE SCHEMA IF NOT EXISTS rr_central');
    await knex.raw('CREATE SCHEMA IF NOT EXISTS rr_inventory');
    await knex.raw('CREATE SCHEMA IF NOT EXISTS rr_system');

    // 2. rr_system — istifadəçilər + audit (əvvəlcə köçürülür, çünki FK reference-ləri var)
    await knex.raw('ALTER TABLE public.users SET SCHEMA rr_system');
    await knex.raw('ALTER TABLE public.audit_log SET SCHEMA rr_system');

    // 3. rr_local — Aktiv Kataloqu
    await knex.raw('ALTER TABLE public.assets SET SCHEMA rr_local');

    // 4. rr_central — Təhdidlər, tələblər, boşluqlar, insidentlər
    await knex.raw('ALTER TABLE public.requirements SET SCHEMA rr_central');
    await knex.raw('ALTER TABLE public.requirements_history SET SCHEMA rr_central');
    await knex.raw('ALTER TABLE public.threats SET SCHEMA rr_central');
    await knex.raw('ALTER TABLE public.vulnerabilities SET SCHEMA rr_central');
    await knex.raw('ALTER TABLE public.incidents SET SCHEMA rr_central');
    await knex.raw('ALTER TABLE public.incident_actions SET SCHEMA rr_central');

    // 5. rr_inventory — Həllər + Hədlər
    await knex.raw('ALTER TABLE public.solutions SET SCHEMA rr_inventory');
    await knex.raw('ALTER TABLE public.thresholds SET SCHEMA rr_inventory');

    // 6. rr_core — Risk cədvəlləri, FK bridge-lər, consequences, reconciliations
    await knex.raw('ALTER TABLE public.risks SET SCHEMA rr_core');
    await knex.raw('ALTER TABLE public.risk_assets SET SCHEMA rr_core');
    await knex.raw('ALTER TABLE public.risk_threats SET SCHEMA rr_core');
    await knex.raw('ALTER TABLE public.risk_vulnerabilities SET SCHEMA rr_core');
    await knex.raw('ALTER TABLE public.risk_solutions SET SCHEMA rr_core');
    await knex.raw('ALTER TABLE public.consequences SET SCHEMA rr_core');
    await knex.raw('ALTER TABLE public.reconciliations SET SCHEMA rr_core');
    await knex.raw('ALTER TABLE public.mapping_rules SET SCHEMA rr_core');
}

export async function down(knex: Knex): Promise<void> {
    // Hamısını yenidən public-ə qaytar
    const moves = [
        // rr_core
        'ALTER TABLE rr_core.risks SET SCHEMA public',
        'ALTER TABLE rr_core.risk_assets SET SCHEMA public',
        'ALTER TABLE rr_core.risk_threats SET SCHEMA public',
        'ALTER TABLE rr_core.risk_vulnerabilities SET SCHEMA public',
        'ALTER TABLE rr_core.risk_solutions SET SCHEMA public',
        'ALTER TABLE rr_core.consequences SET SCHEMA public',
        'ALTER TABLE rr_core.reconciliations SET SCHEMA public',
        'ALTER TABLE rr_core.mapping_rules SET SCHEMA public',
        // rr_local
        'ALTER TABLE rr_local.assets SET SCHEMA public',
        // rr_central
        'ALTER TABLE rr_central.requirements SET SCHEMA public',
        'ALTER TABLE rr_central.requirements_history SET SCHEMA public',
        'ALTER TABLE rr_central.threats SET SCHEMA public',
        'ALTER TABLE rr_central.vulnerabilities SET SCHEMA public',
        'ALTER TABLE rr_central.incidents SET SCHEMA public',
        'ALTER TABLE rr_central.incident_actions SET SCHEMA public',
        // rr_inventory
        'ALTER TABLE rr_inventory.solutions SET SCHEMA public',
        'ALTER TABLE rr_inventory.thresholds SET SCHEMA public',
        // rr_system
        'ALTER TABLE rr_system.users SET SCHEMA public',
        'ALTER TABLE rr_system.audit_log SET SCHEMA public',
    ];

    for (const sql of moves) {
        await knex.raw(sql);
    }

    await knex.raw('DROP SCHEMA IF EXISTS rr_core CASCADE');
    await knex.raw('DROP SCHEMA IF EXISTS rr_local CASCADE');
    await knex.raw('DROP SCHEMA IF EXISTS rr_central CASCADE');
    await knex.raw('DROP SCHEMA IF EXISTS rr_inventory CASCADE');
    await knex.raw('DROP SCHEMA IF EXISTS rr_system CASCADE');
}
