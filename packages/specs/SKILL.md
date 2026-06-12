---
name: huanglangjian-specs
description: |
  Type-safe API specification toolkit (@huanglangjian/specs). Define HTTP APIs
  declaratively with composable type models, then generate OpenAPI 3.2 documents,
  JSON Schema (Draft 2020-12), Hono server stubs with Zod validation, and
  TypeScript fetch-based client code. Use when working with @huanglangjian/specs,
  defining API specs, generating OpenAPI/JSON Schema, server stubs, or client SDKs
  from model definitions.
---

## When to use me

Use this skill when the user asks to:
- Define API models or routes using `@huanglangjian/specs`
- Generate OpenAPI specification documents
- Generate JSON Schema files
- Generate Hono server code (routes, handlers, types, config)
- Generate TypeScript client code
- Work with security schemes (API Key, OpenID Connect)
- Any task involving `@huanglangjian/specs` or this monorepo

## Installation

```bash
pnpm add @huanglangjian/specs
```

The package is ESM-only. All exports are re-exported from the barrel index.

## Core Concepts

There are three layers:

1. **Models** (`types.ts`) — composable type definitions (int32, string, record, taggedUnion, etc.)
2. **Routes** (`api.ts`) — HTTP route definitions with method, path, parameters, and responses
3. **Generators** — consume models + routes to produce artifacts

