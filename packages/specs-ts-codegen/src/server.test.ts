import {
  array,
  datetime,
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

const Warehouse = record({ id: "Warehouse", properties: { id: int32(), name: string(), createdAt: datetime() } })
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
    ping: route({
      method: "GET",
      path: "/ping",
      responses: { 200: json({}) },
    }),
  },
})

const ServerConfig = record({
  id: "ServerConfig",
  properties: {
    port: int32({ default: 8080 }),
    host: string({ default: "0.0.0.0" }),
    logLevel: enums({ id: "LogLevel", variants: { debug: "debug", info: "info" }, default: "info" }),
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
  optional: ["logLevel", "tags", "allowedPorts", "cache"],
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

describe("generateTsServer models use non-deprecated zod string formats", () => {
  it("emits z.iso.datetime() instead of the deprecated z.string().datetime()", () => {
    const files = generateTsServer({ routers: [warehouses], configuration: ServerConfig })

    const models = files["models.ts"]
    expect(models).toContain("z.iso.datetime()")
    expect(models).not.toContain("z.string().datetime()")
  })
})

describe("generateTsServer unused handler parameters", () => {
  it("underscores request and params for no-argument operations", () => {
    const files = generateTsServer({ routers: [warehouses], configuration: ServerConfig })

    const opFile = files["warehouses/ping.ts"]
    expect(opFile).toContain("async (_request: Request, _params?: Record<string, string>)")
  })

  it("underscores only params for body-only operations", () => {
    const files = generateTsServer({ routers: [warehouses], configuration: ServerConfig })

    const opFile = files["warehouses/createWarehouse.ts"]
    expect(opFile).toContain("async (request: Request, _params?: Record<string, string>)")
  })
})

describe("generateTsServer config env default/optional", () => {
  it("emits .default() for required fields with a default (no .optional())", () => {
    const config = generateTsServer({ routers: [warehouses], configuration: ServerConfig })["config.ts"]

    expect(config).toContain("PORT: z.coerce.number().int().default(8080),")
    expect(config).toContain('HOST: z.string().default("0.0.0.0"),')
  })

  it("collapses optional+default to .default() (no trailing .optional())", () => {
    const config = generateTsServer({ routers: [warehouses], configuration: ServerConfig })["config.ts"]

    expect(config).toContain('LOG_LEVEL: z.enum(["debug","info"]).default("info"),')
    expect(config).not.toContain('.default("info").optional()')
  })

  it("emits .optional() for optional fields without a default", () => {
    const config = generateTsServer({ routers: [warehouses], configuration: ServerConfig })["config.ts"]

    expect(config).toMatch(/TAGS: .*\.optional\(\),/)
    expect(config).not.toMatch(/TAGS: [^\n]*\.default\(/)
  })

  it("stringifies env defaults for valibot (input-typed)", () => {
    const config = generateTsServer({ routers: [warehouses], configuration: ServerConfig, validationLib: "valibot" })[
      "config.ts"
    ]

    expect(config).toContain('PORT: v.optional(v.pipe(v.string(), v.toNumber(), v.integer()), "8080"),')
  })
})

describe("generateTsServer taggedUnion discriminator env var", () => {
  it("names the discriminator env var after the union discriminator, not the field", () => {
    const config = generateTsServer({ routers: [warehouses], configuration: ServerConfig })["config.ts"]

    expect(config).toContain('DATABASE_TYPE: z.enum(["postgres","sqlite"]),')
    expect(config).toContain("resolveDatabase(env, e.DATABASE_TYPE)")
    expect(config).not.toMatch(/\n {2}DATABASE: z\.enum/)
  })
})

describe("generateTsServer path-variable handler null guard", () => {
  it("guards URLPattern.exec and returns 404 instead of asserting non-null", () => {
    const opFile = generateTsServer({ routers: [warehouses], configuration: ServerConfig })[
      "warehouses/getWarehouse.ts"
    ]

    expect(opFile).toContain("const match = getWarehousePattern.exec(request.url)")
    expect(opFile).toContain("if (!params && !match) return new Response(null, { status: 404 })")
    expect(opFile).not.toContain(".exec(request.url)!")
  })
})
