---
"@huanglangjian/specs-ts-codegen": patch
---

fix: zod config fields with a default no longer emit a redundant `.optional()`

A config field that is both optional and has a default previously generated
`z.string().default(x).optional()`, which widens the inferred output type to
`T | undefined` even though the default guarantees a value. The generated zod
`field()` now emits `.default(x)` alone when a default is present (the default
already makes the input optional), reserving a trailing `.optional()` for fields
that are optional without a default. Valibot output is unchanged.
