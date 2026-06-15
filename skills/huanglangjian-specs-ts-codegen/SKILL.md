---
name: huanglangjian-specs-ts-codegen
description: "TypeScript code generator for @huanglangjian/specs — server handler stubs, fetch-based client SDKs, Zod-validated route wrappers."
---

# @huanglangjian/specs-ts-codegen

Generates framework-agnostic TypeScript server handler stubs and fetch-based client SDKs from `@huanglangjian/specs` API definitions.

## When to use

- Generate server handler code from `@huanglangjian/specs` route definitions
- Generate TypeScript fetch-based client SDKs
- Generate Zod-validated route wrappers (`(Request, params?) => Response`)
- Work with the `@huanglangjian/specs-ts-codegen` package

## Installation

```bash
pnpm add @huanglangjian/specs-ts-codegen
```

Requires `@huanglangjian/specs` as a peer dependency.

## Core concepts

Two generators:

**`generateTsServer(options)`** — server handler stubs. Outputs per-operation files with Zod validation, URLPattern precompilation, and `{group}Handlers` interfaces + `create{group}Router()` factory functions. Optional `configuration` field generates `config.ts` with env-var Zod schemas and config type in `models.ts`.

**`generateTsClient(options)`** — fetch-based client SDK. Outputs per-operation async functions with Zod response validation and group-based barrel re-exports.

Handler signature uses standard Web APIs:
```
(request: Request, params?: Record<string, string>) => Promise<Response>
```

## References

- [API reference](./references/api-reference.md)
- [Usage example](./references/usage-example.md)
- [Patterns & best practices](./references/patterns.md)
- [Source map](./references/source-map.md)
