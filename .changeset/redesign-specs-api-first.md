---
"@huanglangjian/specs": minor
---

重新设计类型模型：采用 StandardTypedV1 schema、改进 TaggedUnion/Record 定义、新增 Null 模型；删除 Java/Rust/TS 生成器，新增 Hono 服务端 + TS 客户端代码生成器；新增安全策略基础设施（API Key + OpenID Connect + 部署配置）；支持 SSE 响应类型；使用 Zod v4 + standard-schema 替代自定义序列化；Registry 模式重构 JSON Schema / OpenAPI 生成
