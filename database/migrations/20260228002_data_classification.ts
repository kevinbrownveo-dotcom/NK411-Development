import type { Knex } from 'knex';

/**
 * Faza 12 — Remaining Compliance Gaps
 *
 * 1. data_classification sütunu əsas cədvəllərə (RR-REQ-0001)
 */
export async function up(knex: Knex): Promise<void> {
    const tables = ['assets', 'threats', 'risks', 'incidents', 'vulnerabilities'];

    for (const table of tables) {
        await knex.schema.alterTable(table, (t: Knex.TableBuilder) => {
            t.enum('data_classification', [
                'açıq',            // Public
                'daxili',          // Internal
                'məxfi',           // Confidential
                'çox_məxfi',       // Strictly Confidential
            ]).defaultTo('daxili');
        });
    }
}

export async function down(knex: Knex): Promise<void> {
    const tables = ['assets', 'threats', 'risks', 'incidents', 'vulnerabilities'];
    for (const table of tables) {
        await knex.schema.alterTable(table, (t: Knex.TableBuilder) => {
            t.dropColumn('data_classification');
        });
    }
}
