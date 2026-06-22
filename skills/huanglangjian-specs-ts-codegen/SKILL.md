---
name: huanglangjian-specs-ts-codegen
description: "Generate TypeScript server stubs and fetch-based client SDKs from @huanglangjian/specs route definitions."
---

# @huanglangjian/specs-ts-codegen

Generates framework-agnostic server handlers and fetch-based clients in TypeScript. Supports Zod (default) and Valibot validation.

## Workflow

1. Define routes with `@huanglangjian/specs` → produce `RouterModel[]`.
2. Call `generateTsServer({ routers, configuration?, validationLib? })` for server stubs.
3. Call `generateTsClient({ routers, validationLib? })` for client SDK.
4. Wire generated `{ method, path, handler }` objects into any framework (Hono, Bun, Deno).

## Key constraints

- Handler signature: `(request: Request, params?: Record<string, string>) => Promise<Response>`.
- `configuration` generates `config.ts` with env-var schema parsing.
- Extra named models not referenced by routes: pass via `models` option.

## References

- [API reference](./references/api-reference.md)
- [Usage example](./references/usage-example.md)
- [Patterns & best practices](./references/patterns.md)
- [Source map](./references/source-map.md)
