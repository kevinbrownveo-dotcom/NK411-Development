# NK411 — İnkişaf Jurnalı (Dev Log)

> Bu fayl sessiyanın vəziyyətini saxlayır. Sabah başqa komputerdən davam etmək üçün bu faylı oxu.

---

## Sabah başlamaq üçün

```bash
git clone https://github.com/kevinbrownveo-dotcom/NK411-Development.git
cd NK411-Development
docker compose up -d
```

Migrasiyalar artıq işlənib — yenidən işlətmə lazım deyil (PostgreSQL volume persist olur).

Giriş testi:
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@risk-registry.az","password":"Admin123!"}'
```

Frontend: http://localhost  
Admin panel: http://localhost/admin/users

---

## Son sessiyada edilən işlər

### ✅ Faza 0 — 500 Xətasının Düzəldilməsi
- **Problem:** `express-rate-limit` nginx-in `X-Forwarded-For` başlığı ilə toqquşurdu
- **Həll:** `server/src/index.ts`-ə `app.set('trust proxy', 1)` əlavə edildi
- **Status:** Test edildi, login 200 qaytarır ✅

### ✅ Faza 1 — Auth Təhlükəsizliyi
- Login lockout: 5 uğursuz cəhd → 15 dəq blok (`login_attempts`, `locked_until` DB sahələri)
- Refresh token bcrypt-hash ilə DB-də saxlanır (artıq plain text deyil)
- `POST /api/auth/register` endpoint artıq yalnız admin-only (`authenticate + authorize('users:create')`)
- Şifrə siyasəti: min 8 xarakter, böyük/kiçik hərf, rəqəm, xüsusi simvol
- Login rate limit: 10 cəhd / 15 dəqiqə

### ✅ Faza 2 — Verilənlər Bazası Migrasiyaları
Aşağıdakı 4 yeni migrasiya yaradıldı və işlədildi:

| Fayl | Məzmun |
|------|--------|
| `20260219003_add_roles_and_permissions.ts` | `roles` + `role_permissions` cədvəlləri, 6 sistem rolu seed |
| `20260219004_alter_users_add_role_id.ts` | `users`-ə `role_id` UUID FK əlavə, mövcud `role` enum-dan avtomatik köçürülmə |
| `20260219005_add_ldap_fields.ts` | `auth_source`, `ldap_dn` sahələri + `ldap_group_mappings` cədvəli |
| `20260219006_add_login_lockout.ts` | `login_attempts`, `locked_until` sahələri |

### ✅ Faza 3 — Dinamik RBAC
- `server/src/middleware/rbac.ts` yeniləndi: artıq DB-dən icazə oxuyur
- İstifadəçinin `role_id`-si varsa `role_permissions` cədvəlindən yüklənir
- Yoxdursa köhnə statik `PERMISSIONS` map-dan fallback
- 5 dəqiqəlik in-memory cache (Map + timestamp)

### ✅ Faza 3b — Admin API
`server/src/routes/admin.ts` — tam yeni fayl:
- `GET/POST/PUT/DELETE /api/admin/users` — istifadəçi CRUD
- `POST /api/admin/users/:id/assign-role` — rol təyin et
- `POST /api/admin/users/:id/reset-password` — şifrə sıfırla
- `POST /api/admin/users/:id/unlock` — kilidi aç
- `GET/POST/PUT/DELETE /api/admin/roles` — rol CRUD
- `GET/PUT /api/admin/roles/:id/permissions` — icazə matrissi
- `GET/POST/DELETE /api/admin/ldap/group-mappings` — LDAP xəritəsi
- `POST /api/admin/ldap/test` — LDAP bağlantı testi

### ✅ Faza 4 — LDAP Xidməti
`server/src/services/ldap.ts` — tam yeni fayl:
- Hibrid rejim: LDAP əvvəl, uğursuz olarsa lokal login
- `isEnabled()`, `isAvailable()` (3s timeout), `authenticate(username, password)`
- Servisdə `ldapjs` paketi istifadə edilir

### ✅ Faza 5 — Admin Frontend Səhifələri
3 yeni səhifə yaradıldı:

| Fayl | URL | Funksiya |
|------|-----|----------|
| `client/src/pages/admin/UsersPage.tsx` | `/admin/users` | İstifadəçi idarəetməsi |
| `client/src/pages/admin/RolesPage.tsx` | `/admin/roles` | Rol + icazə matrissi |
| `client/src/pages/admin/LdapMappingPage.tsx` | `/admin/ldap` | LDAP qrup xəritəsi |

- `MainLayout.tsx`-ə admin sub-menyu əlavə edildi (yalnız `admin` rolunda görünür)
- `App.tsx`-ə `AdminRoute` guard + 3 yeni route əlavə edildi

### ✅ Faza 6 — Frontend RBAC Hook
- `client/src/hooks/usePermission.ts` — yeni fayl
- `hasPermission()`, `canRead()`, `canCreate()`, `canUpdate()`, `canDelete()`, `isAdmin()`
- `client/src/context/AuthContext.tsx` yeniləndi: login/me zamanı `permissions[]` array yüklənir

### ✅ Əlavə
- `docker-compose.yml`-ə LDAP mühit dəyişənləri əlavə edildi (`LDAP_ENABLED=false` default)
- `server/package.json`-a `ldapjs` + `ioredis` əlavə edildi
- `client/src/types/index.ts` — `User`, `Role`, `RolePermission`, `LdapGroupMapping` interfeyslər yeniləndi
- `client/src/services/api.ts` — `adminApi` namespace əlavə edildi

---

## Qalan işlər (sabah davam)

### 1. CrudPage RBAC Qoruması
`client/src/components/common/CrudPage.tsx` faylında "Yarat", "Redaktə", "Sil" düymələrini `usePermission` hook-una görə göstər/gizlət.

**Necə ediləcək:**
```tsx
// CrudPage.tsx-ə prop əlavə et:
interface CrudPageProps {
  resource?: string;  // məs. 'assets', 'risks', 'threats'
  // ...mövcud proplar
}

