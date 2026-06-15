# @huanglangjian/specs-ts-codegen

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
