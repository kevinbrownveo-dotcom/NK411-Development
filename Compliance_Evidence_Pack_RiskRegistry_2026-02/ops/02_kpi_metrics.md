# KPI Metrics

### Hesablama Tərzi
- Dashboard üçün göstəricilər `GET /dashboard/kpi` üzərindən canlı (`COUNT(*)`) rejimdə işləyir. Job və ya cron ifadəsi qurulmamışdır.

### Annual Assessment (Periyodik Review)
- Təhdidlərin nizamlı review olunması Annex 3 üçün `last_review_date` field-i olaraq cədvələ salınmışdır.
- Aktiv şəkildə e-poçt "alert" mexanizmi və sistem-daxili avtomatik xatırlatmalar hələki **Mövcud Deyil**.
- Tələb Statusu: **PARTIAL/FAIL + Plan**
- Plan: Növbəti versiyada Node.js `node-cron` paketinin əlavə edilib `last_review_date < NOW() - 1 YEAR` şərti ilə DPO-a mail atılması.
