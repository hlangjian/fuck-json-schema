---
"@huanglangjian/specs": patch
"@huanglangjian/specs-ts-codegen": patch
---

feat: routerModel() factory, remove redundant tags, move skills to top-level directory

- Add routerModel() factory function in specs/src/api.ts
- Remove redundant tags from test examples (auto-populated from RouterModel.name)
- Move SKILL.md files from packages/ to skills/ directory with skill-creator structure
- specs-ts-codegen: config model types now generated in models.ts with proper TS types
