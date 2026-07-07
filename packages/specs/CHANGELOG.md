# @huanglangjian/specs

## 0.19.0

### Minor Changes

- b23549e: Add `generateManifests()` — language-agnostic Markdown documentation generator producing `server.md`, `client.md`, `subscriber.md` with JSON Schema references for AI-driven development

## 0.18.2

### Patch Changes

- f8d266a: - specs: fix route() to merge auto-extracted path params with user-provided variables, preventing missing path params in generated client/server code
  - specs-ts-codegen: fix config resolver functions to include discriminator field for discriminated union variants

## 0.18.1

### Patch Changes

- 7903eae: fix: fallback to route key as operation summary when not provided

## 0.18.0

### Minor Changes

- c7bb135: feat!: route responses keyed by name, status required, summary removed

  - Route responses changed from `{ [statusCode]: ResponseModel }` to `{ [responseKey]: ResponseModel }`
  - `json()` / `binary()` / `jsonStream()` / `sseStream()` now require `status: number`
  - Removed `summary` from all ResponseModel types (redundant with body model descriptions)
  - Same-status responses auto-merge into `oneOf` in OpenAPI output
  - Response type names in codegen use the response key instead of status codes

## 0.17.0

### Minor Changes

- cdfe4c7: feat!: auto-inject union discriminator, remove redundant literal fields

  - `union()` no longer requires variants to include a discriminator literal field; it is auto-injected at the type level, JSON Schema generation, and TS codegen layers
  - `discriminator` is now optional, defaulting to `"type"`
  - Removed `ValidateUnion` compile-time check; replaced with runtime conflict detection
  - `InferUnionModel` provides correct type inference with auto-injected discriminator

## 0.16.0

### Minor Changes

- 9658f42: feat!: replace plain `union` with discriminated `union`

  BREAKING CHANGES:

  - The old `UnionModel` / `union()` (untagged) is removed
  - `taggedUnion()` / `TaggedUnionModel` is renamed to `union()` / `UnionModel` — now the only union variant
  - All union models now require an explicit `discriminator` property and each variant must include a matching `literal()` field

## 0.15.0

### Minor Changes

- 8636dfc: feat(specs): add `generateConfigJsonSchema` for config model JSON Schema generation

  Automatically converts a resolved config model into its input form: fields with `default` values are marked as optional,
  so the generated JSON Schema correctly reflects the input contract rather than the post-resolution type.
  Recursively handles all nested named models (record, taggedUnion, union, array/set/map with id-bearing base).

## 0.14.2

### Patch Changes

- 70dbfb1: Generate `operationId` for every OpenAPI operation using `{group}.{routeKey}` format.

## 0.14.1

### Patch Changes

- c05364e: Fix TypeError when using `in` operator on non-plain-object models (e.g. Proxy, null-prototype objects) in `collectModelDeep`, schema registry `getRef`, `collectSchemaMap`, and `collectDependencies`. All `"id" in model` checks now guard with `typeof model === "object" && model !== null` first.

## 0.14.0

### Minor Changes

- 715fcec: Added `unknown()` model factory for describing values of unknown structure. Supports the full pipeline: OpenAPI 3.2 (`{}` schema), JSON Schema 2020-12, and TypeScript codegen (`unknown` type). Usable in any position that accepts a `Models` (record properties, array/set/map base, union/taggedUnion variants, request/response bodies, query/header/path params).

## 0.13.3

### Patch Changes

- 37c133f: Fix OpenAPI/JSON Schema generation: nested named models wrapped in array/set/map now emit `$ref` instead of inlining. Registry uses model `id` string for lookup instead of object identity.

## 0.13.2

### Patch Changes

- 500876c: fix: change response status key type from `string` to `number` in RouteOptions and route()

## 0.13.1

### Patch Changes

- d369146: fix: operations now use `router.tag ?? router.id` for OpenAPI tag, not always `id`

## 0.13.0

### Minor Changes

- bde2b9d: refactor: rename `routerModel` to `router`, `name` to `id`, add optional `tag`

  - `routerModel()` factory renamed to `router()` for consistency with other factories
  - `RouterModel.name` renamed to `id`
  - New optional `tag` field on `RouterModel` — when set, used as OpenAPI tag name instead of `id`

