# Nati Base44 API — Appeals List

Retrieves open appeals from the Nati CRM system.

## Authentication
All requests require:
1. JWT Bearer Token — Authorization header as Bearer token
2. Client ID — clientId header

## Base URL
https://api.natid.co.il/api

## Response Format
JSON: { success, total, data: [{appeal_id, department, sub_num, ...}] }

## Endpoints

### GET All Open Appeals
GET https://api.natid.co.il/api/get_appeals_list?dep=-1&callStatus=-1

Params: dep (-1=all, 3=drag/towing, 4=rent, 5=windshields, 10=radiodisc, 11=combined), callStatus (-1=all), dir (DESC/ASC), from_date/to_date (YYYY-MM-DD), callType (windshields only)

### GET Department Filter with Sort
GET https://api.natid.co.il/api/get_appeals_list?dep=11&callStatus=-1&dir=DESC

### GET Date Range Filter
GET https://api.natid.co.il/api/get_appeals_list?dep=3&callStatus=-1&from_date=2026-01-01&to_date=2026-04-01&dir=DESC
