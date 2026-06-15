---
"@huanglangjian/specs": minor
---

refactor: replace mergeJsonSchemas with auto-discovering generateJsonSchema

- `mergeJsonSchemas` removed — replaced by `generateJsonSchema(model)` which auto-discovers named sub-models
- `buildJsonSchema` (internal) replaces old single-model `generateJsonSchema` with `toJsonSchema` callback for library-specific JSON Schema generation
- `SchemaRegistry` gains `getDefs()` to collect registered model schemas
- Chinese JSDoc on `toJsonSchema` explaining StandardTypedV1 / StandardSchemaV1 / StandardJSONSchemaV1 bridge
