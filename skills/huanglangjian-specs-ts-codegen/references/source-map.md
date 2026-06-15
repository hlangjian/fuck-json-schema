# Source map

| File | Purpose |
|---|---|
| `src/index.ts` | Barrel re-exports |
| `src/server.ts` | `generateTsServer()` — server handler codegen with config generation |
| `src/client.ts` | `generateTsClient()` — fetch-based client codegen |
| `src/shared.ts` | TS/Zod shared internals: `generateModels`, `toZod`, `toTs`, `optionalDefault` |
