---
"@huanglangjian/specs": minor
"@huanglangjian/specs-ts-codegen": minor
"@huanglangjian/specs-dotnet-codegen": minor
---

feat!: replace plain `union` with discriminated `union`

BREAKING CHANGES:
- The old `UnionModel` / `union()` (untagged) is removed
- `taggedUnion()` / `TaggedUnionModel` is renamed to `union()` / `UnionModel` — now the only union variant
- All union models now require an explicit `discriminator` property and each variant must include a matching `literal()` field
