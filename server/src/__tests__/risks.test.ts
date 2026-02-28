import { getAdminToken, apiRequest } from './helpers';

describe('Risks API — Hesablama + Əlaqələr', () => {
    let token: string;
    let riskId: string;
    let assetId: string;
    let threatId: string;

    beforeAll(async () => {
        token = await getAdminToken();
    });

    it('POST /risks — yeni risk yaradır və skor hesablayır', async () => {
        const { status, data } = await apiRequest('POST', '/risks', token, {
            name: 'Server DB Pozulması Test',
            category: 'texniki',
            description: 'Verilənlər bazası serverinin kompromis edilməsi',
            asset_value: 4,
            probability_factor: 3,
            statistical_probability: 45,
            technical_impact: 4,
            business_impact: 5,
            status: 'açıq',
        });

        expect(status).toBe(201);
        expect(data.risk_code).toMatch(/^RSK-/);
        expect(data.qualitative_score).toBeDefined();
        expect(data.priority).toBeDefined();
        // qualitative_score postgres-dən string kimi gələ bilər
        expect(Number(data.qualitative_score)).toBeGreaterThan(0);
        riskId = data.id;
    });

    it('GET /risks/:id/score — canlı skor alır', async () => {
        const { status, data } = await apiRequest('GET', `/risks/${riskId}/score`, token);
        expect(status).toBe(200);
        expect(Number(data.qualitative_score)).toBeGreaterThan(0);
        expect(Number(data.prob_max)).toBeGreaterThan(0);
        expect(['aşağı', 'orta', 'yüksək', 'kritik']).toContain(data.priority);
    });

    // Əlaqə testləri
    it('POST /assets — əlaqə üçün aktiv yaradır', async () => {
        const { status, data } = await apiRequest('POST', '/assets', token, {
            name: 'DB Server (risk test)',
            category: 'əsas',
            sub_category: 'hardware',
            value: 5,
            criticality: 'kritik',
            location: 'Bakı',
            status: 'aktiv',
            last_review: '2026-01-01',
        });
        expect(status).toBe(201);
        assetId = data.id;
    });

    it('POST /threats — əlaqə üçün təhdid yaradır', async () => {
        const { status, data } = await apiRequest('POST', '/threats', token, {
            name: 'SQL Injection Hücumu (risk test)',
            category: 'texniki',
            source: 'kənardan',
            purpose: ['data_oğurluq'],
            target_type: 'infrastruktur_komponenti',
            intentionality: 'qərəzli',
            severity: 'kritik',
            probability: 70,
            severity_law: 'kritik',
            probability_band_law: 'p61_80',
            is_external: true,
        });
        expect(status).toBe(201);
        threatId = data.id;
    });

    it('POST /risks/:id/assets — risk-ə aktiv əlaqələndirir', async () => {
        const { status, data } = await apiRequest('POST', `/risks/${riskId}/assets`, token, {
            asset_id: assetId,
        });
        expect(status).toBe(201);
        expect(data.risk_id).toBe(riskId);
        expect(data.asset_id).toBe(assetId);
    });

    it('POST /risks/:id/threats — risk-ə təhdid əlaqələndirir', async () => {
        const { status } = await apiRequest('POST', `/risks/${riskId}/threats`, token, {
            threat_id: threatId,
        });
        expect(status).toBe(201);
    });

    it('POST /risks/:id/assets — dublikat əlaqə 409 qaytarır', async () => {
        const { status } = await apiRequest('POST', `/risks/${riskId}/assets`, token, {
            asset_id: assetId,
        });
        expect(status).toBe(409);
    });

    it('GET /risks/:id/relations — bütün əlaqələri qaytarır', async () => {
        const { status, data } = await apiRequest('GET', `/risks/${riskId}/relations`, token);
        expect(status).toBe(200);
        expect(Array.isArray(data.assets)).toBe(true);
        expect(Array.isArray(data.threats)).toBe(true);
        expect(data.assets.length).toBeGreaterThanOrEqual(1);
        expect(data.threats.length).toBeGreaterThanOrEqual(1);
    });

    it('DELETE /risks/:id/assets/:assetId — aktiv əlaqəsini silir', async () => {
        const { status } = await apiRequest('DELETE', `/risks/${riskId}/assets/${assetId}`, token);
        expect(status).toBe(200);
    });

    it('DELETE /risks/:id/threats/:threatId — təhdid əlaqəsini silir', async () => {
        const { status } = await apiRequest('DELETE', `/risks/${riskId}/threats/${threatId}`, token);
        expect(status).toBe(200);
    });

    // Cleanup
    afterAll(async () => {
        await apiRequest('DELETE', `/risks/${riskId}`, token);
        await apiRequest('DELETE', `/assets/${assetId}`, token);
        await apiRequest('DELETE', `/threats/${threatId}`, token);
    });
});
