---
"@huanglangjian/specs-ts-codegen": patch
---

fix: config env defaults/optional, path-variable handler null guard, taggedUnion discriminator env name

- Env config schemas now carry each field's `optional`/`default` (previously
  dropped): required-with-default emits `.default(d)`, optional emits
  `.optional()`, optional-with-default emits `.default(d).optional()`. Unified
  via a new `field()` validation-lib helper (replaces `optional()`); valibot
  defaults are emitted in input (string) form to match its coercing schemas.
- Route handlers with path variables guard `URLPattern.exec(...)` and return a
  404 instead of a non-null assertion that crashes on a non-matching URL.
- A `taggedUnion` config field's discriminator env var is now named from the
  union's discriminator (e.g. `DATABASE_TYPE`) and coincides with the variant
  literal, instead of emitting a redundant field-named enum (`DATABASE`).
