# @huanglangjian/specs

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
