---
"@huanglangjian/specs-ts-codegen": patch
---

fix: array query params, deprecated zod string formats, and unused handler params

- Client functions now serialize array/set query params as repeated keys
  (`for (const item of query.x) ...`) instead of passing the array straight to
  `encodeURIComponent`, which failed to type-check (TS2345).
- Generated zod models use the non-deprecated `z.iso.datetime()`, `z.iso.date()`
  and `z.uuid()` instead of the zod-4-deprecated `z.string().datetime()` etc.
- Server handler wrappers prefix unused `request`/`params` parameters with `_`
  (e.g. no-argument or body-only operations), avoiding `no-unused-vars` warnings.
