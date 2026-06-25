---
"@huanglangjian/specs": patch
---

Fix OpenAPI/JSON Schema generation: nested named models wrapped in array/set/map now emit `$ref` instead of inlining. Registry uses model `id` string for lookup instead of object identity.
