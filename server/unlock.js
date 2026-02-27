const { Client } = require('./node_modules/pg');
const c = new Client({ host: 'localhost', port: 5432, database: 'risk_registry', user: 'riskadmin', password: 'changeme_in_production' });
c.connect()
    .then(() => c.query('UPDATE users SET login_attempts=0, locked_until=NULL WHERE email=$1', ['admin@risk-registry.az']))
    .then(() => { console.log('Kilid achildi'); c.end(); })
    .catch(e => { console.error(e.message); c.end(); });
