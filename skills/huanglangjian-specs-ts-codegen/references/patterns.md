# Patterns & best practices

1. **Handler signature** is `(request: Request, params?: Record<string, string>) => Promise<Response>`. All validation uses standard Web APIs — no framework dependency.
2. **Namespace isolation**: Each operation's types are wrapped in `${Op}Operation` namespace to avoid collisions with model types from `models.ts`.
3. **URLPattern precompilation**: For routes with path variables, a `export const opNamePattern` is emitted at module level. `exec()` is called per-request only when `params` is not provided.
4. **Configuration generation** supports nested `record`, `taggedUnion`, `union`, `array`, `set`, and `enums`. Uses schema validation (Zod or Valibot) with env parameterization (`getConfig(env = process.env)`). Config model types are also generated in `models.ts`.
5. **Router factory functions**: `createWarehousesRouter(handlers)` wraps all per-operation handlers and returns an array of `{ method, path, handler }` objects.
6. **Tags**: `RouterModel.id` is automatically used as the OpenAPI tag. If `tag` is set on the router, it replaces `id` as the tag name. Do not set `tags` on individual routes unless additional tags are needed.
7. **Use `router()`** instead of plain object literals for RouterModel.
