---
"@huanglangjian/specs": patch
"@huanglangjian/specs-ts-codegen": patch
---

fix: JSDoc formatting, expand Request interfaces, add groupDescription

- fieldJsdoc: standard multi-line `/** @description */` format, `@description`/`@deprecated` tags only
- Remove bare title text from field JSDoc; title falls back to `@description`
- Expand Request interfaces from compact to multi-line with field-level JSDoc
- Add `@description` JSDoc on handler factory, config getter, and index.ts handlers
- Add `OperationDescriptor.groupDescription` forwarded from RouterModel.description
- Test coverage for all JSDoc tags: `@example`, `@default`, `@deprecated` (model/field/operation)
