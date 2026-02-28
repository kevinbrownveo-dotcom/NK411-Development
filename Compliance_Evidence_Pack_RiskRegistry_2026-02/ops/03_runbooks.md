# Operations Runbooks (Qısa)

### 1. Backup / Restore
- **Backup:** `docker exec rr-postgres pg_dump -U riskadmin risk_registry > backup.sql`
- **Restore:** `docker exec -i rr-postgres psql -U riskadmin risk_registry < backup.sql`

### 2. Incident Response (Tətbiq Üçün)
- Server çökdükdə `docker-compose logs --tail 100 -f server` vasitəsilə ən son xəta tapılır. `restart: unless-stopped` tətbiq olunub.

### 3. Access Management
- Yeni Admin və ya DPO yalnız **Mövcud Admin** profili tərəfindən `Users & Roles` panelindən yaradıla bilər. API `POST /api/users` üzərindən icra olunur və `req.user.role === 'admin'` şərti yoxlanılır.
