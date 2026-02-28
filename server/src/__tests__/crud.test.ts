import { getAdminToken, apiRequest } from './helpers';

describe('CRUD Modules API', () => {
    let token: string;

    beforeAll(async () => {
        token = await getAdminToken();
    });

    // ──────────────── Assets ────────────────
    describe('Assets', () => {
        let assetId: string;

        it('POST /assets — yeni aktiv yaradır', async () => {
            const { status, data } = await apiRequest('POST', '/assets', token, {
                name: 'Test Server',
                category: 'əsas',
                sub_category: 'hardware',
                value: 4,
                criticality: 'yüksək',
                location: 'Bakı DC-1',
                status: 'aktiv',
                last_review: '2026-01-01',
            });

            expect(status).toBe(201);
            expect(data.asset_code).toMatch(/^AST-/);
            expect(data.name).toBe('Test Server');
            assetId = data.id;
        });

        it('GET /assets — siyahı alır', async () => {
            const { status, data } = await apiRequest('GET', '/assets', token);
            expect(status).toBe(200);
            expect(data.data).toBeInstanceOf(Array);
            expect(data.pagination).toBeDefined();
            expect(data.pagination.total).toBeGreaterThanOrEqual(1);
        });

        it('GET /assets/:id — tək qeyd alır', async () => {
            const { status, data } = await apiRequest('GET', `/assets/${assetId}`, token);
            expect(status).toBe(200);
            expect(data.id).toBe(assetId);
        });

        it('PUT /assets/:id — aktivi yeniləyir', async () => {
            const { status, data } = await apiRequest('PUT', `/assets/${assetId}`, token, {
                name: 'Test Server (yeniləndi)',
                value: 5,
            });
            expect(status).toBe(200);
            expect(data.name).toBe('Test Server (yeniləndi)');
        });

        it('DELETE /assets/:id — aktivi silir', async () => {
            const { status } = await apiRequest('DELETE', `/assets/${assetId}`, token);
            expect(status).toBe(200);
        });

        it('GET /assets/:id — silinmiş aktiv 404 qaytarır', async () => {
            const { status } = await apiRequest('GET', `/assets/${assetId}`, token);
            expect(status).toBe(404);
        });
    });

    // ──────────────── Threats ────────────────
    describe('Threats', () => {
        let threatId: string;

        it('POST /threats — yeni təhdid yaradır', async () => {
            const { status, data } = await apiRequest('POST', '/threats', token, {
                name: 'DDoS Hücumu',
                category: 'texniki',
                source: 'kənardan',
                purpose: ['xidmət_dayandırma'],
                target_type: 'şəbəkə',
                intentionality: 'qərəzli',
                severity: 'yüksək',
                probability: 3,
                severity_law: 'yüksək',
                probability_band_law: 'p41_60',
                is_external: true,
            });

            expect(status).toBe(201);
            expect(data.threat_code).toMatch(/^THR-/);
            threatId = data.id;
        });

        it('DELETE /threats/:id — təhdidi silir', async () => {
            const { status } = await apiRequest('DELETE', `/threats/${threatId}`, token);
            expect(status).toBe(200);
        });
    });

    // ──────────────── Vulnerabilities ────────────────
    describe('Vulnerabilities', () => {
        let vulnId: string;

        it('POST /vulnerabilities — yeni boşluq yaradır', async () => {
            const { status, data } = await apiRequest('POST', '/vulnerabilities', token, {
                name: 'SQL Injection',
                type: 'boşluq',
                cve_ref: 'CVE-2025-99999',
                severity_internal: 'kritik',
                severity_law: 'yüksək',
                detection_date: '2026-01-15',
                detection_method: 'skaner',
                exploitation_status: 'istismar_edilə_bilər',
                status: 'açıq',
            });

            expect(status).toBe(201);
            expect(data.name).toBe('SQL Injection');
            vulnId = data.id;
        });

        it('DELETE /vulnerabilities/:id — boşluğu silir', async () => {
            const { status } = await apiRequest('DELETE', `/vulnerabilities/${vulnId}`, token);
            expect(status).toBe(200);
        });
    });

    // ──────────────── Solutions ────────────────
    describe('Solutions', () => {
        let solutionId: string;

        it('POST /solutions — yeni həll yaradır', async () => {
            const { status, data } = await apiRequest('POST', '/solutions', token, {
                name: 'WAF Quruluşu',
                type: 'qabaqlayıcı',
                solution_kind: 'texniki',
                technology: 'WAF',
                effectiveness: 8,
                is_ai: false,
                is_certified: true,
                source: 'vendor',
            });

            expect(status).toBe(201);
            expect(data.solution_code).toMatch(/^SOL-/);
            solutionId = data.id;
        });

        it('DELETE /solutions/:id — həlli silir', async () => {
            const { status } = await apiRequest('DELETE', `/solutions/${solutionId}`, token);
            expect(status).toBe(200);
        });
    });

    // ──────────────── Requirements ────────────────
    describe('Requirements', () => {
        let reqId: string;

        it('POST /requirements — yeni tələb yaradır', async () => {
            const { status, data } = await apiRequest('POST', '/requirements', token, {
                req_title: 'ISO 27001 A.8.1',
                req_category: 'standart',
                req_description: 'Aktiv inventarının saxlanması',
                source_type: 'ISO',
                source_ref: 'ISO 27001:2022 A.8.1',
                activity_area: ['aktiv_idarəetmə'],
                status: 'aktiv',
            });

            expect(status).toBe(201);
            reqId = data.id;
        });

        it('DELETE /requirements/:id — tələbi silir', async () => {
            const { status } = await apiRequest('DELETE', `/requirements/${reqId}`, token);
            expect(status).toBe(200);
        });
    });

    // ──────────────── Incidents ────────────────
    describe('Incidents', () => {
        let incidentId: string;

        it('POST /incidents — yeni insident yaradır', async () => {
            const { status, data } = await apiRequest('POST', '/incidents', token, {
                title: 'Phishing Email Kampaniyası',
                type: 'phishing',
                severity: 'P2_yüksək',
                description: 'Əməkdaşlara saxta email göndərildi',
                detection_datetime: '2026-02-01T08:00:00Z',
                status: 'yeni',
            });

            expect(status).toBe(201);
            expect(data.incident_code).toMatch(/^INC-/);
            incidentId = data.id;
        });

        it('POST /incidents/:id/actions — cavab addımı əlavə edir', async () => {
            const { status, data } = await apiRequest('POST', `/incidents/${incidentId}/actions`, token, {
                action_title: 'Email blokla',
                action_description: 'Phishing domain-ini email gateway-də blokla',
            });

            expect(status).toBe(201);
            expect(data.action_title).toBe('Email blokla');
        });

        it('GET /incidents/:id/actions — cavab addımlarını siyahılayır', async () => {
            const { status, data } = await apiRequest('GET', `/incidents/${incidentId}/actions`, token);
            expect(status).toBe(200);
            expect(data).toBeInstanceOf(Array);
            expect(data.length).toBe(1);
        });

        it('DELETE /incidents/:id — insidenti silir', async () => {
            const { status } = await apiRequest('DELETE', `/incidents/${incidentId}`, token);
            expect(status).toBe(200);
        });
    });
});
