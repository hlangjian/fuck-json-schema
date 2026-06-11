---
"@huanglangjian/specs": minor
---

为 Hono 服务端代码生成器添加 configuration 选项，基于 t3-env + zod 生成类型安全的环境变量配置代码。支持递归打平嵌套 record、taggedUnion/union 的 discriminator + switch 分发（含嵌套 switch）、array/set 的 CSV transform 解析，map 及复合 element 的 array/set 明确报错拒绝。
