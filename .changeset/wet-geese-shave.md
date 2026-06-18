---
"@huanglangjian/specs": patch
---

feat: auto-fill missing path variables with `string()` type in `route()` factory

- When `variables` is not specified, extract `{param}` names from the path template and default them to `string()`
- Ensures generated OpenAPI always includes path parameter definitions
