# Auth və Rollar Arxitekturası

### 1. Auth Modeli
Sistem **Mühafizə olunan JSON Web Tokens (JWT)** vasitəsilə autentifikasiya həyata keçirir.
- **Login:** `/api/auth/login` vasitəsilə Email/Şifrə təsdiqlənir və server 2 token qaytarır: `accessToken` (15 dəq) və `refreshToken` (8 saat HTTPOnly cookie-də).
- **LDAP / SSO (Opsional):** Mühit dəyişəni (`LDAP_ENABLED=true`) verildiyi təqdirdə, eyni interfeys Microsoft Active Directory (AD) üzərindən doğrulama həyata keçirir (Bax: `authController.ts`).

### 2. Role Mapping
- Verilənlər bazasındakı `users` cədvəlində hər istifadəçiyə 1 ədəd `role` VARCHAR təyin olunur.
- İcazə verilən rollar: `admin, dpo, izom_direktor, izom_mutexessis, is_ishchisi, auditor`.
- İcazələr (Permissions) JWT claim-i kimi tokenin içərisində daşınmır, əvəzinə `rbac.ts` faylındakı middleware vasitəsilə statik yoxlanılır (Məs: Auditor = Read Only).

### 3. SoD (Separation of Duties) Qaydası
- Xüsusi iş prosesləri (Məsələn Risk təsdiqlənməsi) `risks.ts` daxilində sərt məntiqə tabedir.
- **Qayda:** Təsdiqləmə (Approve) sorğusu göndərən istifadəçinin `userId` dəyəri, Riskin DB-də olan `created_by` dəyəri ilə eyni ola bilməz. (Sübut API Response 403 JSON faylına baxın).
