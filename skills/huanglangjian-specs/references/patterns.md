# Patterns & best practices

## Structure

1. **Optional fields** are specified via `optional` — a string array of property keys. Properties not in `optional` are required; if `optional` is omitted, every property is required.
2. **Path parameters** use `{name}` syntax and are declared in `variables`. Path param types are restricted to `SimpleType` (primitives). If `variables` is omitted, each `{name}` defaults to `string()`.
3. **Security**: path patterns are regex. If `methods` is not set on a `SecurityPolicyPathItem`, the pipeline applies to all HTTP methods.
4. **The `schema` field** on a model accepts a [StandardSchema](https://standardschema.dev/) validator. When provided, `InferModel<T>` extracts its output type.
5. **The `default` field** on a model holds a default value of the model's inferred type. It is consumed by the TypeScript code generators (`@huanglangjian/specs-ts-codegen`); it does NOT reach OpenAPI/JSON Schema output, which only picks up defaults carried on the model's `schema` and surfaced via a `toJsonSchema` adapter.
6. **Use the `router()` factory** instead of plain object literals for `RouterModel`.

> `id` requirements, `taggedUnion`/`union` mapping rules live in [model-kinds.md](./model-kinds.md); tag behavior lives in [api-reference.md](./api-reference.md); field text/title/description rules live in [writing-guide.md](./writing-guide.md).
