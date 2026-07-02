---
"@huanglangjian/specs": minor
"@huanglangjian/specs-ts-codegen": minor
"@huanglangjian/specs-dotnet-codegen": patch
---

feat!: auto-inject union discriminator, remove redundant literal fields

- `union()` no longer requires variants to include a discriminator literal field; it is auto-injected at the type level, JSON Schema generation, and TS codegen layers
- `discriminator` is now optional, defaulting to `"type"`
- Removed `ValidateUnion` compile-time check; replaced with runtime conflict detection
- `InferUnionModel` provides correct type inference with auto-injected discriminator
