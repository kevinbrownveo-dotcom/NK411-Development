import db from './src/config/database';

async function test() {
    try {
        // KPI-1
        const appetiteRisks = await db('risks')
            .whereNotNull('appetite_threshold')
            .whereNotNull('residual_risk_score');
        console.log('KPI-1 risks OK', appetiteRisks.length);

        // KPI-2
        let incidentQuery = db('incidents')
            .join('risks', 'incidents.risk_id', 'risks.id')
            .whereNotNull('incidents.impact_law')
            .whereNotNull('risks.residual_band_law');
        const mappedIncidents = await incidentQuery.select(
            'incidents.impact_law',
            'risks.residual_band_law'
        );
        console.log('KPI-2 mapped incidents OK', mappedIncidents.length);

        // Dashboard stats
        const heatMapData = await db('risks')
            .select('probability_factor', 'impact_max')
            .count('* as count')
            .whereNotNull('probability_factor')
            .whereNotNull('impact_max')
            .groupBy('probability_factor', 'impact_max');
        console.log('Dashboard heatMap OK', heatMapData.length);

        process.exit(0);
    } catch (err: any) {
        console.error('ERROR OCCURRED:');
        console.error(err.message);
        process.exit(1);
    }
}

test();
