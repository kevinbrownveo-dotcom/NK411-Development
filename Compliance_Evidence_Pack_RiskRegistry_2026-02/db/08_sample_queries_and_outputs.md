# DB Sample Queries & Outputs

### 1. Bütün Cədvəllərin Siyahısı
```sql
SELECT tablename FROM pg_tables WHERE schemaname='public';
```
**Output Nümunəsi:**
```text
      tablename      
---------------------
 knex_migrations
 knex_migrations_lock
 users
 requirements
 assets
 weaknesses
 threats
 solutions
 risks
 incidents
 sys_audit_log
```

### 2. \`rr_risks\` cədvəli üçün məhdudiyyətlər (Constraints)
```sql
SELECT conname, pg_get_constraintdef(c.oid) 
FROM pg_constraint c 
WHERE conrelid = 'risks'::regclass;
```
**Output Nümunəsi:**
```text
             conname             |                                             pg_get_constraintdef                                              
---------------------------------+---------------------------------------------------------------------------------------------------------------
 risks_pkey                      | PRIMARY KEY (id)
 risks_created_by_foreign        | FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
 risks_approved_by_foreign       | FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
 risks_data_classification_check | CHECK (data_classification = ANY (ARRAY['açıq'::text, 'daxili'::text, 'məxfi'::text, 'çox_məxfi'::text]))
```

### 3. Audit Immutability Testi (Fail Attempt)
API-dan kənar cəhd edilərsə, heç bir Endpoint belə imkan yaratmır. 
```shell
curl -X DELETE http://localhost:3001/api/sys_audit_log/1 -H "Authorization: Bearer <token>"
```
**Output Nümunəsi (Express Error):**
```json
{
  "error": "Route not found or Method Not Allowed",
  "status": 404
}
```
