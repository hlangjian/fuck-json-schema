---
"@huanglangjian/specs-ts-codegen": minor
---

feat: add optional models parameter to generator options

- `TsServerOptions.models` and `TsClientOptions.models` accept free models not referenced by any route
- `addModelsToSchemaMap()` in `shared.ts` walks model trees and registers named sub-models into schemaMap
- Removed old single-model `addConfigToSchemaMap`; configuration injection now also uses the new helper
