---
"@huanglangjian/specs": patch
"@huanglangjian/specs-ts-codegen": patch
---

- specs: fix route() to merge auto-extracted path params with user-provided variables, preventing missing path params in generated client/server code
- specs-ts-codegen: fix config resolver functions to include discriminator field for discriminated union variants
