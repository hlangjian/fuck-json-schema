# @huanglangjian/specs-ts-codegen

## 0.11.1

### Patch Changes

- 739a8be: fix: JSDoc formatting, expand Request interfaces, add groupDescription

  - fieldJsdoc: standard multi-line `/** @description */` format, `@description`/`@deprecated` tags only
  - Remove bare title text from field JSDoc; title falls back to `@description`
  - Expand Request interfaces from compact to multi-line with field-level JSDoc
  - Add `@description` JSDoc on handler factory, config getter, and index.ts handlers
  - Add `OperationDescriptor.groupDescription` forwarded from RouterModel.description
  - Test coverage for all JSDoc tags: `@example`, `@default`, `@deprecated` (model/field/operation)

- Updated dependencies [739a8be]
  - @huanglangjian/specs@0.12.1

## 0.11.0

### Minor Changes

- 4f326ad: feat: JSDoc generation, metadata fields, eliminate SchemaInfo

  - specs: Add `deprecated` to BasicModel, `deprecated` to RouteModel, `description` to RouterModel
  - specs-ts-codegen: Generate `@description`/`@deprecated`/`@example`/`@default` JSDoc on model types and field-level inline JSDoc
  - specs-ts-codegen: Generate `@summary`/`@description`/`@deprecated` JSDoc on operation namespaces and client functions
  - OpenAPI: Emit top-level tags with description from RouterModel.description
  - refactor: Eliminate SchemaInfo type — SchemaMap is now Map<string, Models> directly
  - refactor: Remove metadata forwarding boilerplate; consumers read model metadata directly
  - fix: Remove unsafe type casts in collectNamedModels walk loop

### Patch Changes

- Updated dependencies [4f326ad]
  - @huanglangjian/specs@0.12.0

## 0.10.2

### Patch Changes

- Updated dependencies [05a1df3]
  - @huanglangjian/specs@0.11.0

## 0.10.1

### Patch Changes

- Updated dependencies [c54ac88]
  - @huanglangjian/specs@0.10.0

## 0.10.0

### Minor Changes

- c5a4822: Support Valibot as an alternative validation library. Add `validationLib` option to `TsServerOptions` and `TsClientOptions` (defaults to `"zod"`). New `ValidationLib` interface in `src/validation-lib.ts` with `zodLib` and `valibotLib` implementations. Refactor: `toZod` → `toSchema`, `toHonoPath` → `toColonPath`, `resolveZodSchema` → `resolveSchemaExpr`. Split config switch nodes into `TaggedSwitchNode`/`UnionSwitchNode`. Union discriminator env var now uses `envPrefix` directly (no `_TYPE` suffix).

## 0.9.2

### Patch Changes

- 17051ba: feat: routerModel() factory, remove redundant tags, move skills to top-level directory

  - Add routerModel() factory function in specs/src/api.ts
  - Remove redundant tags from test examples (auto-populated from RouterModel.name)
  - Move SKILL.md files from packages/ to skills/ directory with skill-creator structure
  - specs-ts-codegen: config model types now generated in models.ts with proper TS types

- Updated dependencies [17051ba]
  - @huanglangjian/specs@0.9.2

## 0.9.1

### Patch Changes

- 8b7668b: fix: break circular dependency by splitting test.ts into per-package tests

  - specs/test.ts: OpenAPI + JSON Schema + model collection (no codegen deps)
  - specs-ts-codegen/test.ts: server + client codegen only
  - Remove cross-package devDependency between specs and specs-ts-codegen

- Updated dependencies [8b7668b]
  - @huanglangjian/specs@0.9.1
