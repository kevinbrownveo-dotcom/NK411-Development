# NK411 — İnformasiya Təhlükəsizliyi Risk Reyestri

> ISO 27001, NIST CSF və yerli tənzimləyici tələblərə uyğun, tam veb-əsaslı informasiya təhlükəsizliği risk idarəetmə sistemi.

---

## Mündəricat

- [Haqqında](#haqqında)
- [Texnologiyalar](#texnologiyalar)
- [Modullar](#modullar)
- [Quraşdırma](#quraşdırma)
- [Mühit Dəyişənləri](#mühit-dəyişənləri)
- [İstifadəçi Rolları və RBAC](#istifadəçi-rolları-və-rbac)
- [Admin Panel](#admin-panel)
- [LDAP İnteqrasiyası](#ldap-inteqrasiyası)
- [API](#api)
- [Təhlükəsizlik](#təhlükəsizlik)
- [Layihə Strukturu](#layihə-strukturu)

---

## Haqqında

NK411, təşkilatların informasiya aktivlərini, təhdidlərini, zəifliklərini və risklərini mərkəzləşdirilmiş şəkildə idarə etməsinə imkan verən GRC (Governance, Risk & Compliance) platformasıdır.

**Əsas xüsusiyyətlər:**

- D3.js əsaslı interaktiv aktiv asılılıq xəritəsi
- JWT + Refresh Token əsaslı təhlükəsiz autentifikasiya
- Dinamik RBAC — admin tərəfindən idarə olunan xüsusi rollar və icazələr
- LDAP / Active Directory hibrid inteqrasiyası
- CSV import / export
- Tam audit jurnalı
- Azərbaycan dilində interfeys

---

## Texnologiyalar

### Frontend

| Texnologiya | İstifadə |
|-------------|----------|
| React 18 + TypeScript | UI framework |
| Vite 5 | Build tool |
| Ant Design 5 | Komponent kitabxanası |
| D3.js 7 | Aktiv xəritəsi vizualizasiyası |
| Axios | HTTP client |
| React Router 6 | Routing |

### Backend

| Texnologiya | İstifadə |
|-------------|----------|
| Node.js 20 + Express 4 | API server |
| TypeScript 5 | Tip təhlükəsizliyi |
| PostgreSQL 16 | Əsas verilənlər bazası |
| Redis 7 | Cache |
| Knex.js | Query builder + Migrasiyalar |
| bcryptjs | Şifrə hashing |
| jsonwebtoken | JWT |
| ldapjs | LDAP / AD inteqrasiyası |

### İnfrastruktur

| Texnologiya | İstifadə |
|-------------|----------|
| Docker + Docker Compose | Konteynerləşdirmə |
| Nginx | Reverse proxy |

---

## Modullar

| Modul | Açıqlama |
|-------|----------|
| Dashboard | Ümumi statistika və xülasə |
| Aktivlər | İnformasiya aktivlərinin idarəsi |
| Aktiv Xəritəsi | D3.js interaktiv asılılıq vizualizasiyası |
| Təhdidlər | Təhdid kataloqu |
| Boşluqlar | Zəiflik idarəetməsi |
| Risklər | Risk qiymətləndirilməsi və idarəetmə |
| İnsidentlər | İnsidentlərin qeydiyyatı |
| Həllər | Risklərə cavab tədbirləri |
| Tələblər | Tənzimləyici tələblər |
| Hədlər | Risk hədlərinin müəyyənləşdirilməsi |
| Nəticələr | Risk nəticələrinin qiymətləndirilməsi |
| Uzlaşdırma | Tələblərə uyğunluğun yoxlanması |
| Audit Jurnalı | Bütün əməliyyatların izlənməsi |
| Admin Panel | İstifadəçi, rol və sistem idarəetməsi |

---

## Quraşdırma

### Tələblər

- Docker >= 24
- Docker Compose >= 2

### 1. Klonlayın

```bash
git clone https://github.com/kevinbrownveo-dotcom/NK411-Development.git
cd NK411-Development
```

### 2. Konteynerləri başladın

```bash
docker compose up -d
```

### 3. Migrasiyaları işə salın

```bash
docker compose exec server npm run migrate
docker compose exec server npm run seed
```

### 4. Tətbiqə daxil olun

| Servis | URL |
|--------|-----|
| Frontend | http://localhost |
| Backend API | http://localhost/api |

**Default admin girişi:**

```
Email:  admin@risk-registry.az
Şifrə:  Admin123!
```

> ⚠️ İlk girişdən sonra mütləq şifrəni dəyişin.

---

## Mühit Dəyişənləri

`docker-compose.yml` içindəki `server` servisinin `environment` bölməsini redaktə edin:

```yaml
# Verilənlər bazası
DB_HOST: postgres
DB_PORT: 5432
DB_NAME: risk_registry
DB_USER: riskadmin
DB_PASSWORD: changeme_in_production        # DƏYİŞDİRİN

# JWT
JWT_SECRET: changeme_very_long_secret_key  # min 64 simvol, DƏYİŞDİRİN
JWT_ACCESS_EXPIRY: 15m
JWT_REFRESH_EXPIRY: 8h

# Redis
REDIS_HOST: redis
REDIS_PORT: 6379

# LDAP (isteğe bağlı)
LDAP_ENABLED: "false"
LDAP_URL: "ldap://dc.company.az:389"
LDAP_BASE_DN: "DC=company,DC=az"
LDAP_BIND_DN: "CN=svc-ldap,OU=ServiceAccounts,DC=company,DC=az"
LDAP_BIND_PASSWORD: "changeme"
LDAP_GROUP_BASE_DN: "OU=Groups,DC=company,DC=az"
```

---

## İstifadəçi Rolları və RBAC

Sistem 6 əvvəlcədən müəyyən edilmiş rol ilə gəlir. Admin yeni xüsusi rollar yarada bilər.

### Standart Rollar

| Rol | Açıqlama |
|-----|----------|
| `admin` | Tam sistem girişi, istifadəçi və rol idarəetməsi |
| `risk_manager` | Risk, aktiv, təhdid, boşluq idarəetməsi |
| `asset_owner` | Aktiv idarəetməsi, risk oxuma |
| `auditor` | Bütün modullar yalnız oxuma, audit tam giriş |
| `incident_coordinator` | İnsident və risk idarəetməsi |
| `dxeit_rep` | Qismən oxuma girişi |

Her rol üçün **14 modul × 4 əməliyyat (create / read / update / delete) = 56 icazə nöqtəsi** fərdi idarə oluna bilər.

---

## Admin Panel

Yalnız `admin` roluyla əlçatandır.

| Səhifə | URL | Funksiya |
|--------|-----|----------|
| İstifadəçilər | `/admin/users` | Yarat, redaktə, sil, rol təyin et, şifrə sıfırla, kilid aç |
| Rollar & İcazələr | `/admin/roles` | Xüsusi rol yarat, icazə matrissini konfiqurasiya et |
| LDAP/AD | `/admin/ldap` | AD qrupunu sistem roluna uyğunlaşdır, bağlantı testi |

---

## LDAP İnteqrasiyası

Sistem hibrid rejimdə işləyir — LDAP aktivdirsə əvvəlcə AD ilə cəhd edir, uğursuz olarsa lokal login ilə davam edir:

```
Login
 │
 ├─► LDAP_ENABLED=true && server əlçatan?
 │       ├─► Bəli  → LDAP autentifikasiya → uğurlu → token ver
 │       └─► Xeyr  → lokal bcrypt login
 │
 └─► LDAP_ENABLED=false → lokal bcrypt login
```

Admin paneldən LDAP qrup DN-ni sistem roluna uyğunlaşdırmaq mümkündür.

---

## API

### Autentifikasiya

```
POST  /api/auth/login      Giriş
POST  /api/auth/logout     Çıxış
POST  /api/auth/refresh    Token yenilə
GET   /api/auth/me         Cari istifadəçi məlumatları
```

### Admin

```
GET/POST        /api/admin/users
PUT/DELETE      /api/admin/users/:id
POST            /api/admin/users/:id/assign-role
POST            /api/admin/users/:id/reset-password
POST            /api/admin/users/:id/unlock

GET/POST        /api/admin/roles
PUT/DELETE      /api/admin/roles/:id
GET/PUT         /api/admin/roles/:id/permissions

GET/POST/DELETE /api/admin/ldap/group-mappings
POST            /api/admin/ldap/test
```

### Modullar

```
/api/assets            Aktivlər
/api/threats           Təhdidlər
/api/vulnerabilities   Boşluqlar
/api/risks             Risklər
/api/incidents         İnsidentlər
/api/solutions         Həllər
/api/requirements      Tələblər
/api/thresholds        Hədlər
/api/consequences      Nəticələr
/api/reconciliations   Uzlaşdırma
/api/audit-logs        Audit jurnalı
/api/dashboard         Dashboard statistikası
```

---

## Təhlükəsizlik

| Tədbir | Detal |
|--------|-------|
| Şifrə hashing | bcrypt (rounds: 10) |
| JWT | Access 15 dəq + Refresh 8 saat |
| Refresh token | DB-də bcrypt-hash ilə saxlanır |
| Login lockout | 5 uğursuz cəhd → 15 dəqiqə blok |
| Rate limiting | Login: 10 cəhd / 15 dəqiqə |
| Şifrə siyasəti | Min 8 xarakter, böyük/kiçik hərf, rəqəm, xüsusi simvol |
| RBAC cache | 5 dəqiqəlik in-memory icazə keşi |
| Trust proxy | Nginx `X-Forwarded-For` düzgün işlənir |
| Register endpoint | Yalnız admin yarada bilər |

---

## Layihə Strukturu

```
NK411-Development/
├── client/                        # React frontend
│   └── src/
│       ├── components/
│       │   ├── common/            # CrudPage, FieldLabelWithHelp
│       │   └── layout/            # MainLayout
│       ├── context/               # AuthContext
│       ├── hooks/                 # usePermission
│       ├── pages/
│       │   ├── admin/             # UsersPage, RolesPage, LdapMappingPage
│       │   ├── assets/
│       │   ├── risks/
│       │   └── ...
│       ├── services/              # api.ts, adminApi
│       ├── types/                 # TypeScript tipləri
│       └── utils/                 # passwordPolicy
│
├── server/                        # Express backend
│   └── src/
│       ├── config/                # database, migrate, seed, logger
│       ├── middleware/            # auth, rbac
│       ├── routes/                # auth, admin, assets, risks...
│       ├── services/              # ldap.ts
│       └── utils/                 # codeGenerator, crudFactory, passwordPolicy
│
├── database/
│   └── migrations/                # Knex migrasiyaları (001–006)
│
├── nginx/                         # Reverse proxy konfiqurasiyası
├── docker-compose.yml
└── README.md
```

---

*NK411 Risk Reyestri — © 2026*
