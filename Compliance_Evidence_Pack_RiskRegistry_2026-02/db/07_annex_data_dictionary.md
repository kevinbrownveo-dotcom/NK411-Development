# Annex §3 Cədvəl xəritəsi: Threat Dictionary

| Annex Sahəsi | DB Sütunu | API / JSON Field | UI Label (Xana) | Required / Rule |
|-------------|------------|------------------|----------------|-----------------|
| Təhdidin Adı | name | name | Ad | Bəli (Text) |
| Kateqoriya | category | category | Kateqoriya | Bəli (5-li Enum) |
| Mənbə | source | source | Mənbə | Bəli (kənardan/daxildən) |
| Məqsəd | purpose | purpose | Məqsəd (multi) | Bəli (Daxili JSON array) |
| Niyyət | intentionality | intentionality | Niyyət | Bəli (qərəzli/təsadüfi) |
| Hədəf Tipi | target_type | target_type | Hədəf Tipi | Bəli (5-li Enum) |
| Ehtimal | probability | probability | Ehtimal (0-100) | Bəli (Rəqəm) |
| Qanun ciddiliyi | severity_law | severity_law | Qanun ciddiliyi | Bəli (Enum) |
| Mili Təhdid | national_is_threat | national_is_threat | Milli İS təhdidi | Xeyr (Switch) |
| CIA Təhdidi | cia_property_threat | cia_property_threat| CIA mülkiyyət təhdidi| Xeyr (Switch) |
| Təsvir | description | description | Təfsilatlı təsvir | Xeyr (TextArea) |
| Həssaslıq Req.| sensitivity_level | sensitivity_level| Həssaslıq dərəcəsi | Xeyr (1-5 Limit) |
| Review Tarixi | last_review_date | last_review_date | Son nəzərdən keçmə| Xeyr (Tarix) |
| Status | threat_status | threat_status | Təhdid statusu | Bəli (aktiv/passiv/arxiv) |