## 0.12.6

### Patch Changes

- a693eb0: feat: expose `toJsonSchema` option in `generateOpenapi` and `generateJsonSchema`

  - Add `ToJsonSchema` type and export it publicly
  - `generateOpenapi` options now accepts `toJsonSchema` to extract Zod/Valibot schema metadata (default, format, pattern, etc.) into OpenAPI output
  - `generateJsonSchema` now accepts optional second parameter `{ toJsonSchema }`
  - Thread `toJsonSchema` through all internal functions (`generatePaths`, `generateOperation`, `getSchema`, etc.)

- a47c581: feat: auto-fill missing path variables with `string()` type in `route()` factory

  - When `variables` is not specified, extract `{param}` names from the path template and default them to `string()`
  - Ensures generated OpenAPI always includes path parameter definitions

## 0.12.5

### Patch Changes

- 5c0ad0c: fix: relax `schema` input type to support `.default()` schemas

  - Change `BasicModel.schema` from `StandardTypedV1<T, T>` to `StandardTypedV1<unknown, T>` so schemas with `.default()` (e.g. `z.int32().default(20)`) are compatible

## 0.12.4

### Patch Changes

- d1e559c: feat: replace bare `string` contentType with `HttpContentType` for better autocomplete

  - Add `HttpContentType` union type combining all 6 content type categories
  - Replace `RouteModel.contentType` and `ResponseOptions.contentType` from `string` to `HttpContentType | (string & {})`

## 0.12.3

### Patch Changes

- 1a4e5be: feat: make response factory functions options parameter optional

  - `json()`, `jsonStream()`, `sseStream()`, `binary()` now accept optional options

## 0.12.2

### Patch Changes

- b59085c: feat: add uuid primitive model; split type/value imports in generated code

  - specs: Add UuidModel + uuid() factory with JSON Schema format "uuid"
  - specs: Add UuidModel to SimpleType (path param support)
  - specs-ts-codegen: Add uuid support to Zod (z.string().uuid()) and Valibot (v.pipe(v.string(), v.uuid())) codegen
  - specs-ts-codegen: Split type-only imports from value imports in generated code (import type / export type)
  - specs-ts-codegen: Ensure bundler compatibility with verbatimModuleSyntax

## 0.12.1

### Patch Changes

- 739a8be: fix: JSDoc formatting, expand Request interfaces, add groupDescription

  - fieldJsdoc: standard multi-line `/** @description */` format, `@description`/`@deprecated` tags only
  - Remove bare title text from field JSDoc; title falls back to `@description`
  - Expand Request interfaces from compact to multi-line with field-level JSDoc
  - Add `@description` JSDoc on handler factory, config getter, and index.ts handlers
  - Add `OperationDescriptor.groupDescription` forwarded from RouterModel.description
  - Test coverage for all JSDoc tags: `@example`, `@default`, `@deprecated` (model/field/operation)

## 0.12.0

### Minor Changes

- 4f326ad: feat: JSDoc generation, metadata fields, eliminate SchemaInfo

  - specs: Add `deprecated` to BasicModel, `deprecated` to RouteModel, `description` to RouterModel
  - specs-ts-codegen: Generate `@description`/`@deprecated`/`@example`/`@default` JSDoc on model types and field-level inline JSDoc
  - specs-ts-codegen: Generate `@summary`/`@description`/`@deprecated` JSDoc on operation namespaces and client functions
  - OpenAPI: Emit top-level tags with description from RouterModel.description
  - refactor: Eliminate SchemaInfo type — SchemaMap is now Map<string, Models> directly
  - refactor: Remove metadata forwarding boilerplate; consumers read model metadata directly
  - fix: Remove unsafe type casts in collectNamedModels walk loop

## 0.11.0

### Minor Changes

- 05a1df3: refactor: replace mergeJsonSchemas with auto-discovering generateJsonSchema

  - `mergeJsonSchemas` removed — replaced by `generateJsonSchema(model)` which auto-discovers named sub-models
  - `buildJsonSchema` (internal) replaces old single-model `generateJsonSchema` with `toJsonSchema` callback for library-specific JSON Schema generation
  - `SchemaRegistry` gains `getDefs()` to collect registered model schemas
  - Chinese JSDoc on `toJsonSchema` explaining StandardTypedV1 / StandardSchemaV1 / StandardJSONSchemaV1 bridge

