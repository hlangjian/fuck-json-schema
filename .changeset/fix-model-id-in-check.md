---
"@huanglangjian/specs": patch
---

Fix TypeError when using `in` operator on non-plain-object models (e.g. Proxy, null-prototype objects) in `collectModelDeep`, schema registry `getRef`, `collectSchemaMap`, and `collectDependencies`. All `"id" in model` checks now guard with `typeof model === "object" && model !== null` first.
