---
"@huanglangjian/specs": minor
---

feat(specs): add `generateConfigJsonSchema` for config model JSON Schema generation

Automatically converts a resolved config model into its input form: fields with `default` values are marked as optional,
so the generated JSON Schema correctly reflects the input contract rather than the post-resolution type.
Recursively handles all nested named models (record, taggedUnion, union, array/set/map with id-bearing base).
