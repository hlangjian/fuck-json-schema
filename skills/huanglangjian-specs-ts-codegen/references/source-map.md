# Source map

| File | Purpose |
|---|---|
| `src/index.ts` | Barrel re-exports |
| `src/server.ts` | `generateTsServer()` — server handler codegen with config generation |
| `src/client.ts` | `generateTsClient()` — fetch-based client codegen |
| `src/shared.ts` | Shared internals: `generateModels`, `toSchema`, `toSchemaEnv`, `toTs`, `resolveSchemaExpr`, `toColonPath`, `modelDefault` |
| `src/validation-lib.ts` | `ValidationLib` interface + `zodLib` / `valibotLib` / `resolveLib` |
