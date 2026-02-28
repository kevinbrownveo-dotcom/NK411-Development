| Annex Field (Tələb) | UI Form Label | Required (Məcburi)? | API Validation (Təsdiqlənib) |
|---|---|---|---|
| Ad (Name) | "Ad" (Text Input) | BƏLİ | validator: `required string` |
| Kateqoriya | "Kateqoriya" (Select) | BƏLİ | Enum: texniki, fiziki... |
| Mənbə | "Mənbə" | BƏLİ | Enum: kənardan, daxildən... |
| Məqsəd | "Məqsəd (multi)" | BƏLİ | Minimal 1 tag seçilməlidir |
| Ehtimal | "Ehtimal (0-100)" | BƏLİ | Number limit `0-100` |
| Qanun Ciddiliyi | "Qanun ciddiliyi" | BƏLİ | Enum: kritik, yüksək... |
| Milli İS Təhdidi | "Milli İS təhdidi" | XEYR | Switch (Bəli/Xeyr) |
| CIA Təhdidi | "CIA mülkiyyət təhdidi" | XEYR | Switch (Bəli/Xeyr) |
| Status | "Təhdid statusu" | BƏLİ | default: 'aktiv' |
| Həssaslıq Req. | "Həssaslıq dərəcəsi" | XEYR | Number limit `1-5` |