Every model is a plain object with a `kind` discriminator. All models support optional `title`, `description`, `examples`, and `schema` (a [StandardSchema](https://standardschema.dev/) validator for runtime type inference).

### Model kinds

| Kind | Factory | OpenAPI/JSON Schema mapping |
|------|---------|---------------------------|
| `int32` | `int32(opts?)` | `type: "integer", format: "int32"` |
| `float32` | `float32(opts?)` | `type: "number", format: "float"` |
| `float64` | `float64(opts?)` | `type: "number", format: "float"` |
| `boolean` | `boolean(opts?)` | `type: "boolean"` |
| `string` | `string(opts?)` | `type: "string"` |
| `datetime` | `datetime(opts?)` | `type: "string", format: "date-time"` |
| `date` | `date(opts?)` | `type: "string", format: "date"` |
| `duration` | `duration(opts?)` | `type: "string", format: "duration"` |
| `literal` | `literal(value)` | `const: value` |
| `null` | `nullLike()` | `type: "null"` |
| `array` | `array({ base: T, ... })` | `type: "array", items: T` |
| `set` | `set({ base: T, ... })` | `type: "array", uniqueItems: true` |
| `map` | `map({ base: T, ... })` | `type: "object", additionalProperties: T` |
| `record` | `record({ id, properties, optional?, ... })` | `type: "object"` with `$ref` to named schema |
| `enums` | `enums({ id, variants: {...}, ... })` | `type: "string", enum: [...]` |
| `union` | `union({ id, variants: {...}, ... })` | `oneOf` with variant-key wrapper |
| `taggedUnion` | `taggedUnion({ id, discriminator, variants, ... })` | `oneOf` with discriminator embedded in variant schemas |

Key rules:
- `record`, `enums`, `union`, `taggedUnion` **require an `id`** — they become named schemas in `#/components/schemas` or `#/$defs`.
- `taggedUnion` uses `discriminator` to specify which field acts as the discriminator. Each variant's `RecordModel` must include that field as a required `literal(value)` where the value matches the variant key.
- `union` wraps each variant in `{ [variantName]: variantSchema }`.
- `set` generates `uniqueItems: true` in JSON Schema; in codegen it emits `z.array()` for Zod (runtime dedup is expected).

### Route definition

```ts
route({
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS" | "HEAD" | "TRACE",
  path: "/warehouses/{id}",
  variables?: Record<string, SimpleType>,  // path parameters
  body?: Models,                           // request body
  queries?: RecordModel<...>,              // query parameters
  headers?: RecordModel<...>,              // request headers
  responses: Record<string, ResponseModel>,  // status code -> response
  tags?: string[],
  summary?: string,
  description?: string,
  contentType?: string,
})
```

Response types:
- `json({ body?, headers?, summary? })` — `application/json`
- `jsonStream({ body?, headers?, summary? })` — streaming JSON (e.g. `application/x-ndjson`)
- `sseStream({ body?, headers?, summary? })` — Server-Sent Events
- `binary({ headers?, summary?, contentType? })` — binary response

Router grouping:
```ts
const router: RouterModel = {
  name: "Warehouses",
  basePath?: "/api/v1",
  routes: { myRoute, anotherRoute, ... }
}
```

### Security

Two security component types, both also implement `SecurityAppliable` (has `.apply()` method):

```ts
const apiKeyAuth = apikey({ id: "xApiKey", name: "X-API-Key", description: "..." })
const oidc = openIdConnect({ id: "keycloak", scopes: ["read:warehouses"], description: "..." })
```

Define a security policy that maps regex path patterns to security pipelines:
```ts
const policy: SecurityPolicyModel = {
  name: "default",
  paths: {
    "^/warehouses$": {
      pipeline: [apiKeyAuth.apply(), oidc.apply("read:warehouses")],
    },
    "^/warehouses/": {
      methods: ["GET", "POST", "PUT", "DELETE"],  // restrict to specific HTTP methods
      pipeline: [apiKeyAuth.apply()],
    },
  },
}
```

Deployments (for OpenID Connect, required to generate OpenAPI security schemes):
```ts
const keycloakDep = deployOpenIdConnect({ component: oidc, issuer: "https://keycloak.example.com" })
```

## API Reference

### `generateOpenapi(options)` → `{ openapi, registry }`

Generates a full OpenAPI 3.2.0 document.

```ts
interface GenerateOpenapiOptions {
  info: InfoObject                       // { title, version, description?, ... }
  servers?: ServerObject[]               // [{ url, description? }]
  routers: RouterModel[]                 // array of router definitions
  security?: {
    policy?: SecurityPolicyModel
    deployments?: Record<string, SecurityDeployment>  // keyed by component id
  }
}
```

Automatically collects all named models from route bodies/responses, generates `components/schemas`, path items, operations, parameters (path/query/header), request bodies, and responses. If `security.policy` is provided, generates `components/securitySchemes` and injects per-operation `security` requirements based on path pattern matching.

### `generateJsonSchema(options)` → `{ jsonSchema, registry }`

Converts a single model to JSON Schema (Draft 2020-12).

```ts
interface GenerateJsonSchemaOptions {
  model: Models
  registry?: SchemaRegistry
  toJsonSchema?: (type?: StandardTypedV1) => JsonSchemaObject
}
```

Two registry factories:
- `createJsonSchemaRegistry()` — `$ref` paths use `#/$defs/`
- `createOpenapiSchemaRegistry()` — `$ref` paths use `#/components/schemas/`

The `SchemaRegistry` is immutable; `.add(id, model)` returns a new registry.

### `mergeJsonSchemas(schemas)` → `JsonSchemaObject`

Merges multiple named models into a single JSON Schema with `$defs`.

```ts
const schema = mergeJsonSchemas({
  ServerConfig: serverConfigRecord,
  PostgresConfig: postgresRecord,
})
// → { $schema: "...draft-2020-12", $defs: { ServerConfig: {...}, PostgresConfig: {...} } }
```

### `generateHonoServer(options)` → `Record<string, string>`

Generates Hono server source files (filenames → content).

```ts
interface HonoServerOptions {
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
| `{camelCase(id)}.ts` | Per-operation: Request/Response types, Handler type, wrapper function with Zod validation |
| `index.ts` | `mountRoutes(app, handlers)` wiring function |
| `config.ts` | (if `configuration` provided) t3-env + Zod runtime config with recursive taggedUnion/union resolution |

Generated handler wrapper parses path params, query, headers, and body with Zod, dispatches to the handler, then serializes responses. Supports json-response, stream-response, sse-response, and binary responses.

Configuration generation:
- Primitive fields → environment variables with `snake_case` naming
- `record` → nested object
- `taggedUnion` → `switch` statement based on discriminator env var, with per-variant sub-configs resolved directly (discriminator field is part of each variant's own properties)
- `union` → same as taggedUnion but uses `_TYPE` suffix for the discriminator env var
- `array`/`set` → comma-separated env var with Zod transform (only simple element types)

### `generateTsClient(options)` → `Record<string, string>`

Generates TypeScript fetch-based client code.

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
| `{camelCase(id)}.ts` | Per-operation: async function with fetch + Zod response validation |
| `index.ts` | Barrel re-exports grouped by router name |

### `collectNamedModels(models, options?)` → `AnyNamedDescriptor[]`

Collects named descriptors (record, enums, union, taggedUnion) from an array of models.

### `collectOperations(routers)` → `OperationDescriptor[]`

Flattens all routers into operation descriptors with extracted path variables, queries, headers, request models, and responses.

### `collectSchemaMap(operations)` → `SchemaMap`

Builds a schema lookup map from collected operations for codegen.

## Usage Example

Complete warehouse CRUD example:

```ts
import { int32, string, datetime, array, record, enums, set, literal, taggedUnion, union } from "@huanglangjian/specs"
import { route, json, binary as binaryResponse } from "@huanglangjian/specs"
import { generateOpenapi } from "@huanglangjian/specs"
import { generateHonoServer } from "@huanglangjian/specs"
import { generateTsClient } from "@huanglangjian/specs"
import { mergeJsonSchemas } from "@huanglangjian/specs"
import { apikey, openIdConnect } from "@huanglangjian/specs"
import { deployOpenIdConnect } from "@huanglangjian/specs"

// 1. Define data models
const Warehouse = record({
  id: "Warehouse",
  title: "仓库",
  properties: {
    id: int32({ description: "仓库ID" }),
    name: string({ description: "仓库名称" }),
    location: string({ description: "仓库位置" }),
    capacity: int32({ description: "最大容量" }),
    createdAt: datetime({ description: "创建时间" }),
  },
})

const CreateWarehouse = record({
  id: "CreateWarehouse",
  properties: {
    name: string({ description: "仓库名称" }),
    location: string({ description: "仓库位置" }),
    capacity: int32({ description: "最大容量" }),
  },
})

const UpdateWarehouse = record({
  id: "UpdateWarehouse",
  properties: {
    name: string(),
    location: string(),
    capacity: int32(),
  },
})

const ErrorResponse = record({
  id: "ErrorResponse",
  properties: { message: string({ description: "错误信息" }) },
})

// 2. Define server config with complex types
const ServerConfig = record({
  id: "ServerConfig",
  properties: {
    port: int32({ description: "监听端口" }),
    host: string({ description: "监听地址" }),
    logLevel: enums({
      id: "LogLevel",
      variants: { debug: "debug", info: "info", warn: "warn", error: "error" },
    }),
    tags: array({ base: string() }),
    allowedPorts: set({ base: int32() }),
    database: taggedUnion({
      id: "DatabaseConfig",
      discriminator: "type",
      variants: {
        postgres: record({
          id: "PostgresConfig",
          properties: { type: literal("postgres"), host: string(), port: int32(), username: string(), password: string() },
        }),
        sqlite: record({
          id: "SqliteConfig",
          properties: { type: literal("sqlite"), name: string() },
        }),
      },
    }),
    cache: union({
      id: "CacheConfig",
      variants: {
        redis: record({ id: "RedisCache", properties: { url: string(), prefix: string() }, optional: ["prefix"] }),
        memory: record({ id: "MemoryCache", properties: { maxSize: int32(), ttl: int32() }, optional: ["ttl"] }),
      },
    }),
  },
  optional: ["logLevel", "tags", "allowedPorts", "cache"],
})

// 3. Define routes
const router = {
  listWarehouses: route({
    method: "GET",
    path: "/warehouses",
    summary: "获取仓库列表",
    responses: { "200": json({ summary: "仓库列表", body: array({ base: Warehouse }) }) },
  }),
  getWarehouse: route({
    method: "GET",
    path: "/warehouses/{id}",
    variables: { id: int32({ description: "仓库ID" }) },
    responses: {
      "200": json({ summary: "仓库详情", body: Warehouse }),
      "404": json({ summary: "仓库不存在", body: ErrorResponse }),
    },
  }),
  createWarehouse: route({
    method: "POST",
    path: "/warehouses",
    body: CreateWarehouse,
    responses: {
      "201": json({ summary: "创建成功", body: Warehouse }),
      "400": json({ summary: "请求参数错误", body: ErrorResponse }),
    },
  }),
  updateWarehouse: route({
    method: "PUT",
    path: "/warehouses/{id}",
    variables: { id: int32() },
    body: UpdateWarehouse,
    responses: {
      "200": json({ summary: "更新成功", body: Warehouse }),
      "404": json({ summary: "仓库不存在", body: ErrorResponse }),
    },
  }),
  deleteWarehouse: route({
    method: "DELETE",
    path: "/warehouses/{id}",
    variables: { id: int32() },
    responses: {
      "204": json({ summary: "删除成功" }),
      "404": json({ summary: "仓库不存在", body: ErrorResponse }),
    },
  }),
  exportWarehouses: route({
    method: "GET",
    path: "/warehouses/export",
    responses: { "200": binaryResponse({ summary: "导出文件" }) },
  }),
}

// 4. Security
const apiKeyAuth = apikey({ id: "xApiKey", name: "X-API-Key" })
const keycloak = openIdConnect({ id: "keycloak", scopes: ["read:warehouses", "write:warehouses"] })

const securityPolicy = {
  name: "default",
  paths: {
    "^/warehouses$": { pipeline: [apiKeyAuth.apply(), keycloak.apply("read:warehouses")] },
    "^/warehouses/": {
      methods: ["GET", "POST", "PUT", "DELETE"],
      pipeline: [apiKeyAuth.apply(), keycloak.apply("read:warehouses", "write:warehouses")],
    },
  },
}

const keycloakDeployment = deployOpenIdConnect({ component: keycloak, issuer: "https://keycloak.example.com" })

// 5. Generate OpenAPI spec
const { openapi } = generateOpenapi({
  info: { title: "Warehouse API", version: "1.0.0" },
  routers: [{ name: "Warehouses", routes: router }],
  security: { policy: securityPolicy, deployments: { keycloak: keycloakDeployment } },
})
// → write: JSON.stringify(openapi, null, 2)

// 6. Generate Hono server
const honoFiles = generateHonoServer({
  routers: [{ name: "Warehouses", routes: router }],
  configuration: ServerConfig,
})
// → honoFiles = { "models.ts": "...", "listWarehouses.ts": "...", "index.ts": "...", "config.ts": "...", ... }

// 7. Generate TypeScript client
const clientFiles = generateTsClient({
  routers: [{ name: "Warehouses", routes: router }],
})
// → clientFiles = { "models.ts": "...", "listWarehouses.ts": "...", "index.ts": "...", ... }

// 8. Generate server config JSON Schema
const configSchema = mergeJsonSchemas({
  ServerConfig, PostgresConfig, SqliteConfig,
  // ... all nested named records
})
// → JSON Schema with $schema + $defs
```

## Source Map

| File | Purpose |
|------|---------|
| `src/index.ts` | Barrel re-exports |
| `src/types.ts` | All model types (`Models` union) and 15 factory functions |
| `src/api.ts` | Route, response (json/binary/stream/sse), RouterModel, HTTP method type |
| `src/security.ts` | `apikey()`, `openIdConnect()`, `SecurityPolicyModel` |
| `src/deployment.ts` | `deployOpenIdConnect()`, `OpenIdDeployment` |
| `src/generate-jsonschema.ts` | `generateJsonSchema()`, `SchemaRegistry`, `createJsonSchemaRegistry()`, `createOpenapiSchemaRegistry()` |
| `src/generate-openapi.ts` | `generateOpenapi()` — the main OpenAPI 3.2 generator |
| `src/generate-openapi.test.ts` | Vitest tests for JSON Schema and OpenAPI generation |
| `src/test.ts` | Complete demo script exercising all generators (run via `tsx src/test.ts`) |
| `src/codegen/descriptors.ts` | Shared descriptor types (OperationDescriptor, ModelDescriptor, SchemaMap, etc.) |
| `src/codegen/collect.ts` | `collectNamedModels()`, `collectOperations()`, `collectSchemaMap()`, `resolveNamedRoot()` |
| `src/codegen/json-schema.ts` | `mergeJsonSchemas()` |
| `src/codegen/hono-server.ts` | `generateHonoServer()` — full Hono server codegen with config generation |
| `src/codegen/ts-client.ts` | `generateTsClient()` — TypeScript fetch client codegen |
| `src/schemas/json-schema-draft-2020-12.ts` | TypeScript types for JSON Schema Draft 2020-12 |
| `src/schemas/json-schema-draft-07.ts` | TypeScript types for JSON Schema Draft-07 |
| `src/schemas/openapi-schema.ts` | TypeScript types for OpenAPI 3.x |
| `src/schemas/schema-variants.ts` | Variant schema types |
| `src/utils/index.ts` | Utilities: `ExtractPathParams`, merge, path handling |
| `output/` | Generated example output (openapi.json, hono-server/, api-client/, server-config.schema.json) |

## Patterns & Best Practices

1. **Always give `record` an `id`** — it becomes the schema name in OpenAPI `components/schemas`.
2. **Optional fields** are specified via `optional` — a string array of property keys. All properties not in `optional` are treated as required (TypeScript non-optional, Zod non-optional). If `optional` is omitted entirely, every property is required.
3. **`taggedUnion` discriminator**: `discriminator` is the field name used as the discriminator. Each variant's `RecordModel` must include this field as a required `literal(variantKey)`, e.g., `type: literal("postgres")`.
4. **`union` wrapping**: each variant is wrapped in `{ [variantName]: variantSchema }` in JSON Schema.
5. **Path parameters** use `{name}` syntax and are declared in `variables`. Path param types are restricted to `SimpleType` (primitives).
6. **Security**: path patterns are regex. If `methods` is not set on a `SecurityPolicyPathItem`, the pipeline applies to all HTTP methods.
7. **Configuration generation** supports nested `record`, `taggedUnion`, `union`, `array`, `set`, and `enums`. `map` is not supported in config. For `array`/`set`, use comma-separated env vars.
8. **Content types**: response `contentType` defaults per response kind — `json` → `application/json`, `jsonStream` → `application/x-ndjson`, `sseStream` → `text/event-stream`, `binary` → `application/octet-stream`.
9. **The `schema` field** on models accepts a [StandardSchema](https://standardschema.dev/) validator. When provided, `InferModel<T>` extracts the output type. This enables full type inference from Zod/Valibot/etc. schemas.
10. **The `default` field** on any model accepts a default value of the model's inferred type. When used on non-required record fields, generates `.optional().default(value)` in Zod schema output. Required fields ignore `default`.
