require('dotenv').config();
const { Pool } = require('pg');
const http = require('http');

async function testApi() {
    const req = (path, method = 'GET', body = null, token = '') => new Promise((res, rej) => {
        const opts = { hostname: 'localhost', port: 3001, path, method, headers: { 'Content-Type': 'application/json' } };
        if (token) opts.headers['Authorization'] = 'Bearer ' + token;
        const client = http.request(opts, (r) => {
            let data = '';
            r.on('data', d => data += d);
            r.on('end', () => res({ status: r.statusCode, data }));
        });
        client.on('error', rej);
        if (body) client.write(JSON.stringify(body));
        client.end();
    });

    let res = await req('/api/auth/login', 'POST', { email: 'admin@risk-registry.az', password: 'Admin123!' });
    const token = JSON.parse(res.data).accessToken;

    const endpoints = [
        '/api/assets',
        '/api/threats',
        '/api/vulnerabilities',
        '/api/risks',
        '/api/dashboard/stats',
        '/api/incidents',
        '/api/requirements',
        '/api/solutions',
        '/api/thresholds',
        '/api/consequences',
        '/api/reconciliations',
        '/api/admin/users',
        '/api/admin/roles?limit=50',
        '/api/siem/destinations',
        '/api/siem/retention',
        '/api/siem/forwarding-status',
        '/api/audit-log'
    ];

    console.log('\n--- Menu API Integration Test Results ---');
    let allGood = true;
    for (const ep of endpoints) {
        let check = await req(ep, 'GET', null, token);
        const ok = check.status === 200;
        console.log(ep.padEnd(30), check.status, ok ? '✅ OK' : '❌ FAIL');
        if (!ok) {
            allGood = false;
            console.log('  Error body:', check.data.substring(0, 100));
        }
    }
}

testApi().catch(console.error);
