---
"@huanglangjian/specs": minor
---

重构 taggedUnion API: variantKey/payloadKey → discriminator（discriminator 内嵌于 variant RecordModel）；record 工厂函数 required → optional（默认全部必填，optional 列出可选字段）；新增 InferUnion/InferTaggedUnion 防御性类型；新增 ValidateTaggedUnion 编译期校验；新增模型 default 字段；JSON Schema/Zod/Hono/TS Client 代码生成同步更新
