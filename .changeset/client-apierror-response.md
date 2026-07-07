---
"@huanglangjian/specs-ts-codegen": patch
---

Fix client error handling — unhandled status codes now throw `ApiError` wrapping the full `Response` object instead of a plain `Error` with only a message string
