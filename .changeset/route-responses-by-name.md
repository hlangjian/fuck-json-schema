---
"@huanglangjian/specs": minor
"@huanglangjian/specs-ts-codegen": minor
"@huanglangjian/specs-dotnet-codegen": minor
---

feat!: route responses keyed by name, status required, summary removed

- Route responses changed from `{ [statusCode]: ResponseModel }` to `{ [responseKey]: ResponseModel }`
- `json()` / `binary()` / `jsonStream()` / `sseStream()` now require `status: number`
- Removed `summary` from all ResponseModel types (redundant with body model descriptions)
- Same-status responses auto-merge into `oneOf` in OpenAPI output
- Response type names in codegen use the response key instead of status codes
