# @huanglangjian/specs-ts-codegen

## 0.17.2

### Patch Changes

- b23549e: Fix client error handling — unhandled status codes now throw `ApiError` wrapping the full `Response` object instead of a plain `Error` with only a message string
- Updated dependencies [b23549e]
  - @huanglangjian/specs@0.19.0

## 0.17.1

### Patch Changes

- 09921bf: Fix generated template literal for operations without path params — URL builder call was emitted as literal string instead of interpolated function call

## 0.17.0

### Minor Changes

- 384390b: Redesign TypeScript client generation with Client-based HTTP configuration:
  - Add `client.ts` with `Client` interface, `ClientConfig`, and `createClient()` factory — zero runtime dependencies, no global state
  - Operations now accept optional `client?: Client` instead of `baseUrl?: string`, enabling tree-shakeable per-operation imports with shared client configuration
  - Each operation file now exports a standalone `getXxxUrl()` URL builder and a named `Params` type
  - Client supports static/dynamic `headers` (for token refresh) and custom `fetch` override
  - Backward compatible: operations work without client using `globalThis.fetch` and relative URLs

## 0.16.2

### Patch Changes

- f8d266a: - specs: fix route() to merge auto-extracted path params with user-provided variables, preventing missing path params in generated client/server code
  - specs-ts-codegen: fix config resolver functions to include discriminator field for discriminated union variants
- Updated dependencies [f8d266a]
  - @huanglangjian/specs@0.18.2

## 0.16.1

### Patch Changes

- Updated dependencies [7903eae]
  - @huanglangjian/specs@0.18.1

## 0.16.0

### Minor Changes

- c7bb135: feat!: route responses keyed by name, status required, summary removed

  - Route responses changed from `{ [statusCode]: ResponseModel }` to `{ [responseKey]: ResponseModel }`
  - `json()` / `binary()` / `jsonStream()` / `sseStream()` now require `status: number`
  - Removed `summary` from all ResponseModel types (redundant with body model descriptions)
  - Same-status responses auto-merge into `oneOf` in OpenAPI output
  - Response type names in codegen use the response key instead of status codes

### Patch Changes

- Updated dependencies [c7bb135]
  - @huanglangjian/specs@0.18.0

## 0.15.0

### Minor Changes

- cdfe4c7: feat!: auto-inject union discriminator, remove redundant literal fields

  - `union()` no longer requires variants to include a discriminator literal field; it is auto-injected at the type level, JSON Schema generation, and TS codegen layers
  - `discriminator` is now optional, defaulting to `"type"`
  - Removed `ValidateUnion` compile-time check; replaced with runtime conflict detection
  - `InferUnionModel` provides correct type inference with auto-injected discriminator

### Patch Changes

- Updated dependencies [cdfe4c7]
  - @huanglangjian/specs@0.17.0

## 0.14.0

### Minor Changes

- 9658f42: feat!: replace plain `union` with discriminated `union`

  BREAKING CHANGES:

  - The old `UnionModel` / `union()` (untagged) is removed
  - `taggedUnion()` / `TaggedUnionModel` is renamed to `union()` / `UnionModel` — now the only union variant
  - All union models now require an explicit `discriminator` property and each variant must include a matching `literal()` field

### Patch Changes

- Updated dependencies [9658f42]
  - @huanglangjian/specs@0.16.0

## 0.13.4

### Patch Changes

- Updated dependencies [8636dfc]
  - @huanglangjian/specs@0.15.0

## 0.13.3

### Patch Changes

- Updated dependencies [70dbfb1]
  - @huanglangjian/specs@0.14.2

## 0.13.2

### Patch Changes

- Updated dependencies [c05364e]
  - @huanglangjian/specs@0.14.1

## 0.13.1

### Patch Changes

- Updated dependencies [715fcec]
  - @huanglangjian/specs@0.14.0

## 0.13.0

### Minor Changes

