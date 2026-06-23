# Source map

| File | Purpose |
|---|---|
| `src/index.ts` | Barrel re-exports |
| `src/types.ts` | All model types (`Models` union) and 18 factory functions |
| `src/api.ts` | Route, response (json/binary/stream/sse), RouterModel, router(), HTTP method type |
| `src/security.ts` | `apikey()`, `openIdConnect()`, `SecurityPolicyModel` |
| `src/deployment.ts` | `deployOpenIdConnect()`, `OpenIdDeployment` |
| `src/generate-jsonschema.ts` | `generateJsonSchema()`, `buildJsonSchema()`, `SchemaRegistry`, `createJsonSchemaRegistry()`, `createOpenapiSchemaRegistry()` |
| `src/generate-openapi.ts` | `generateOpenapi()` — the main OpenAPI 3.2 generator |
| `src/generate-openapi.test.ts` | Vitest tests for JSON Schema and OpenAPI generation |
| `src/test.ts` | Complete demo script exercising all generators (run via `tsx src/test.ts`) |
| `src/codegen/descriptors.ts` | Shared descriptor types (OperationDescriptor, SchemaMap, etc.) |
| `src/codegen/collect.ts` | `collectNamedModels()`, `collectOperations()`, `collectSchemaMap()`, `resolveNamedRoot()`, `topologicalSortSchemaMap()` |
| `src/schemas/json-schema-draft-2020-12.ts` | TypeScript types for JSON Schema Draft 2020-12 |
| `src/schemas/json-schema-draft-07.ts` | TypeScript types for JSON Schema Draft-07 |
| `src/schemas/openapi-schema.ts` | TypeScript types for OpenAPI 3.x |
| `src/schemas/schema-variants.ts` | Variant schema types |
| `src/utils/index.ts` | Utilities: `ExtractPathParams`, merge, path handling |
| `output/` | Generated example output |
