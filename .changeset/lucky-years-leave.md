---
"@huanglangjian/specs": patch
"@huanglangjian/specs-ts-codegen": patch
---

feat: add uuid primitive model; split type/value imports in generated code

- specs: Add UuidModel + uuid() factory with JSON Schema format "uuid"
- specs: Add UuidModel to SimpleType (path param support)
- specs-ts-codegen: Add uuid support to Zod (z.string().uuid()) and Valibot (v.pipe(v.string(), v.uuid())) codegen
- specs-ts-codegen: Split type-only imports from value imports in generated code (import type / export type)
- specs-ts-codegen: Ensure bundler compatibility with verbatimModuleSyntax
