import { array, enums, int32, json, record, route, router, string } from "@huanglangjian/specs"
import { describe, expect, it } from "vitest"

import { generateTsClient } from "./client"

const WarehouseStatus = enums({
  id: "WarehouseStatus",
  variants: { active: "active", archived: "archived" },
})

const Warehouse = record({ id: "Warehouse", properties: { id: int32(), name: string() } })

const warehouses = router({
  id: "Warehouses",
  routes: {
    getWarehouse: route({
      method: "GET",
      path: "/warehouses/{id}",
      variables: { id: int32() },
      responses: { 200: json({ body: Warehouse }) },
    }),
    listWarehouses: route({
      method: "GET",
      path: "/warehouses",
      queries: record({
        id: "ListWarehousesQuery",
        properties: { status: WarehouseStatus, tags: array({ base: WarehouseStatus }) },
        optional: ["status", "tags"],
      }),
      responses: { 200: json({ body: array({ base: Warehouse }) }) },
    }),
  },
})

describe("generateTsClient named-type imports for query params", () => {
  it("imports named enum types referenced by query interface fields", () => {
    const files = generateTsClient({ routers: [warehouses] })

    const opFile = files["warehouses/listWarehouses.ts"]
    expect(opFile).toContain("WarehouseStatus")
    expect(opFile).toMatch(/import type \{[^}]*WarehouseStatus[^}]*\} from "\.\.\/models"/)
  })
})

describe("generateTsClient request field access nesting", () => {
  it("reads path params from req.params, not req directly", () => {
    const files = generateTsClient({ routers: [warehouses] })

    const opFile = files["warehouses/getWarehouse.ts"]
    expect(opFile).toContain("encodeURIComponent(req.params.id)")
    expect(opFile).not.toContain("encodeURIComponent(req.id)")
  })

  it("reads query params from req.query, not req directly", () => {
    const files = generateTsClient({ routers: [warehouses] })

    const opFile = files["warehouses/listWarehouses.ts"]
    expect(opFile).toContain("req?.query")
    expect(opFile).not.toMatch(/encodeURIComponent\(req\.status\)/)
  })
})

describe("generateTsClient validation namespace import", () => {
  it("imports the valibot namespace when the file uses it", () => {
    const files = generateTsClient({ routers: [warehouses], validationLib: "valibot" })

    const opFile = files["warehouses/getWarehouse.ts"]
    expect(opFile).toContain("v.parse(")
    expect(opFile).toContain(`import * as v from "valibot"`)
  })

  it("does not add an unused zod namespace import", () => {
    const files = generateTsClient({ routers: [warehouses], validationLib: "zod" })

    const opFile = files["warehouses/getWarehouse.ts"]
    expect(opFile).not.toContain(`import { z } from "zod"`)
  })
})
