---
"@huanglangjian/specs": minor
"@huanglangjian/specs-ts-codegen": minor
---

feat: JSDoc generation, metadata fields, eliminate SchemaInfo

- specs: Add `deprecated` to BasicModel, `deprecated` to RouteModel, `description` to RouterModel
- specs-ts-codegen: Generate `@description`/`@deprecated`/`@example`/`@default` JSDoc on model types and field-level inline JSDoc
- specs-ts-codegen: Generate `@summary`/`@description`/`@deprecated` JSDoc on operation namespaces and client functions
- OpenAPI: Emit top-level tags with description from RouterModel.description
- refactor: Eliminate SchemaInfo type — SchemaMap is now Map<string, Models> directly
- refactor: Remove metadata forwarding boilerplate; consumers read model metadata directly
- fix: Remove unsafe type casts in collectNamedModels walk loop
