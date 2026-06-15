# Patterns & best practices

1. **Always give `record` an `id`** — it becomes the schema name in OpenAPI `components/schemas`.
2. **Optional fields** are specified via `optional` — a string array of property keys. All properties not in `optional` are treated as required. If `optional` is omitted, every property is required.
3. **`taggedUnion` discriminator**: `discriminator` is the field name. Each variant's `RecordModel` must include this field as a required `literal(variantKey)`.
4. **`union` wrapping**: each variant is wrapped in `{ [variantName]: variantSchema }` in JSON Schema.
5. **Path parameters** use `{name}` syntax and are declared in `variables`. Path param types are restricted to `SimpleType` (primitives).
6. **Security**: path patterns are regex. If `methods` is not set on a `SecurityPolicyPathItem`, the pipeline applies to all HTTP methods.
7. **The `schema` field** on models accepts a [StandardSchema](https://standardschema.dev/) validator. When provided, `InferModel<T>` extracts the output type.
8. **The `default` field** on any model accepts a default value of the model's inferred type. When used on non-required record fields, generates `.optional().default(value)` in Zod schema output.
9. **Tags**: `RouterModel.name` is automatically appended as an OpenAPI tag. Only set `tags` on `route()` for additional tags beyond the router name.
10. **Use `routerModel()` factory** instead of plain object literals for RouterModel. Creates a `RouterModel` from `{ name, routes, basePath? }`.
