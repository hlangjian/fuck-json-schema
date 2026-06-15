---
"@huanglangjian/specs-ts-codegen": minor
---

Support Valibot as an alternative validation library. Add `validationLib` option to `TsServerOptions` and `TsClientOptions` (defaults to `"zod"`). New `ValidationLib` interface in `src/validation-lib.ts` with `zodLib` and `valibotLib` implementations. Refactor: `toZod` → `toSchema`, `toHonoPath` → `toColonPath`, `resolveZodSchema` → `resolveSchemaExpr`. Split config switch nodes into `TaggedSwitchNode`/`UnionSwitchNode`. Union discriminator env var now uses `envPrefix` directly (no `_TYPE` suffix).
