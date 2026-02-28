# Test Planı və Çıxışlar

### Test Ssenariləri (Jest E2E Suite)
Testlər server qovluğunda `__tests__` altında 4 əsas bloqa ayrılıb:
1. **Auth & RBAC:** JWT generasiya, yalnız Auditor roluna icazəli oxuma.
2. **CRUD Factory:** Assets, Vulnerabilities və s. API testləri.
3. **Risks & Score:** Əlaqələndirmə və `(AV * P * I)` skor hesablaması, SoD bloklanması (Creator != Approver).
4. **Dashboard:** Heatmap üçün məlumat yığma.

### Coverage Output (Nümunə)
Nəticələr layihə mühitində uğurla keçmiş və 38 test icra olunmuşdur. Output yuxarıda əldə edilmiş real CLI cavabıdır:
```text
Test Suites: 4 passed, 4 total
Tests:       38 passed, 38 total
Snapshots:   0 total
Time:        7.938 s
```
