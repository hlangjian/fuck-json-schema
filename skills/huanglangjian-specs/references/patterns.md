# Patterns & best practices

1. **Always give `record` an `id`** — it becomes the schema name in OpenAPI `components/schemas`.
2. **Optional fields** are specified via `optional` — a string array of property keys. All properties not in `optional` are treated as required. If `optional` is omitted, every property is required.
3. **`taggedUnion` discriminator**: `discriminator` is the field name. Each variant's `RecordModel` must include this field as a required `literal(variantKey)`.
4. **`union` wrapping**: each variant is wrapped in `{ [variantName]: variantSchema }` in JSON Schema.
5. **Path parameters** use `{name}` syntax and are declared in `variables`. Path param types are restricted to `SimpleType` (primitives).
6. **Security**: path patterns are regex. If `methods` is not set on a `SecurityPolicyPathItem`, the pipeline applies to all HTTP methods.
7. **The `schema` field** on models accepts a [StandardSchema](https://standardschema.dev/) validator. When provided, `InferModel<T>` extracts the output type.
8. **The `default` field** on any model accepts a default value of the model's inferred type. When used on non-required record fields, generates `.optional().default(value)` in Zod schema output.
9. **Tags**: `RouterModel.id` is automatically appended as an OpenAPI tag. If `tag` is set on the router, it is used as the tag name instead of `id`. Only set `tags` on `route()` for additional tags beyond the router tag.
10. **Use `router()` factory** instead of plain object literals for RouterModel. Creates a `RouterModel` from `{ id, routes, tag?, basePath?, description? }`.
11. **Prefer metadata fields over code comments**: use `title`, `description`, `summary`, `deprecated` to document models, fields, and routes. These fields drive JSDoc, OpenAPI, and JSON Schema output. Code comments (`//` or `/* */`) are invisible to consumers and should be reserved for structural grouping or internal notes only.
12. **Create models via factory functions only** — never raw `{ kind: "..." }` objects or JSON Schema notation (`{ type: "string" }`). The factories are the single source of truth for valid model shapes.
13. **Consult the source when unsure**: read `types.ts` for data model options/signatures, `api.ts` for routes and responses. They are definitive — not the docs.
