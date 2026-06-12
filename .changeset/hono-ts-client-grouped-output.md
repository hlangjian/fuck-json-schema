---
"@huanglangjian/specs": minor
---

Hono Server / TS Client 代码生成器输出结构优化：per-operation 文件按 router group 自动分组到子目录（如 `warehouses/listWarehouses.ts`），`models.ts` / `config.ts` / `index.ts` 保持在根目录。import 路径自适应调整。
