---
"@huanglangjian/specs": minor
"@huanglangjian/specs-ts-codegen": minor
---

refactor(specs): merge specs-codegen-utils into specs, add groupBy utility to codegen

- Remove standalone specs-codegen-utils package
- Move groupBy utility into specs/src/codegen/utils.ts
- specs-ts-codegen now imports groupBy from @huanglangjian/specs
