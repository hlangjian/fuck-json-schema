---
"@huanglangjian/specs-ts-codegen": patch
---

fix: root-level `config.ts` now imports models from `./models` instead of `../models`

The generated `config.ts` lives at the output root next to `models.ts`, so its
import path must be `./models`. Operation files in subdirectories keep `../models`.
