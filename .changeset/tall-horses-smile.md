---
"@huanglangjian/specs": patch
"@huanglangjian/specs-ts-codegen": patch
---

fix: break circular dependency by splitting test.ts into per-package tests

- specs/test.ts: OpenAPI + JSON Schema + model collection (no codegen deps)
- specs-ts-codegen/test.ts: server + client codegen only
- Remove cross-package devDependency between specs and specs-ts-codegen
