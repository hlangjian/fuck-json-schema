# API reference

## `generateTsServer(options)` → `Record<string, string>`

Generates framework-agnostic server handler source files. Handlers use standard Web APIs (`Request` / `Response`).

```ts
interface TsServerOptions {
  routers: RouterModel[]
  identifier?: (id: string) => string       // default: pascalCase
  namespace?: string
  configuration?: RecordModel               // server config for env-var generation
  models?: Models[]                         // extra named models not referenced by any route
  validationLib?: "zod" | "valibot"         // default: "zod"
}
```

### Output files

| File | Content |
|---|---|
| `models.ts` | Validation schemas (Zod or Valibot) + TypeScript interfaces for all named models (including config) |
| `{group}/{id}.ts` | Per-operation: `XxxOperation` namespace (Request/Response/Handler types), schema validation, URLPattern |
| `index.ts` | `XxxHandlers` interfaces + `createXxxRouter()` factory functions per router group |
| `config.ts` | (if `configuration` provided) Schema-validated runtime config with env parameterization, taggedUnion/union resolution |

### Handler signature

```
(request: Request, params?: Record<string, string>) => Promise<Response>
```

Satisfy this contract when wiring a generated `{ method, path, handler }` into a runtime. Pass `params` when your framework supplies path variables (e.g. Hono `c.req.param()`), or omit it to let the handler match them from the request URL. A handler with path variables returns `404` on a URL mismatch — it does not fall through. The handler validates request input and builds the `Response` internally; read the emitted file or `src/server.ts` for those specifics.

## `generateTsClient(options)` → `Record<string, string>`

Generates TypeScript fetch-based client SDK.

```ts
interface TsClientOptions {
  routers: RouterModel[]
  identifier?: (id: string) => string       // default: pascalCase
  namespace?: string
  models?: Models[]                         // extra named models not referenced by any route
  validationLib?: "zod" | "valibot"         // default: "zod"
}
```

### Output files

| File | Content |
|---|---|
| `models.ts` | Validation schemas (Zod or Valibot) + TypeScript interfaces |
| `{group}/{id}.ts` | Per-operation: `XxxOperation` namespace (Request/Response types), async function returning `Promise<XxxOperation.Response>` — a discriminated union keyed by `status` with `as const` literals. All defined response statuses are handled as typed variants via `switch`/`case`, including schema-validated body for non-stream responses. Undefined statuses throw `Error` in the `default` branch. |
| `index.ts` | Barrel re-exports grouped by router name |

Array/set query params are serialized as repeated keys (`?k=a&k=b`).
