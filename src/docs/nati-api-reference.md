# Nati Base44 API — Appeals List

> מקור: מסמך API רשמי מנתיד (NatiBase44API.pdf)
> תאריך עדכון אחרון: 2026-04-29

## סקירה כללית
Retrieves open appeals from the Nati CRM system.

## Authentication
All requests require:
1. **JWT Bearer Token** — pass in the `Authorization` header as `Bearer <token>`
2. **Client ID** — pass in the `clientId` header. Unique identifier provided by Nati.

Both are required on every request.

## Base URL
```
https://api.natid.co.il/api
```

## Response Format
```json
{
  "success": true,
  "total": 65,
  "data": [
    {
      "appeal_id": "12345",
      "department": "גרירה",
      "sub_num": "22012345",
      "date_added": "06/04/2026 14:30:00",
      "status": "0",
      "client_name": "ישראל ישראלי"
    }
  ]
}
```

---

## Endpoints

### GET All Open Appeals
```
GET /get_appeals_list?dep=-1&callStatus=-1
```
Returns all open appeals across all departments with no filters applied.

### GET Department Filter with Sort
```
GET /get_appeals_list?dep=11&callStatus=-1&dir=DESC
```
Returns all open appeals for combined department (drag + radiodisc), sorted newest first.

### GET Date Range Filter
```
GET /get_appeals_list?dep=3&callStatus=-1&from_date=2026-01-01&to_date=2026-04-01&dir=DESC
```
Returns all open drag/towing appeals created between Jan 1 and Apr 1, 2026.

### GET Status Filter (Waiting Only)
```
GET /get_appeals_list?dep=11&callStatus=0&dir=DESC
```
Returns only appeals with 'waiting' status in combined department.

### GET Full Filters (All Parameters)
```
GET /get_appeals_list?dep=3&callStatus=-1&dir=DESC&from_date=2026-01-01&to_date=2026-04-06
```
Shows all available parameters.

---

## Headers

| Header | Value | Description |
|--------|-------|-------------|
| `Authorization` | `Bearer <jwt-token>` | JWT Bearer Token |
| `clientId` | `<client-id>` | Required. Your client ID provided by Nati |

## Query Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `dep` | `-1` | Department ID. `-1`=all, `3`=drag/towing, `4`=rent, `5`=windshields, `10`=radiodisc, `11`=combined (drag+radiodisc) |
| `callStatus` | `-1` | Status filter. `-1`=all open (default), `0`=waiting, `1`=in progress, `2`=storage, `3`=continue treatment, `4`=done but not closed, `5`=arrived, `6`=future service, `7`=mobile unit, `8`=tow truck, `9`=stuck (>2hrs no arrival), `10`=VIP |
| `dir` | `ASC` | Sort direction by `date_added`. `DESC` for newest first, omit or empty for oldest first |
| `q` | - | Free-text search. Searches across: subscription number, requester name, passport, car number, agent name, supplier name, intermediary phone |
| `dispatcher` | - | Filter by dispatcher user ID (integer) |
| `callType` | - | Windshield call type. Only relevant for `dep=5`. Values: `1`=shmashot, `2`=panmar. **Omit entirely when not needed (do NOT pass -1)** |
| `from_date` | - | Start date filter (inclusive). Format: `YYYY-MM-DD` |
| `to_date` | - | End date filter (inclusive). Format: `YYYY-MM-DD` |
| `city` | - | City ID filter. Matches appeals where either origin or destination city matches |
| `openFromFilter` | - | Filter by appeal origin. `1`=opened from CRM, `2`=opened from API. **Note: values are inverted internally** |
| `kablanFilter` | - | Filter by supplier/kablan ID (integer) |
| `from_area` | - | Filter by origin area ID (integer) |
| `to_area` | - | Filter by destination/storage area ID (integer) |
| `from_distance` | - | Minimum distance filter in km (integer) |
| `to_distance` | - | Maximum distance filter in km (integer) |

---

## Status Codes Reference

| Code | Status |
|------|--------|
| `0` | ממתין (Waiting) |
| `1` | בטיפול (In Progress) |
| `2` | באחסנה (Storage) |
| `3` | המשך טיפול (Continue Treatment) |
| `4` | בוצע לא סגור (Done but not closed) |
| `5` | הגיע (Arrived) |
| `6` | שירות עתידי (Future Service) |
| `7` | יחידה ניידת (Mobile Unit) |
| `8` | משאית גרר (Tow Truck) |
| `9` | תקוע >2 שעות (Stuck >2hrs no arrival) |
| `10` | VIP |

## Department Codes Reference

| Code | Department |
|------|-----------|
| `-1` | הכל (All) |
| `3` | גרירה (Drag/Towing) |
| `4` | השכרה (Rent) |
| `5` | שמשות (Windshields) |
| `10` | רדיו דיסק (Radiodisc) |
| `11` | משולב - גרירה+רדיו דיסק (Combined) |

---

## Environment Variables (Secrets)
- `NATI_API_JWT_TOKEN` — JWT Bearer Token
- `NATI_API_CLIENT_ID` — Client ID

## Notes
- All query parameters are optional. When omitted, defaults apply (no filter).
- `callType` — do NOT pass `-1`, omit entirely when not filtering by call type.
- `openFromFilter` values are inverted internally (1=CRM, 2=API).