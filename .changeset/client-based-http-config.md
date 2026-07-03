---
"@huanglangjian/specs-ts-codegen": minor
---

Redesign TypeScript client generation with Client-based HTTP configuration:
- Add `client.ts` with `Client` interface, `ClientConfig`, and `createClient()` factory — zero runtime dependencies, no global state
- Operations now accept optional `client?: Client` instead of `baseUrl?: string`, enabling tree-shakeable per-operation imports with shared client configuration
- Each operation file now exports a standalone `getXxxUrl()` URL builder and a named `Params` type
- Client supports static/dynamic `headers` (for token refresh) and custom `fetch` override
- Backward compatible: operations work without client using `globalThis.fetch` and relative URLs
