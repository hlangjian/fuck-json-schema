---
"@huanglangjian/specs": patch
---

fix: relax `schema` input type to support `.default()` schemas

- Change `BasicModel.schema` from `StandardTypedV1<T, T>` to `StandardTypedV1<unknown, T>` so schemas with `.default()` (e.g. `z.int32().default(20)`) are compatible
