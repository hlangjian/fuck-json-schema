# API reference

## Route definition

```ts
route({
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS" | "HEAD" | "TRACE",
  path: "/warehouses/{id}",
  variables?: Record<string, SimpleType>,  // path parameters
  body?: Models,                           // request body
  queries?: RecordModel<...>,              // query parameters
  headers?: RecordModel<...>,              // request headers
  responses: Record<string, ResponseModel>,  // status code -> response
  tags?: string[],                         // auto-populated from RouterModel.name, only set for extra tags
  summary?: string,
  description?: string,
  contentType?: string,
})
```

Response types:
- `json({ body?, headers?, summary? })` — `application/json`
- `jsonStream({ body?, headers?, summary? })` — streaming JSON (`application/x-ndjson`)
- `sseStream({ body?, headers?, summary? })` — Server-Sent Events
- `binary({ headers?, summary?, contentType? })` — binary response

## Router grouping

```ts
import { routerModel } from "@huanglangjian/specs"

const router = routerModel({
  name: "Warehouses",
  basePath: "/api/v1",   // optional
  routes: { myRoute, anotherRoute, ... },
})
```

## `generateOpenapi(options)` → `{ openapi, registry }`

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
  toJsonSchema?: (type?: import("@standard-schema/spec").StandardTypedV1) => JsonSchemaObject
                                         // library-specific adapter to extract schema metadata
}
```

When `toJsonSchema` is provided, it converts the `schema` (e.g. `z.int32().default(0)`) attached to each model into JSON Schema fields (`default`, `format`, `pattern`, `minimum`, etc.) that are merged into the output. Use a library-specific adapter:

```ts
// zod
import { zodToJsonSchema } from "zod-to-json-schema"
toJsonSchema: (schema) => zodToJsonSchema(schema as any)

// valibot
import { toJsonSchema as vbToJson } from "@valibot/to-json-schema"
toJsonSchema: (schema) => vbToJson(schema as any)
```

Without `toJsonSchema`, only the model-level defaults (e.g. `int32({ default: 0 })`) appear in the output; Zod/Valibot schema metadata is ignored.

Automatically collects all named models from route bodies/responses, generates `components/schemas`, path items, operations, parameters (path/query/header), request bodies, and responses. If `security.policy` is provided, generates `components/securitySchemes` and injects per-operation `security` requirements based on path pattern matching.

## `generateJsonSchema(model, options?)` → `JsonSchemaObject`

Generate a complete JSON Schema (Draft 2020-12) for the given model. Named sub-models (record, enums, union, taggedUnion with `id`) are automatically discovered and placed in `$defs`.

```ts
const schema = generateJsonSchema(ServerConfig)
// → { $schema: "...", type: "object", properties: { database: { $ref: "#/$defs/DatabaseConfig" } }, $defs: { PostgresConfig: {...}, ... } }

// With toJsonSchema adapter to extract field-level metadata
const schema = generateJsonSchema(ServerConfig, {
  toJsonSchema: (schema) => zodToJsonSchema(schema as any),
})
```

## Registry factories

Two registry factories for advanced use:
- `createJsonSchemaRegistry()` — `$ref` paths use `#/$defs/`
- `createOpenapiSchemaRegistry()` — `$ref` paths use `#/components/schemas/`

The `SchemaRegistry` is immutable; `.add(id, model)` returns a new registry.

## Codegen IR functions

### `collectNamedModels(models, options?)` → `AnyNamedDescriptor[]`

Collects named descriptors (record, enums, union, taggedUnion) from an array of models.

### `collectOperations(routers)` → `OperationDescriptor[]`

Flattens all routers into operation descriptors with extracted path variables, queries, headers, request models, and responses.

### `collectSchemaMap(operations)` → `SchemaMap`

Builds a schema lookup map from collected operations for codegen.

### `topologicalSortSchemaMap(schemaMap)` → `[string, SchemaInfo][]`

Topologically sorts schema map entries so dependencies come before dependents.

### `resolveNamedRoot(model)` → `{ id: string } | null`

Finds the root named model through wrapper types (array/set/map).
