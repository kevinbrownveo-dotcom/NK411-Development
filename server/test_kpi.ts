import db from './src/config/database';

async function test() {
    try {
        const q1 = await db('assets').count('* as c').first(); console.log('assets OK:', q1);
        const q2 = await db('risk_assets').countDistinct('asset_id as c').first(); console.log('risk_assets OK:', q2);
        const q3 = await db('threats').count('* as c').first(); console.log('threats OK:', q3);
        const q4 = await db('risk_threats').countDistinct('threat_id as c').first(); console.log('risk_threats OK:', q4);
        const q5 = await db('vulnerabilities').count('* as c').first(); console.log('vulnerabilities OK:', q5);
        const q6 = await db('risk_vulnerabilities').countDistinct('vulnerability_id as c').first(); console.log('risk_vulnerabilities OK:', q6);
        const q7 = await db('risks').count('* as c').first(); console.log('risks OK:', q7);
        const q8 = await db('solutions').count('* as c').first(); console.log('solutions OK:', q8);
        const q9 = await db('risk_solutions').countDistinct('solution_id as c').first(); console.log('risk_solutions OK:', q9);
        const q10 = await db('incidents').count('* as c').first(); console.log('incidents OK:', q10);
        const q11 = await db('reconciliations').count('* as c').first(); console.log('reconciliations OK:', q11);
        console.log('ALL OK');
        process.exit(0);
    } catch (err: any) {
        console.error('ERROR OCCURRED:');
        console.error(err.message);
        process.exit(1);
    }
}

test();