- 4a2e287: Generated client functions now return the full `Operation.Response` union type (`Promise<Operation.Response>`) discriminated by `status`, instead of extracting the success body type and throwing `Error` on non-2xx responses. All defined response statuses are handled as typed variants via `switch`/`case` with `as const` status literals. Error response schemas are now imported and validated alongside success schemas. This is a breaking change for consumers who relied on the previous `Promise<BodyType>` return signature.

## 0.12.14

### Patch Changes

- Updated dependencies [37c133f]
  - @huanglangjian/specs@0.13.3

## 0.12.13

### Patch Changes

- 5fee27c: fix: zod config fields with a default no longer emit a redundant `.optional()`

  A config field that is both optional and has a default previously generated
  `z.string().default(x).optional()`, which widens the inferred output type to
  `T | undefined` even though the default guarantees a value. The generated zod
  `field()` now emits `.default(x)` alone when a default is present (the default
  already makes the input optional), reserving a trailing `.optional()` for fields
  that are optional without a default. Valibot output is unchanged.

## 0.12.12

### Patch Changes

- adf63d8: fix: config env defaults/optional, path-variable handler null guard, taggedUnion discriminator env name

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

## 0.12.11

### Patch Changes

- 1a83943: fix: array query params, deprecated zod string formats, and unused handler params

  - Client functions now serialize array/set query params as repeated keys
    (`for (const item of query.x) ...`) instead of passing the array straight to
    `encodeURIComponent`, which failed to type-check (TS2345).
  - Generated zod models use the non-deprecated `z.iso.datetime()`, `z.iso.date()`
    and `z.uuid()` instead of the zod-4-deprecated `z.string().datetime()` etc.
  - Server handler wrappers prefix unused `request`/`params` parameters with `_`
    (e.g. no-argument or body-only operations), avoiding `no-unused-vars` warnings.

## 0.12.10

### Patch Changes

- 427c54b: fix: make generated server/client code type-check (zod and valibot)

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

## 0.12.9

### Patch Changes

- 7d28b42: fix: root-level `config.ts` now imports models from `./models` instead of `../models`

  The generated `config.ts` lives at the output root next to `models.ts`, so its
  import path must be `./models`. Operation files in subdirectories keep `../models`.

## 0.12.8

### Patch Changes

- Updated dependencies [500876c]
  - @huanglangjian/specs@0.13.2

## 0.12.7

### Patch Changes

- Updated dependencies [d369146]
  - @huanglangjian/specs@0.13.1

## 0.12.6

### Patch Changes

- Updated dependencies [bde2b9d]
  - @huanglangjian/specs@0.13.0

## 0.12.5

### Patch Changes

- Updated dependencies [a693eb0]
- Updated dependencies [a47c581]
  - @huanglangjian/specs@0.12.6

## 0.12.4

### Patch Changes

- Updated dependencies [5c0ad0c]
  - @huanglangjian/specs@0.12.5

## 0.12.3

### Patch Changes

- Updated dependencies [d1e559c]
  - @huanglangjian/specs@0.12.4

## 0.12.2

### Patch Changes

- Updated dependencies [1a4e5be]
  - @huanglangjian/specs@0.12.3

## 0.12.1

### Patch Changes

- b59085c: feat: add uuid primitive model; split type/value imports in generated code

  - specs: Add UuidModel + uuid() factory with JSON Schema format "uuid"
  - specs: Add UuidModel to SimpleType (path param support)
  - specs-ts-codegen: Add uuid support to Zod (z.string().uuid()) and Valibot (v.pipe(v.string(), v.uuid())) codegen
  - specs-ts-codegen: Split type-only imports from value imports in generated code (import type / export type)
  - specs-ts-codegen: Ensure bundler compatibility with verbatimModuleSyntax

- Updated dependencies [b59085c]
  - @huanglangjian/specs@0.12.2

## 0.12.0

