# @huanglangjian/specs

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
