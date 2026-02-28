# Logging Pipeline Strategy

1. **Real-time Log Forwarding:** 
Hazırda tətbiq \`sys_audit_log\` verilənlər bazası cədvəlindən istifadə edir. Gələcək SIEM/ELK inteqrasiyası üçün `Logstash` agenti və ya `Filebeat` Docker containeri vasitəsilə PostgreSQL loglarının (yaxud stdout JSON formaların) mərkəzə yönləndirilməsi **Planlaşdırılır** (Hazırda aktiv SIEM screenshot yoxdur - bu opsional/tövsiyə olunan hissədir, "PARTIAL" kimi işarələnir).

2. **API Logları:** Express.js `morgan` logları stdout-a JSON formatında yönəldir.
3. **Audit Event Logları:** İnsidentlərin, Risklərin yaradılması/silinməsi/təsdiqi zamanı yaranan biznes hadisələri izi. Məsələn:
```json
{
  "entity_type": "risk",
  "action": "update",
  "changed_fields": { "approved_by": "admin_uuid" },
  "actor_user": "admin@ex.am"
}
```
