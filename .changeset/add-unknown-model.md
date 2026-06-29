---
"@huanglangjian/specs": minor
---

Added `unknown()` model factory for describing values of unknown structure. Supports the full pipeline: OpenAPI 3.2 (`{}` schema), JSON Schema 2020-12, and TypeScript codegen (`unknown` type). Usable in any position that accepts a `Models` (record properties, array/set/map base, union/taggedUnion variants, request/response bodies, query/header/path params).
