---
name: huanglangjian-specs-ts-codegen
description: "TypeScript server stubs and fetch-based client SDKs. Use when scaffolding server handlers, generating a typed fetch client, or producing config.ts env-var parsing — given a RouterModel[] from @huanglangjian/specs."
---

# @huanglangjian/specs-ts-codegen

Supports Zod (default) and Valibot validation.

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
