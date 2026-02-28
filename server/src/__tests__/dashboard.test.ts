import { getAdminToken, apiRequest } from './helpers';

describe('Dashboard + Admin API', () => {
    let token: string;

    beforeAll(async () => {
        token = await getAdminToken();
    });

    // ──────────────── Dashboard ────────────────
    describe('Dashboard', () => {
        it('GET /dashboard/stats — statistika qaytarır', async () => {
            const { status, data } = await apiRequest('GET', '/dashboard/stats', token);
            expect(status).toBe(200);
            expect(data.risks).toBeDefined();
            expect(data.assets).toBeDefined();
            expect(data.vulnerabilities).toBeDefined();
            expect(data.threats).toBeDefined();
            expect(data.heatMap).toBeDefined();
        });

        it('GET /dashboard/kpi — KPI dəyərləri qaytarır', async () => {
            const { status, data } = await apiRequest('GET', '/dashboard/kpi', token);
            expect(status).toBe(200);
            expect(data.kpi1).toBeDefined();
            expect(data.kpi2).toBeDefined();
        });
    });

    // ──────────────── Admin Users ────────────────
    describe('Admin Users', () => {
        it('GET /admin/users — istifadəçi siyahısı alır', async () => {
            const { status, data } = await apiRequest('GET', '/admin/users', token);
            expect(status).toBe(200);
            expect(data.data).toBeInstanceOf(Array);
            expect(data.data.length).toBeGreaterThanOrEqual(1);
        });
    });

    // ──────────────── Admin Roles ────────────────
    describe('Admin Roles', () => {
        it('GET /admin/roles — rol siyahısı alır', async () => {
            const { status, data } = await apiRequest('GET', '/admin/roles', token);
            expect(status).toBe(200);
            expect(data).toBeInstanceOf(Array);
            expect(data.length).toBeGreaterThanOrEqual(1);
        });
    });

    // ──────────────── Health ────────────────
    describe('Health Check', () => {
        it('GET /health — sağlamlıq yoxlaması', async () => {
            const { status, data } = await apiRequest('GET', '/health', token);
            expect(status).toBe(200);
            expect(data.status).toBe('ok');
        });
    });

    // ──────────────── Audit Log ────────────────
    describe('Audit Log', () => {
        it('GET /audit-log — audit jurnalı qaytarır', async () => {
            const { status, data } = await apiRequest('GET', '/audit-log', token);
            expect(status).toBe(200);
            expect(data.data).toBeInstanceOf(Array);
        });
    });
});
