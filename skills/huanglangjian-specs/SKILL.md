---
name: huanglangjian-specs
description: "Type-safe API specification toolkit — define models, routes, security; generate OpenAPI 3.2 and JSON Schema 2020-12."
---

# @huanglangjian/specs

Define HTTP APIs declaratively with composable type models. Generates OpenAPI 3.2 documents, JSON Schema (Draft 2020-12), and a shared codegen IR for building code generators.

## When to use

- Define API models or routes using `@huanglangjian/specs`
- Generate OpenAPI specification documents
- Generate JSON Schema files
- Work with security schemes (API Key, OpenID Connect)
- Build code generators using the shared IR (OperationDescriptor, SchemaMap, collect*)
- Any task involving `@huanglangjian/specs` or this monorepo

## Installation

```bash
pnpm add @huanglangjian/specs
```

ESM-only. All exports re-exported from the barrel index.

## Core concepts

Three layers: **Models** → **Routes** → **Generators**.

All models have typed factory functions. When unclear about options or signatures, consult the source files directly — `types.ts` and `api.ts` are the single source of truth (see [Source map](./references/source-map.md)).

Key factories: `int32`, `string`, `boolean`, `datetime`, `record`, `enums`, `union`, `taggedUnion`, `literal`, `nullLike`, `array`, `set`, `map`, `route`, `json`, `binary`, `sseStream`, `jsonStream`, `routerModel`.

`record`, `enums`, `union`, `taggedUnion` require an `id` — they become named schemas in `#/components/schemas` or `#/$defs`.

`routerModel({ name, routes, basePath? })` groups routes. `name` is automatically used as the OpenAPI tag for every operation — do **not** set `tags` on individual routes unless you need additional tags.

## References

- [Model kinds](./references/model-kinds.md)
- [API reference](./references/api-reference.md)
- [Security](./references/security.md)
- [Usage example](./references/usage-example.md)
- [Patterns & best practices](./references/patterns.md)
- [Source map](./references/source-map.md)
