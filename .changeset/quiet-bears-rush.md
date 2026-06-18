---
"@huanglangjian/specs": patch
---

feat: expose `toJsonSchema` option in `generateOpenapi` and `generateJsonSchema`

- Add `ToJsonSchema` type and export it publicly
- `generateOpenapi` options now accepts `toJsonSchema` to extract Zod/Valibot schema metadata (default, format, pattern, etc.) into OpenAPI output
- `generateJsonSchema` now accepts optional second parameter `{ toJsonSchema }`
- Thread `toJsonSchema` through all internal functions (`generatePaths`, `generateOperation`, `getSchema`, etc.)
