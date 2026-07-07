---
"@huanglangjian/specs-ts-codegen": minor
---

Response type now uses named variants instead of anonymous status codes: each arm carries `variant: "ResponseKey"`, `body` (parsed & validated), and `response` (raw fetch Response). Fallback arm `{ response: _RawResponse }` replaces the old `throw new Error` for unhandled status codes.
