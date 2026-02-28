/**
 * Test Helper — Ümumi yardımçı funksiyalar
 * 
 * Testlər işləyən serverdən (localhost:3001) istifadə edir.
 * Server-in `npm run dev` ilə işlədiyindən əmin olun.
 */

const API_BASE = 'http://localhost:3001/api';

interface LoginResponse {
    accessToken: string;
    refreshToken: string;
    user: { id: string; email: string; role: string };
}

/**
 * Admin ilə login olub token al
 */
export async function getAdminToken(): Promise<string> {
    const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: 'admin@risk-registry.az',
            password: 'Admin123!',
        }),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`Login failed (${res.status}): ${JSON.stringify(err)}`);
    }

    const data: LoginResponse = await res.json();
    return data.accessToken;
}

/**
 * Authenticated API sorğusu göndər
 */
export async function apiRequest(
    method: string,
    path: string,
    token: string,
    body?: any
): Promise<{ status: number; data: any }> {
    const opts: RequestInit = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
    };

    if (body) {
        opts.body = JSON.stringify(body);
    }

    const res = await fetch(`${API_BASE}${path}`, opts);
    const data = await res.json().catch(() => null);
    return { status: res.status, data };
}

export { API_BASE };