### Minor Changes

- 6c1ccbd: feat: add optional models parameter to generator options

  - `TsServerOptions.models` and `TsClientOptions.models` accept free models not referenced by any route
  - `addModelsToSchemaMap()` in `shared.ts` walks model trees and registers named sub-models into schemaMap
  - Removed old single-model `addConfigToSchemaMap`; configuration injection now also uses the new helper

## 0.11.1

### Patch Changes

- 739a8be: fix: JSDoc formatting, expand Request interfaces, add groupDescription

  - fieldJsdoc: standard multi-line `/** @description */` format, `@description`/`@deprecated` tags only
  - Remove bare title text from field JSDoc; title falls back to `@description`
  - Expand Request interfaces from compact to multi-line with field-level JSDoc
  - Add `@description` JSDoc on handler factory, config getter, and index.ts handlers
  - Add `OperationDescriptor.groupDescription` forwarded from RouterModel.description
  - Test coverage for all JSDoc tags: `@example`, `@default`, `@deprecated` (model/field/operation)

- Updated dependencies [739a8be]
  - @huanglangjian/specs@0.12.1

## 0.11.0

### Minor Changes

- 4f326ad: feat: JSDoc generation, metadata fields, eliminate SchemaInfo

  - specs: Add `deprecated` to BasicModel, `deprecated` to RouteModel, `description` to RouterModel
  - specs-ts-codegen: Generate `@description`/`@deprecated`/`@example`/`@default` JSDoc on model types and field-level inline JSDoc
  - specs-ts-codegen: Generate `@summary`/`@description`/`@deprecated` JSDoc on operation namespaces and client functions
  - OpenAPI: Emit top-level tags with description from RouterModel.description
  - refactor: Eliminate SchemaInfo type — SchemaMap is now Map<string, Models> directly
  - refactor: Remove metadata forwarding boilerplate; consumers read model metadata directly
  - fix: Remove unsafe type casts in collectNamedModels walk loop

### Patch Changes

- Updated dependencies [4f326ad]
  - @huanglangjian/specs@0.12.0

## 0.10.2

### Patch Changes

- Updated dependencies [05a1df3]
  - @huanglangjian/specs@0.11.0

## 0.10.1

### Patch Changes

- Updated dependencies [c54ac88]
  - @huanglangjian/specs@0.10.0

## 0.10.0

### Minor Changes

- c5a4822: Support Valibot as an alternative validation library. Add `validationLib` option to `TsServerOptions` and `TsClientOptions` (defaults to `"zod"`). New `ValidationLib` interface in `src/validation-lib.ts` with `zodLib` and `valibotLib` implementations. Refactor: `toZod` → `toSchema`, `toHonoPath` → `toColonPath`, `resolveZodSchema` → `resolveSchemaExpr`. Split config switch nodes into `TaggedSwitchNode`/`UnionSwitchNode`. Union discriminator env var now uses `envPrefix` directly (no `_TYPE` suffix).

## 0.9.2

### Patch Changes

- 17051ba: feat: routerModel() factory, remove redundant tags, move skills to top-level directory

  - Add routerModel() factory function in specs/src/api.ts
  - Remove redundant tags from test examples (auto-populated from RouterModel.name)
  - Move SKILL.md files from packages/ to skills/ directory with skill-creator structure
  - specs-ts-codegen: config model types now generated in models.ts with proper TS types

- Updated dependencies [17051ba]
  - @huanglangjian/specs@0.9.2

## 0.9.1

### Patch Changes

- 8b7668b: fix: break circular dependency by splitting test.ts into per-package tests

  - specs/test.ts: OpenAPI + JSON Schema + model collection (no codegen deps)
  - specs-ts-codegen/test.ts: server + client codegen only
  - Remove cross-package devDependency between specs and specs-ts-codegen

- Updated dependencies [8b7668b]
  - @huanglangjian/specs@0.9.1
