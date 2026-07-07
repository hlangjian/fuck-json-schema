# @huanglangjian/specs-dotnet-codegen

## 0.3.3

### Patch Changes

- Updated dependencies [b23549e]
  - @huanglangjian/specs@0.19.0

## 0.3.2

### Patch Changes

- Updated dependencies [f8d266a]
  - @huanglangjian/specs@0.18.2

## 0.3.1

### Patch Changes

- Updated dependencies [7903eae]
  - @huanglangjian/specs@0.18.1

## 0.3.0

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

## 0.2.1

### Patch Changes

- cdfe4c7: feat!: auto-inject union discriminator, remove redundant literal fields

  - `union()` no longer requires variants to include a discriminator literal field; it is auto-injected at the type level, JSON Schema generation, and TS codegen layers
  - `discriminator` is now optional, defaulting to `"type"`
  - Removed `ValidateUnion` compile-time check; replaced with runtime conflict detection
  - `InferUnionModel` provides correct type inference with auto-injected discriminator

- Updated dependencies [cdfe4c7]
  - @huanglangjian/specs@0.17.0

## 0.2.0

### Minor Changes

- 9658f42: feat!: replace plain `union` with discriminated `union`

  BREAKING CHANGES:

  - The old `UnionModel` / `union()` (untagged) is removed
  - `taggedUnion()` / `TaggedUnionModel` is renamed to `union()` / `UnionModel` — now the only union variant
  - All union models now require an explicit `discriminator` property and each variant must include a matching `literal()` field

### Patch Changes

- Updated dependencies [9658f42]
  - @huanglangjian/specs@0.16.0

## 0.1.1

### Patch Changes

- Updated dependencies [8636dfc]
  - @huanglangjian/specs@0.15.0
