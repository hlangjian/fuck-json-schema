import { array, enums, int32, json, record, route, router, string } from "@huanglangjian/specs"
import { describe, expect, it } from "vitest"

import { generateTsClient } from "./client"

const WarehouseStatus = enums({
  id: "WarehouseStatus",
  variants: { active: "active", archived: "archived" },
})

const Warehouse = record({ id: "Warehouse", properties: { id: int32(), name: string() } })

const CreateWarehouse = record({
  id: "CreateWarehouse",
  properties: { name: string() },
})

const ErrorResponse = record({
  id: "ErrorResponse",
  properties: { message: string() },
})

const warehouses = router({
  id: "Warehouses",
  routes: {
    getWarehouse: route({
      method: "GET",
      path: "/warehouses/{id}",
      variables: { id: int32() },
      responses: { Success: json({ status: 200,  body: Warehouse }) },
    }),
    listWarehouses: route({
      method: "GET",
      path: "/warehouses",
      queries: record({
        id: "ListWarehousesQuery",
        properties: { status: WarehouseStatus, tags: array({ base: WarehouseStatus }) },
        optional: ["status", "tags"],
      }),
      responses: { Success: json({ status: 200,  body: array({ base: Warehouse }) }) },
    }),
    updateWarehouse: route({
      method: "PUT",
      path: "/warehouses/{id}",
      variables: { id: int32() },
      body: CreateWarehouse,
      responses: {
        Success: json({ status: 200,  body: Warehouse }),
        NotFound: json({ status: 404,  body: ErrorResponse }),
      },
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

    expect(opFile).toContain("encodeURIComponent(params.id)")

    expect(opFile).toContain("getGetWarehouseUrl(req.params)")

    expect(opFile).not.toContain("encodeURIComponent(req.id)")
  })

  it("reads query params from req.query, not req directly", () => {
    const files = generateTsClient({ routers: [warehouses] })

    const opFile = files["warehouses/listWarehouses.ts"]

    expect(opFile).toContain("req?.query")

    expect(opFile).not.toMatch(/encodeURIComponent\(req\.status\)/)
  })

  it("iterates array query params instead of encoding the array directly", () => {
    const files = generateTsClient({ routers: [warehouses] })

    const opFile = files["warehouses/listWarehouses.ts"]

    expect(opFile).toContain("for (const item of query.tags) parts.push(")

    expect(opFile).not.toContain("encodeURIComponent(query.tags)")
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

describe("generateTsClient returns Response union type", () => {
  it("uses Operation.Response as return type instead of extracted body type", () => {
    const files = generateTsClient({ routers: [warehouses] })

    const opFile = files["warehouses/updateWarehouse.ts"]

    expect(opFile).toContain("Promise<UpdateWarehouseOperation.Response>")

    expect(opFile).not.toMatch(/Promise<Warehouse>/)
  })
})

describe("generateTsClient imports schemas for all response statuses", () => {
  it("imports error response schemas alongside success schemas", () => {
    const files = generateTsClient({ routers: [warehouses] })

    const opFile = files["warehouses/updateWarehouse.ts"]

    expect(opFile).toContain("warehouseSchema")

    expect(opFile).toContain("errorResponseSchema")
  })
})

describe("generateTsClient switch/case response handling", () => {
  it("generates switch with as const on status literals", () => {
    const files = generateTsClient({ routers: [warehouses] })

    const opFile = files["warehouses/updateWarehouse.ts"]

    expect(opFile).toContain("switch (res.status)")

    expect(opFile).toContain("200 as const")

    expect(opFile).toContain("404 as const")
  })

  it("throws Error in default case for unhandled statuses", () => {
    const files = generateTsClient({ routers: [warehouses] })

    const opFile = files["warehouses/updateWarehouse.ts"]

    expect(opFile).toContain("throw new Error")

    expect(opFile).toContain("default:")
  })
})
