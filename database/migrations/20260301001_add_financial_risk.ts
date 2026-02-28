import type { Knex } from 'knex';

/**
 * Faza 18 — Quantitative Financial Risk Assessment (ALE/SLE)
 * NK-411 Qanun §4.2.3.5 ("Risk qiyməti" maddəsi)
 */
export async function up(knex: Knex): Promise<void> {
    await knex.schema.withSchema('rr_core').createTable('financial_risk_details', (t) => {
        t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
        t.uuid('risk_id').references('id').inTable('rr_core.risks').onDelete('CASCADE').notNullable();

        // Asset Value (AV) - AZN ilə aktivin ümumi dəyəri
        t.decimal('asset_monetary_value', 15, 2).notNullable();

        // Exposure Factor (EF) - Təhdid baş verdikdə itirilən dəyər faizi (0.00 - 1.00)
        t.decimal('exposure_factor', 4, 3).notNullable().defaultTo(0.100);

        // Single Loss Expectancy (SLE) = AV * EF
        t.decimal('single_loss_expectancy', 15, 2).notNullable();

        // Annualized Rate of Occurrence (ARO) - İldə neçə dəfə baş vermə ehtimalı
        t.decimal('annualized_rate_of_occurrence', 8, 4).notNullable().defaultTo(1.0);

        // Annualized Loss Expectancy (ALE) = SLE * ARO (İllik Maliyyə Riski)
        t.decimal('annualized_loss_expectancy', 15, 2).notNullable();

        // Currency (Məsələn: AZN, USD)
        t.string('currency', 3).defaultTo('AZN');

        t.boolean('is_active').defaultTo(true);
        t.text('notes').nullable();

        t.timestamps(true, true);

        t.unique(['risk_id']);
    });

    // Risklər cədvəlinə maliyyə riski indikatoru əlavə et
    await knex.schema.withSchema('rr_core').alterTable('risks', (t) => {
        t.boolean('has_financial_assessment').defaultTo(false);
        t.decimal('total_ale_value', 15, 2).nullable();
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.withSchema('rr_core').dropTableIfExists('financial_risk_details');
    await knex.schema.withSchema('rr_core').alterTable('risks', (t) => {
        t.dropColumn('has_financial_assessment');
        t.dropColumn('total_ale_value');
    });
}
