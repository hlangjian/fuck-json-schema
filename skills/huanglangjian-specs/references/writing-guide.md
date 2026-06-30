# Writing guide — field text that reads like a contract

Consult this guide when filling a model's `title`/`description`, a route's `summary`, or field-level descriptions. The rules below target the common failure modes of AI-drafted contract docs: filler that restates the title, implementation leakage, drifting terminology, formulaic symbols, and roadmap prose.

## 1. `description` must add information beyond `title`

Restating the title in fewer words is the most common filler. If you cannot articulate what the title leaves unsaid, leave `description` empty — silence is cleaner than noise.

**Anti:**
```ts
record({ id: "Order", title: "订单", description: "订单", ... })
enums({ id: "Status", title: "状态", description: "状态", ... })
```

**Pro:**
```ts
record({ id: "Order", title: "订单", description: "一个订单可拆分为多个履约并行执行", ... })
// or omit it entirely when the title is self-evident
enums({ id: "Status", title: "状态", ... })
```

## 2. Lock one term per concept

The same idea uses the same word across `title`, field `description`, route `summary`, and any glossary. Don't alternate synonyms across domains.

**Anti:** the transfer domain titles its router "调拨" but a field description says "转运"; one field says "在库总量", another says "在手数量" for the same concept.

**Pro:** settle a glossary first (`transfer → 调拨`, `on_hand → 在库总量`), then align every title/field/summary to it. Changing a term means a global replace, not a piecemeal edit.

## 3. Strip implementation detail

`title`/`description` are consumer-facing contracts. Storage engines, infrastructure, and internal pipelines do not belong in them.

**Anti:**
```ts
title: "库存变动明细(ClickHouse 事件行)"
title: "日终快照(物化视图)"
description: "数据来源于 ClickHouse 事件流聚合,不与主库竞争资源"
```

**Pro:**
```ts
title: "库存变动明细"
description: "数据来源于事件流聚合,只读"
```

## 4. Describe the current contract, not the roadmap

A contract describes present behavior, never future intent. Use the `deprecated` field to signal lifecycle, not prose about planned features.

**Anti:** `serial: string({ description: "序列号(可选,后续支持)" })` — when serialization is already supported.

**Pro:** `serial: string({ description: "序列号,高价值品个体追踪时提供" })`.

## 5. Translate formulas into natural language

Never put `Σ`, `=`, `/`, `→` in a `description`. Rewrite as prose or a bulleted breakdown.

**Anti:**
```
description: "汇总数量 = Σ叶子容器(counted 或 declared) + 散货 items"
```

**Pro:**
```
description: "汇总数量 = 各叶子容器数量 + 散货数量。
- 叶子容器:没有子容器以它的 code 作为 parent。
- 叶子容器数量:已开箱取实际清点数,未开箱取声明数。"
```

## 6. State machines as transition lists, not arrow chains

A linear `a — b — c — d` chain reads as a sequence of steps; real state machines have branches and back-edges. Use a bulleted transition list so the topology is visible.

**Anti:** `absent — scanned — opened — close(退回 scanned) — remove(级联删除)`

**Pro:**
```
- absent → scanned:添加容器
- scanned → opened:开箱
- opened → scanned:关箱(丢弃内部计数,恢复声明量)
- scanned → 删除:移除(级联删除子容器)
```

## 7. Public fields described everywhere, consistently

`id`, foreign keys (`*Id`), `createdAt`, `updatedAt` carry a `description` on every entity that has them, with uniform wording. A field described in one domain and bare in another is a consistency bug.

**Anti:**
```ts
id: string(),                    // no description
createdAt: datetime(),           // no description
```

**Pro:**
```ts
id: string({ description: "订单ID" }),
createdAt: datetime({ description: "创建时间" }),
```
