import { getAdminToken, apiRequest, API_BASE } from './helpers';

describe('Auth API', () => {
    it('POST /auth/login — düzgün giriş məlumatları ilə token qaytarır', async () => {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@risk-registry.az', password: 'Admin123!' }),
        });

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.accessToken).toBeDefined();
        expect(data.user.email).toBe('admin@risk-registry.az');
        expect(data.user.role).toBe('admin');
    });

    it('POST /auth/login — yanlış şifrə ilə 401 qaytarır', async () => {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@risk-registry.az', password: 'wrong' }),
        });

        expect(res.status).toBe(401);
    });

    it('GET /auth/me — token ilə istifadəçi məlumatlarını qaytarır', async () => {
        const token = await getAdminToken();
        const { status, data } = await apiRequest('GET', '/auth/me', token);

        expect(status).toBe(200);
        expect(data.email).toBe('admin@risk-registry.az');
    });

    it('GET /auth/me — token olmadan 401 qaytarır', async () => {
        const res = await fetch(`${API_BASE}/auth/me`);
        expect(res.status).toBe(401);
    });
});
