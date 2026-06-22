import {
  array,
  enums,
  int32,
  json,
  literal,
  record,
  route,
  router,
  set,
  string,
  taggedUnion,
  union,
} from "@huanglangjian/specs"
import { describe, expect, it } from "vitest"

import { generateTsServer } from "./server"

const WarehouseStatus = enums({
  id: "WarehouseStatus",
  variants: { active: "active", archived: "archived" },
})

const SortOrder = enums({
  id: "SortOrder",
  variants: { asc: "asc", desc: "desc" },
})

const Warehouse = record({ id: "Warehouse", properties: { id: int32(), name: string() } })
const CreateWarehouse = record({ id: "CreateWarehouse", properties: { name: string() } })

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
        properties: { status: WarehouseStatus, sort: SortOrder, tags: array({ base: WarehouseStatus }) },
        optional: ["status", "sort", "tags"],
      }),
      responses: { 200: json({ body: array({ base: Warehouse }) }) },
    }),
    createWarehouse: route({
      method: "POST",
      path: "/warehouses",
      body: CreateWarehouse,
      responses: { 201: json({ body: Warehouse }) },
    }),
  },
})

const ServerConfig = record({
  id: "ServerConfig",
  properties: {
    port: int32(),
    host: string(),
    tags: array({ base: string() }),
    allowedPorts: set({ base: int32() }),
    database: taggedUnion({
      id: "DatabaseConfig",
      discriminator: "type",
      variants: {
        postgres: record({ id: "PostgresConfig", properties: { type: literal("postgres"), host: string() } }),
        sqlite: record({ id: "SqliteConfig", properties: { type: literal("sqlite"), name: string() } }),
      },
    }),
    cache: union({
      id: "CacheConfig",
      variants: {
        redis: record({ id: "RedisCache", properties: { url: string() } }),
        memory: record({ id: "MemoryCache", properties: { maxSize: int32() } }),
      },
    }),
  },
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

describe("generateTsServer named-type imports for query params", () => {
  it("imports named enum types referenced by query interface fields", () => {
    const files = generateTsServer({ routers: [warehouses], configuration: ServerConfig })

    const opFile = files["warehouses/listWarehouses.ts"]
    expect(opFile).toContain(`import type {`)
    expect(opFile).toContain("WarehouseStatus")
    expect(opFile).toContain("SortOrder")
    expect(opFile).toMatch(/import type \{[^}]*\} from "\.\.\/models"/)
  })
})

describe("generateTsServer config switch exhaustiveness", () => {
  it("emits an exhaustive fallback so resolvers never return undefined", () => {
    const files = generateTsServer({ routers: [warehouses], configuration: ServerConfig })

    const config = files["config.ts"]
    expect(config).toContain("function resolveDatabase(")
    expect(config).toContain("function resolveCache(")
    expect(config).toContain("throw new Error(`unknown variant: ${dv}`)")
  })
})

describe("generateTsServer validation namespace import", () => {
  it("imports the valibot namespace for body-only operations", () => {
    const files = generateTsServer({ routers: [warehouses], configuration: ServerConfig, validationLib: "valibot" })

    const opFile = files["warehouses/createWarehouse.ts"]
    expect(opFile).toContain("v.parse(")
    expect(opFile).toContain(`import * as v from "valibot"`)
  })

  it("does not add an unused zod namespace import to body-only operations", () => {
    const files = generateTsServer({ routers: [warehouses], configuration: ServerConfig })

    const opFile = files["warehouses/createWarehouse.ts"]
    expect(opFile).not.toContain(`import { z } from "zod"`)
  })
})

describe("generateTsServer config env array/set schema", () => {
  it("parses comma lists as arrays without z.set / new Set (zod)", () => {
    const files = generateTsServer({ routers: [warehouses], configuration: ServerConfig })

    const config = files["config.ts"]
    expect(config).toContain("z.array(")
    expect(config).not.toContain("z.set(")
    expect(config).not.toContain("new Set(")
  })
})
