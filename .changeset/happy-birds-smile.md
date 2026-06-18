---
"@huanglangjian/specs": patch
---

feat: replace bare `string` contentType with `HttpContentType` for better autocomplete

- Add `HttpContentType` union type combining all 6 content type categories
- Replace `RouteModel.contentType` and `ResponseOptions.contentType` from `string` to `HttpContentType | (string & {})`
