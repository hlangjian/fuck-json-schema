# @huanglangjian/specs-ts-codegen

## 0.9.1

### Patch Changes

- 8b7668b: fix: break circular dependency by splitting test.ts into per-package tests

  - specs/test.ts: OpenAPI + JSON Schema + model collection (no codegen deps)
  - specs-ts-codegen/test.ts: server + client codegen only
  - Remove cross-package devDependency between specs and specs-ts-codegen

- Updated dependencies [8b7668b]
  - @huanglangjian/specs@0.9.1
