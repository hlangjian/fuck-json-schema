---
"@huanglangjian/specs-ts-codegen": patch
---

fix: make generated server/client code type-check (zod and valibot)

- Operation files now import named types (e.g. enums) referenced by
  `query`/`headers`/`params` interface fields, not just by body/responses
  (TS2304). Applies to both `generateTsServer` and `generateTsClient`.
- `config.ts` `resolve*` switch functions for tagged/plain unions emit an
  exhaustive `throw` fallback, so they no longer infer a possible `undefined`
  return (TS2322).
- Client functions read path params from `req.params.*` and query params from
  `req.query.*` instead of `req.*` (TS2339).
- The validation-library namespace import (`import * as v from "valibot"` /
  `import { z } from "zod"`) is now emitted whenever the generated file actually
  uses it — fixes valibot body-only server ops and valibot client files that
  referenced `v` without importing it (TS2304), without adding unused zod imports.
- Env array/set config values now parse comma-separated lists via
  `z.array(...).parse(...)` (and the valibot equivalent), fixing the
  `Set<unknown>`/`unknown[]` vs `string[]` assignment error for non-string
  element types (TS2345).
