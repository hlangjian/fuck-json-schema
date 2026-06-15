# Model kinds

Every model is a plain object with a `kind` discriminator. All models support optional `title`, `description`, `examples`, and `schema` (a [StandardSchema](https://standardschema.dev/) validator for runtime type inference).

| Kind | Factory | OpenAPI / JSON Schema mapping |
|---|---|---|
| `int32` | `int32(opts?)` | `type: "integer", format: "int32"` |
| `float32` | `float32(opts?)` | `type: "number", format: "float"` |
| `float64` | `float64(opts?)` | `type: "number", format: "float"` |
| `boolean` | `boolean(opts?)` | `type: "boolean"` |
| `string` | `string(opts?)` | `type: "string"` |
| `datetime` | `datetime(opts?)` | `type: "string", format: "date-time"` |
| `date` | `date(opts?)` | `type: "string", format: "date"` |
| `duration` | `duration(opts?)` | `type: "string", format: "duration"` |
| `literal` | `literal(value)` | `const: value` |
| `null` | `nullLike()` | `type: "null"` |
| `array` | `array({ base: T, ... })` | `type: "array", items: T` |
| `set` | `set({ base: T, ... })` | `type: "array", uniqueItems: true` |
| `map` | `map({ base: T, ... })` | `type: "object", additionalProperties: T` |
| `record` | `record({ id, properties, optional?, ... })` | `type: "object"` with `$ref` to named schema |
| `enums` | `enums({ id, variants: {...}, ... })` | `type: "string", enum: [...]` |
| `union` | `union({ id, variants: {...}, ... })` | `oneOf` with variant-key wrapper |
| `taggedUnion` | `taggedUnion({ id, discriminator, variants, ... })` | `oneOf` with discriminator embedded in variant schemas |

## Key rules

- `record`, `enums`, `union`, `taggedUnion` **require an `id`** — they become named schemas.
- `taggedUnion` uses `discriminator` to specify which field acts as the discriminator. Each variant's `RecordModel` must include that field as a required `literal(value)` where the value matches the variant key.
- `union` wraps each variant in `{ [variantName]: variantSchema }`.
- `set` generates `uniqueItems: true` in JSON Schema; in codegen it emits `z.array()` for Zod (runtime dedup expected).
