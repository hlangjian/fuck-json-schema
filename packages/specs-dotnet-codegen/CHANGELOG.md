# @huanglangjian/specs-dotnet-codegen

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