## 0.10.0

### Minor Changes

- c54ac88: Remove deprecated `json-schema.ts` codegen module. Refactor JSON Schema generation internals. Update test and skill documentation.

## 0.9.2

### Patch Changes

- 17051ba: feat: routerModel() factory, remove redundant tags, move skills to top-level directory

  - Add routerModel() factory function in specs/src/api.ts
  - Remove redundant tags from test examples (auto-populated from RouterModel.name)
  - Move SKILL.md files from packages/ to skills/ directory with skill-creator structure
  - specs-ts-codegen: config model types now generated in models.ts with proper TS types

## 0.9.1

### Patch Changes

- 8b7668b: fix: break circular dependency by splitting test.ts into per-package tests

  - specs/test.ts: OpenAPI + JSON Schema + model collection (no codegen deps)
  - specs-ts-codegen/test.ts: server + client codegen only
  - Remove cross-package devDependency between specs and specs-ts-codegen

## 0.9.0

### Minor Changes

- 88f0516: Adopt standard Web API handler signature (Request, params?), remove Hono dependency from generated handlers, wrap operation types in namespace to avoid naming collisions, remove mountRoutes.

## 0.8.5

### Patch Changes

- 42febb8: Export named zod schemas from generated config.ts instead of inline objects.

## 0.8.4

### Patch Changes

- 8dce2e3: Replace @t3-oss/env-core with pure zod + parameterized env for config generation.

## 0.8.3

### Patch Changes

- eab3277: Generate router-level handler interfaces and factory functions in mountRoutes, replacing operation-granularity inline handler types.

## 0.8.2

### Patch Changes

- b352c24: Replace method shorthand with arrow function in generated Hono handler to prevent unbound-method lint warnings.

## 0.8.1

### Patch Changes

- a3d8b93: Fix topological sort for generated models to prevent TDZ errors when schemas reference each other out of dependency order.

## 0.8.0

### Minor Changes

- 3e7ea90: Hono Server / TS Client 代码生成器输出结构优化：per-operation 文件按 router group 自动分组到子目录（如 `warehouses/listWarehouses.ts`），`models.ts` / `config.ts` / `index.ts` 保持在根目录。import 路径自适应调整。

## 0.7.0

### Minor Changes

- 654ac37: 重构 taggedUnion API: variantKey/payloadKey → discriminator（discriminator 内嵌于 variant RecordModel）；record 工厂函数 required → optional（默认全部必填，optional 列出可选字段）；新增 InferUnion/InferTaggedUnion 防御性类型；新增 ValidateTaggedUnion 编译期校验；新增模型 default 字段；JSON Schema/Zod/Hono/TS Client 代码生成同步更新

## 0.6.0

### Minor Changes

- 8dac576: 为 Hono 服务端代码生成器添加 configuration 选项，基于 t3-env + zod 生成类型安全的环境变量配置代码。支持递归打平嵌套 record、taggedUnion/union 的 discriminator + switch 分发（含嵌套 switch）、array/set 的 CSV transform 解析，map 及复合 element 的 array/set 明确报错拒绝。

## 0.5.0

### Minor Changes

- 9d348e0: 重新设计类型模型：采用 StandardTypedV1 schema、改进 TaggedUnion/Record 定义、新增 Null 模型；删除 Java/Rust/TS 生成器，新增 Hono 服务端 + TS 客户端代码生成器；新增安全策略基础设施（API Key + OpenID Connect + 部署配置）；支持 SSE 响应类型；使用 Zod v4 + standard-schema 替代自定义序列化；Registry 模式重构 JSON Schema / OpenAPI 生成

## 0.4.0

### Minor Changes

- bb460dd: add sse

## 0.3.1

### Patch Changes

- 15635de: fix exports

## 0.3.0

### Minor Changes

- d61652f: add tagged union

## 0.2.0

### Minor Changes

- 1641902: clean up and restructure workspace
