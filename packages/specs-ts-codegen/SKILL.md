---
name: huanglangjian-specs-ts-codegen
description: |
  TypeScript code generator for @huanglangjian/specs. Generates framework-agnostic
  server handler stubs and fetch-based TypeScript client SDKs from API spec
  definitions. Use when generating TypeScript server handlers, client code,
  or Zod-validated route wrappers from @huanglangjian/specs model definitions.
---

## When to use me

Use this skill when the user asks to:
- Generate server handler code from `@huanglangjian/specs` route definitions
- Generate TypeScript fetch-based client SDKs
- Generate Zod-validated route wrappers (`(Request, params?) => Response`)
- Work with the `@huanglangjian/specs-ts-codegen` package

## Installation

```bash
pnpm add @huanglangjian/specs-ts-codegen
```

Requires `@huanglangjian/specs` as a peer dependency.

## API Reference

### `generateTsServer(options)` → `Record<string, string>`

Generates framework-agnostic server handler source files. Handlers use standard Web APIs (`Request` / `Response`).

```ts
interface TsServerOptions {
  routers: RouterModel[]
  identifier?: (id: string) => string    // default: pascalCase
  namespace?: string
  configuration?: RecordModel            // server config for env-var generation
}
```

Output files:

| File | Content |
|------|---------|
| `models.ts` | Zod schemas + TypeScript interfaces for all named models |
| `{group}/{id}.ts` | Per-operation: `XxxOperation` namespace (Request/Response/Handler types), Zod validation, precompiled URLPattern for path params |
| `index.ts` | `XxxHandlers` interfaces + `createXxxRouter()` factory functions per router group |
| `config.ts` | (if `configuration` provided) Pure Zod runtime config with env parameterization, taggedUnion/union resolution |

Handler signature:
```
(request: Request, params?: Record<string, string>) => Promise<Response>
```

- `params` is optional — when not provided, path variables are auto-extracted via precompiled `URLPattern`
- Query params: `Object.fromEntries(new URL(request.url).searchParams)`
- Headers: `request.headers.get("name")`
- Body: `await request.json()`

### `generateTsClient(options)` → `Record<string, string>`

Generates TypeScript fetch-based client SDK.

```ts
interface TsClientOptions {
  routers: RouterModel[]
  identifier?: (id: string) => string    // default: pascalCase
  namespace?: string
}
```

Output files:

| File | Content |
|------|---------|
| `models.ts` | Zod schemas + TypeScript interfaces |
| `{group}/{id}.ts` | Per-operation: `XxxOperation` namespace (Request/Response types), async function with fetch + Zod response validation |
| `index.ts` | Barrel re-exports grouped by router name |

## Usage Example

```ts
import { generateTsServer, generateTsClient } from "@huanglangjian/specs-ts-codegen"
import type { RouterModel } from "@huanglangjian/specs"

// Assuming routers are already defined via @huanglangjian/specs
const routers: RouterModel[] = [...]

// Generate server handlers
const serverFiles = generateTsServer({
  routers,
  configuration: ServerConfig,  // optional env config
})
// → { "models.ts": "...", "warehouses/createWarehouse.ts": "...", "index.ts": "...", "config.ts": "..." }

// Generate client SDK
const clientFiles = generateTsClient({ routers })
// → { "models.ts": "...", "warehouses/createWarehouse.ts": "...", "index.ts": "..." }

// Wire into any framework:
// Hono: app.on(def.method, def.path, (c) => def.handler(c.req.raw, c.req.param()))
// Bun:  serve({ fetch: (req) => def.handler(req) })
// Deno: serve((req) => def.handler(req))
```

## Architecture

```
@huanglangjian/specs                  ← Model definitions + OpenAPI/JSON Schema + codegen IR + utilities
@huanglangjian/specs-ts-codegen       ← TypeScript code generator (this package)
```

## Source Map

| File | Purpose |
|------|---------|
| `src/index.ts` | Barrel re-exports |
| `src/server.ts` | `generateTsServer()` — server handler codegen with config generation |
| `src/client.ts` | `generateTsClient()` — fetch-based client codegen |
| `src/shared.ts` | TS/Zod shared internals: `generateModels`, `toZod`, `toTs`, `optionalDefault` |

## Patterns & Best Practices

1. **Handler signature** is `(request: Request, params?: Record<string, string>) => Promise<Response>`. All validation uses standard Web APIs — no framework dependency.
2. **Namespace isolation**: Each operation's types are wrapped in `${Op}Operation` namespace to avoid collisions with model types from `models.ts`.
3. **URLPattern precompilation**: For routes with path variables, a `export const opNamePattern` is emitted at module level. `exec()` is called per-request only when `params` is not provided.
4. **Configuration generation** supports nested `record`, `taggedUnion`, `union`, `array`, `set`, and `enums`. Uses pure Zod with env parameterization (`getConfig(env = process.env)`).
5. **Router factory functions**: `createWarehousesRouter(handlers)` wraps all per-operation handlers and returns an array of `{ method, path, handler }` objects.
