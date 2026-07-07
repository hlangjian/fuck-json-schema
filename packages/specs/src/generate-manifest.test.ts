import { binary, json, route, router } from "./api"
import type { BrokerModel } from "./pubsub"
import { broker, channel } from "./pubsub"
import { array, datetime, enums, int32, record, string } from "./types"
import { describe, expect, it } from "vitest"
import { generateManifests } from "./generate-manifest"

const Warehouse = record({
  id: "Warehouse",
  title: "仓库",
  description: "仓库信息",
  properties: {
    id: int32({ description: "仓库ID" }),
    name: string({ description: "仓库名称" }),
    location: string({ description: "仓库位置" }),
    capacity: int32({ description: "最大容量", default: 100 }),
    createdAt: datetime({ description: "创建时间" }),
  },
})

const ErrorResponse = record({
  id: "ErrorResponse",
  title: "错误响应",
  properties: { message: string({ description: "错误信息" }) },
})

const CreateWarehouse = record({
  id: "CreateWarehouse",
  properties: { name: string({ description: "仓库名称" }) },
})

const WarehouseType = enums({
  id: "WarehouseType",
  variants: { cold: "cold", dry: "dry", hazmat: "hazmat" },
})

const warehouses = router({
  id: "Warehouses",
  description: "仓库管理 API 集合",
  routes: {
    getWarehouse: route({
      method: "GET",
      path: "/warehouses/{id}",
      summary: "获取单个仓库",
      description: "根据ID获取指定仓库",
      variables: { id: int32({ description: "仓库ID" }) },
      responses: {
        Success: json({ status: 200, body: Warehouse }),
        NotFound: json({ status: 404, body: ErrorResponse }),
      },
    }),
    listWarehouses: route({
      method: "GET",
      path: "/warehouses",
      summary: "获取仓库列表",
      queries: record({
        id: "WarehouseQuery",
        properties: { type: WarehouseType },
        optional: ["type"],
      }),
      responses: { Success: json({ status: 200, body: array({ base: Warehouse }) }) },
    }),
    createWarehouse: route({
      method: "POST",
      path: "/warehouses",
      body: CreateWarehouse,
      responses: {
        Created: json({ status: 201, body: Warehouse }),
      },
    }),
    exportWarehouses: route({
      method: "GET",
      path: "/warehouses/export",
      deprecated: true,
      responses: { Success: binary({ status: 200 }) },
    }),
  },
})

const warehouseBroker: BrokerModel = broker({
  id: "WarehouseBroker",
  description: "仓库事件总线",
  protocols: ["kafka", "redis"],
  channels: {
    warehouseCreated: channel({ payload: Warehouse }),
    warehouseUpdated: channel({ payload: Warehouse }),
  },
})

describe("generateManifests", () => {
  const result = generateManifests({
    info: { title: "Warehouse API", version: "1.0.0", description: "仓库管理 CRUD API" },
    routers: [warehouses],
    brokers: [warehouseBroker],
  })

  it("produces all three document files", () => {
    expect(result.server).toBeTruthy()

    expect(result.client).toBeTruthy()

    expect(result.subscriber).toBeTruthy()
  })

  it("generates JSON schemas for named models", () => {
    expect(result.schemas["warehouse.schema.json"]).toBeTruthy()

    expect(result.schemas["createWarehouse.schema.json"]).toBeTruthy()

    expect(result.schemas["errorResponse.schema.json"]).toBeTruthy()

    const w = JSON.parse(result.schemas["warehouse.schema.json"])

    expect(w.type).toBe("object")

    expect(w.properties.id).toBeDefined()

    expect(w.properties.name).toBeDefined()
  })

  it("server doc contains route definitions", () => {
    expect(result.server).toContain("Warehouse API — Server")

    expect(result.server).toContain("## Warehouses —")

    expect(result.server).toContain("GET /warehouses/{id}")

    expect(result.server).toContain("POST /warehouses")
  })

  it("server doc contains param descriptions", () => {
    expect(result.server).toContain("仓库ID")
  })

  it("client doc contains function signatures", () => {
    expect(result.client).toContain("Warehouse API — Client")

    expect(result.client).toContain("getWarehouse(")

    expect(result.client).toContain("listWarehouses(")

    expect(result.client).toContain("createWarehouse(")
  })

  it("client doc contains URL and method", () => {
    expect(result.client).toContain("/warehouses/{id}")

    expect(result.client).toContain("GET")

    expect(result.client).toContain("POST")
  })

  it("subscriber doc contains broker and channels", () => {
    expect(result.subscriber).toContain("Warehouse API — Subscriber")

    expect(result.subscriber).toContain("WarehouseBroker")

    expect(result.subscriber).toContain("warehouseCreated")

    expect(result.subscriber).toContain("warehouseUpdated")
  })

  it("subscriber doc contains protocol requirements", () => {
    expect(result.subscriber).toContain("必须同时实现")

    expect(result.subscriber).toContain("kafka")

    expect(result.subscriber).toContain("redis")
  })

  it("subscriber doc links payload to model schema", () => {
    expect(result.subscriber).toContain("[Warehouse]")
  })

  it("model tables contain field metadata", () => {
    expect(result.server).toContain("最大容量")

    expect(result.server).toContain("100")
  })

  it("does not contain deployment values", () => {
    expect(result.server).not.toMatch(/localhost|127\.0\.0\.1/)

    expect(result.server).not.toContain("DATABASE")
  })
})

describe("generateManifests without brokers", () => {
  it("subscriber doc is empty when no brokers provided", () => {
    const result = generateManifests({
      info: { title: "Test", version: "0.0.0" },
      routers: [warehouses],
    })

    expect(result.subscriber).toContain("No Pub/Sub brokers defined")
  })
})
