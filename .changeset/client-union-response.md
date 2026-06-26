---
"@huanglangjian/specs-ts-codegen": minor
---

Generated client functions now return the full `Operation.Response` union type (`Promise<Operation.Response>`) discriminated by `status`, instead of extracting the success body type and throwing `Error` on non-2xx responses. All defined response statuses are handled as typed variants via `switch`/`case` with `as const` status literals. Error response schemas are now imported and validated alongside success schemas. This is a breaking change for consumers who relied on the previous `Promise<BodyType>` return signature.
