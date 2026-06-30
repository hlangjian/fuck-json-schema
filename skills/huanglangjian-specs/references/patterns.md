# Patterns & best practices

## Structure

1. **Optional fields** are specified via `optional` — a string array of property keys. Properties not in `optional` are required; if `optional` is omitted, every property is required.
2. **Path parameters** use `{name}` syntax and are declared in `variables`. Path param types are restricted to `SimpleType` (primitives). If `variables` is omitted, each `{name}` defaults to `string()`.
3. **Security**: path patterns are regex. If `methods` is not set on a `SecurityPolicyPathItem`, the pipeline applies to all HTTP methods.
4. **The `schema` field** on a model accepts a [StandardSchema](https://standardschema.dev/) validator. When provided, `InferModel<T>` extracts its output type.
5. **The `default` field** on a model holds a default value of the model's inferred type. It is consumed by the TypeScript code generators (`@huanglangjian/specs-ts-codegen`); it does NOT reach OpenAPI/JSON Schema output, which only picks up defaults carried on the model's `schema` and surfaced via a `toJsonSchema` adapter.
6. **Use the `router()` factory** instead of plain object literals for `RouterModel`.

## Text & field hygiene

7. **`description` must add information beyond `title`** — if it would merely restate the title in fewer words, omit it; an empty description is cleaner than filler.
8. **Lock one term per concept** — the same idea uses the same word across `title`, field `description`, route `summary`, and any glossary; don't alternate synonyms (e.g. 调拨 vs 转运 for the same domain).
9. **Strip implementation detail from contracts** — `title`/`description` are consumer-facing; keep storage engines and infrastructure (ClickHouse, Postgres) out. If a detail matters, state it in `description` as a read-only property ("sourced from event-stream aggregation"), not in the name.
10. **Describe the current contract, not the roadmap** — never write "后续支持" / "planned" in a `description`; use the `deprecated` field to signal lifecycle.
11. **Translate formulas into natural language** — don't put `Σ`, `=`, `/`, `→` in `description`; rewrite as prose or a bulleted breakdown.
12. **State machines as transition lists, not arrow chains** — a linear `a — b — c — d` chain reads as a sequence; use a bulleted transition list (`a → b: trigger`) so branches and back-edges are visible.
13. **Public fields described everywhere, consistently** — `id`, `*Id`, `createdAt`, `updatedAt` carry a `description` on every entity that has them, with uniform wording.

> `id` requirements, `taggedUnion`/`union` mapping rules live in [model-kinds.md](./model-kinds.md); tag behavior lives in [api-reference.md](./api-reference.md).
