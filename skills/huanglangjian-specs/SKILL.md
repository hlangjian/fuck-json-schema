---
name: huanglangjian-specs
description: "Define API models, routes, and security; generate OpenAPI 3.2 and JSON Schema 2020-12."
---

# @huanglangjian/specs

## Workflow

1. Check [Model kinds](./references/model-kinds.md) for available types and factory signatures.
2. Define data models with factory functions (`record`, `enums`, `union`, `taggedUnion`, etc.).
3. Group routes with `router({ id, routes, tag?, basePath?, description? })`.
4. Call `generateOpenapi()` or `generateJsonSchema()` to produce output.
5. Use `collectNamedModels()` / `collectOperations()` / `collectSchemaMap()` for custom codegen.

## Key constraints

- `record`, `enums`, `union`, `taggedUnion` must have an `id` — they become named schemas.
- `router` generates an OpenAPI tag from `tag ?? id`. Do NOT set `tags` on individual routes unless extra tags are needed.
- Never write raw `{ kind: "..." }` objects — always use factory functions.
- Refer to source files (`types.ts`, `api.ts`) for definitive signatures.

## References

- [Model kinds](./references/model-kinds.md)
- [API reference](./references/api-reference.md)
- [Security](./references/security.md)
- [Usage example](./references/usage-example.md)
- [Patterns & best practices](./references/patterns.md)
- [Source map](./references/source-map.md)