// İçəridə:
const { canCreate, canUpdate, canDelete } = usePermission();

// Düymələri şərtlə render et:
{(!resource || canCreate(resource)) && <Button onClick={handleCreate}>Yeni</Button>}
```

### 2. Dashboard Statistikaları
Dashboard hər modul üçün real say göstərmir — API çağırışlarını tamamla.

### 3. Şifrə Dəyişdirmə Səhifəsi
İstifadəçinin öz şifrəsini dəyişdirə biləcəyi profil səhifəsi yoxdur.
`GET/PUT /api/auth/profile` endpoint + frontend `ProfilePage.tsx`

### 4. Email Bildirişləri (isteğe bağlı)
Şifrə sıfırlananda, hesab kilidlənəndə email bildirişi — `nodemailer` paketi ilə.

### 5. .env.example Faylı
`docker-compose.yml`-dən ayrı bir `.env.example` şablonu yaratmaq faydalı olar.

---

## Sistem Arxitekturası

```
[Brauzer]
    │  HTTP :80/:443
    ▼
[Nginx — rr-nginx]
    ├── /api/*  →  [Express Server — rr-server :3001]
    └── /*      →  [Vite Client — rr-client :5173]
                          │
              ┌───────────┴───────────┐
              ▼                       ▼
    [PostgreSQL — rr-postgres]   [Redis — rr-redis]
         :5432                        :6379
```

---

## Verilənlər Bazası Cədvəlləri

```
users              — istifadəçilər (role_id FK, auth_source, login_attempts, locked_until)
roles              — dinamik rollar (is_system, is_custom)
role_permissions   — rol icazələri (role_id, resource, action)
ldap_group_mappings — LDAP qrup → rol xəritəsi
assets             — aktivlər
threats            — təhdidlər
vulnerabilities    — boşluqlar
risks              — risklər
incidents          — insidentlər
solutions          — həllər
requirements       — tələblər
thresholds         — hədlər
consequences       — nəticələr
reconciliations    — uzlaşdırma
audit_logs         — audit jurnalı
```

---

## Test İstifadəçiləri

| Email | Şifrə | Rol |
|-------|-------|-----|
| admin@risk-registry.az | Admin123! | admin |
| risk.manager@risk-registry.az | Admin123! | risk_manager |
| asset.owner@risk-registry.az | Admin123! | asset_owner |
| auditor@risk-registry.az | Admin123! | auditor |
| incident@risk-registry.az | Admin123! | incident_coordinator |
| dxeit@risk-registry.az | Admin123! | dxeit_rep |

---

## Faydalı Komandalar

```bash
# Bütün konteynerləri yenidən başlat
docker compose restart

# Logları izlə
docker compose logs -f server
docker compose logs -f client

# Server TypeScript yoxla
cd server && ./node_modules/.bin/tsc --noEmit

# Client TypeScript yoxla
cd client && ./node_modules/.bin/tsc --noEmit

# Migrasiyaları işlət (lokal dev)
cd server && TS_NODE_TRANSPILE_ONLY=true \
  DB_HOST=localhost DB_PORT=5432 DB_NAME=risk_registry \
  DB_USER=riskadmin DB_PASSWORD=changeme_in_production \
  ./node_modules/.bin/ts-node src/config/migrate.ts

# API sağlamlıq yoxlaması
curl http://localhost:3001/api/health
```

---

*Son yenilənmə: 19 Fevral 2026*
