import { int32, json, record, route, router, string } from "@huanglangjian/specs"
import { describe, expect, it } from "vitest"

import { generateTsServer } from "./server"

const warehouses = router({
  id: "Warehouses",
  routes: {
    getWarehouse: route({
      method: "GET",
      path: "/warehouses/{id}",
      variables: { id: int32() },
      responses: {
        200: json({ body: record({ id: "Warehouse", properties: { id: int32(), name: string() } }) }),
      },
    }),
  },
})

const ServerConfig = record({
  id: "ServerConfig",
  properties: { port: int32(), host: string() },
})

describe("generateTsServer config import path", () => {
  it("root-level config.ts imports models from ./models", () => {
    const files = generateTsServer({ routers: [warehouses], configuration: ServerConfig })

    expect(files["config.ts"]).toContain(`from "./models"`)
    expect(files["config.ts"]).not.toContain(`from "../models"`)
  })

  it("operation files in subdirectories import models from ../models", () => {
    const files = generateTsServer({ routers: [warehouses], configuration: ServerConfig })

    const opFile = files["warehouses/getWarehouse.ts"]
    expect(opFile).toContain(`from "../models"`)
  })
})
