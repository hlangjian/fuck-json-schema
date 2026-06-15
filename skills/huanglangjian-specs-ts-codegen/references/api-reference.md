# API reference

## `generateTsServer(options)` → `Record<string, string>`

Generates framework-agnostic server handler source files. Handlers use standard Web APIs (`Request` / `Response`).

```ts
interface TsServerOptions {
  routers: RouterModel[]
  identifier?: (id: string) => string    // default: pascalCase
  namespace?: string
  configuration?: RecordModel            // server config for env-var generation
}
```

### Output files

| File | Content |
|---|---|
| `models.ts` | Zod schemas + TypeScript interfaces for all named models (including config) |
| `{group}/{id}.ts` | Per-operation: `XxxOperation` namespace (Request/Response/Handler types), Zod validation, URLPattern |
| `index.ts` | `XxxHandlers` interfaces + `createXxxRouter()` factory functions per router group |
| `config.ts` | (if `configuration` provided) Pure Zod runtime config with env parameterization, taggedUnion/union resolution |

### Handler signature

```
(request: Request, params?: Record<string, string>) => Promise<Response>
```

- `params` is optional — when not provided, path variables are auto-extracted via precompiled `URLPattern`
- Query params: `Object.fromEntries(new URL(request.url).searchParams)`
- Headers: `request.headers.get("name")`
- Body: `await request.json()`

## `generateTsClient(options)` → `Record<string, string>`

Generates TypeScript fetch-based client SDK.

```ts
interface TsClientOptions {
  routers: RouterModel[]
  identifier?: (id: string) => string    // default: pascalCase
  namespace?: string
}
```

### Output files

| File | Content |
|---|---|
| `models.ts` | Zod schemas + TypeScript interfaces |
| `{group}/{id}.ts` | Per-operation: `XxxOperation` namespace (Request/Response types), async function with fetch + Zod response validation |
| `index.ts` | Barrel re-exports grouped by router name |
