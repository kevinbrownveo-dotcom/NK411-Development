# Compliance Matrix (Hard Rules)

| RR-REQ ID | Status | Evidence 1 | Evidence 2 | Niyə Belədir (Notes) | Düzəliş (Fix Planı) |
|---|---|---|---|---|---|
| Single schema | PASS | `db/01_schema.sql` (bütün cədvəllər public) | `db/02_tables_list.txt` (prefixes rr_, loc_) | DB tək PostgreSQL mühitində tək şemada toplanıb, məntiqi izolyasiya var. | |
| Annex 3 Fields | PASS | `db/07_annex_data_dictionary.md` | `ui/02_annex_mandatory_fields_mapping.md` | Bütün 21 məcburi forma sahəsi backend API validate modelinə daxildir. | |
| SoD (Approval) | PASS | `api/api_evidence_responses/approve_risk_forbidden_403.json` | `tests/02_test_results.txt` | Creator tərəfindən Approve API response 403 Failed qaytarır və bu fail test edilib. | |
| Audit Immutability | PASS | `db/04_triggers_functions_audit_immutability.txt` | `db/08_sample_queries_and_outputs.md` | DB update/delete API level-də bloklanıb və Route Not Found qaytarır. | |
| Risk Scoring Form.| PASS | `api/01_openapi.yaml` GET score | `tests/02_test_results.txt` | Scoring backenddə (AVxPxI) cədvələ birbaşa tətbiq edilərək UI`a ötürülür. | |
| Incident Phase | PASS | `api/01_openapi.yaml` | `tests/02_test_results.txt` | Phase skip API 400 Bad Request verir. Jest test sübut edilib. | |
| Export DLP | PASS | `db/01_schema.sql` (Data_class sütunu) | API layer source (12-ci fazadan) | Non-admin export 50 limit və maskalıdır. | |
| SIEM Log Pipeline | FAIL / Plan | `ops/01_logging_pipeline.md` | | Hazırda real SIEM screenshot yoxdur. Eventlər yalnız DB-yə yazılır. | Elastictic forwarder əlavə et. |
| Annual Review Alert | PARTIAL / Plan | `ops/02_kpi_metrics.md` | | Tarix qeyd edilir amma avtomatik alert email getmir. | node-cron ilə email trigger yaz. |
| V&V Pentest | FAIL / Plan | `tests/04_pentest/pentest_plan.md` | | Real pentest reportu hələ mövcud deyil. | Q2 Pentest icra et. |
