---
"@huanglangjian/specs": minor
---

refactor: rename `routerModel` to `router`, `name` to `id`, add optional `tag`

- `routerModel()` factory renamed to `router()` for consistency with other factories
- `RouterModel.name` renamed to `id`
- New optional `tag` field on `RouterModel` — when set, used as OpenAPI tag name instead of `id`
