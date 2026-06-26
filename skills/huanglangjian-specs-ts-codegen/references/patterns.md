# Patterns & best practices

1. **Standard Web APIs** — handlers use `Request`/`Response` with no framework dependency; see [api-reference.md](./api-reference.md) for the signature and routing/404 behavior.
2. **Namespace isolation**: each operation's types are wrapped in a `${Op}Operation` namespace to avoid collisions with model types from `models.ts`.
3. **Operation grouping**: operations are written into directories named from `router.id` (`{camelCase(router.id)}/{operation}.ts`). Codegen does not emit OpenAPI tags — tags are a `@huanglangjian/specs` / `generateOpenapi` concern.
4. **Configuration generation** supports nested `record`, `taggedUnion`, `union`, `array`, `set`, and `enums`, with env parameterization (`getXxxConfig(env = process.env)`). Config model types are also generated in `models.ts`.
   - Each field's optionality (the record's `optional` list) and model `default` are translated into the generated env schema.
   - A `taggedUnion` field's discriminator env var is named from the union's discriminator (e.g. `DATABASE_TYPE`), matching the variant literal — not the field name.
5. **Validation library**: Zod (default) or Valibot via `validationLib`. Generated zod uses the non-deprecated formats (`z.iso.datetime()`, `z.iso.date()`, `z.uuid()`).
6. **Router factory functions**: `createWarehousesRouter(handlers)` wraps all per-operation handlers and returns an array of `{ method, path, handler }` objects.
7. **Client response discrimination**: destructure on `status` to narrow the `Operation.Response` union:
   ```ts
   const result = await getWarehouse({ params: { id: 1 } })
   if (result.status === 200) { result.body.name } // Warehouse
   else { result.body.message }                     // ErrorResponse
   ```
