import { describe, expect, it } from "vitest"

import { generateConfigJsonSchema, generateJsonSchema } from "./generate-jsonschema"
import { int32, record, string, union } from "./types"

describe("generateConfigJsonSchema", () => {
  it("marks fields with default as not-required in the JSON Schema", () => {
    const ServerConfig = record({
      id: "TestConfig",
      properties: {
        port: int32({ default: 8080 }),
        host: string({ default: "0.0.0.0" }),
        name: string(),
      },
    })

    const result = generateConfigJsonSchema(ServerConfig)

    expect(result.type).toBe("object")

    expect(result.properties).toBeDefined()

    const props = result.properties as Record<string, any>

    expect(props.port).toBeDefined()

    expect(props.host).toBeDefined()

    expect(props.name).toBeDefined()

    // port and host have defaults → not required

    if (result.required) {
      expect(result.required).not.toContain("port")

      expect(result.required).not.toContain("host")

      expect(result.required).toContain("name")
    }
  })

  it("handles nested records recursively", () => {
    const NestedConfig = record({
      id: "NestedConfig",
      properties: {
        child: record({
          id: "ChildConfig",
          properties: {
            url: string({ default: "http://localhost" }),
            timeout: int32(),
          },
        }),
      },
    })

    const result = generateConfigJsonSchema(NestedConfig)

    const defs = (result as any).$defs as Record<string, any>

    expect(defs.ChildConfig).toBeDefined()

    const childProps = defs.ChildConfig.properties as Record<string, any>

    expect(childProps.url).toBeDefined()

    expect(childProps.timeout).toBeDefined()

    if (defs.ChildConfig.required) {
      expect(defs.ChildConfig.required).not.toContain("url")

      expect(defs.ChildConfig.required).toContain("timeout")
    }
  })

  it("handles union variants", () => {
    const Pg = record({
      id: "PgConfig",
      properties: {
        type: int32(), // no discriminator test needed

        host: string({ default: "localhost" }),
      },
    })

    const Sqlite = record({
      id: "SqliteConfig",
      properties: {
        type: int32(),

        file: string(),
      },
    })

    const DbConfig = union({
      id: "MyDbConfig",
      discriminator: "type",
      variants: { pg: Pg as any, sqlite: Sqlite as any },
    })

    const Config = record({
      id: "BigConfig",
      properties: {
        db: DbConfig as any,
      },
    })

    const result = generateConfigJsonSchema(Config)

    const defs = (result as any).$defs as Record<string, any>

    const pgSchema = defs.PgConfig

    expect(pgSchema).toBeDefined()

    if (pgSchema.required) {
      expect(pgSchema.required).not.toContain("host")
    }
  })

  it("preserves existing optional fields", () => {
    const Config = record({
      id: "PreserveOpt",
      properties: {
        alwaysRequired: int32(),

        hasDefault: string({ default: "hello" }),

        noDefaultOptional: string(),

        hasDefaultAndOptional: string({ default: "world" }),
      },
      optional: ["noDefaultOptional", "hasDefaultAndOptional"],
    })

    const result = generateConfigJsonSchema(Config)

    if (result.required) {
      expect(result.required).not.toContain("noDefaultOptional")

      expect(result.required).not.toContain("hasDefault")

      expect(result.required).not.toContain("hasDefaultAndOptional")

      expect(result.required).toContain("alwaysRequired")
    }
  })

  it("does not affect generateJsonSchema (non-config usage)", () => {
    const Model = record({
      id: "SomeModel",
      properties: {
        capacity: int32({ default: 100 }),
        name: string(),
      },
    })

    const normal = generateJsonSchema(Model)

    const config = generateConfigJsonSchema(Model)

    if (normal.required) {
      expect(normal.required).toContain("capacity")
    }

    if (config.required) {
      expect(config.required).not.toContain("capacity")
    }
  })

  it("caches transformed models by reference to avoid duplicate $defs", () => {
    const Shared = record({
      id: "Shared",
      properties: {
        url: string({ default: "http://localhost" }),
      },
    })

    const Outer = record({
      id: "Outer",
      properties: {
        alpha: Shared,
        beta: Shared,
      },
    })

    const result = generateConfigJsonSchema(Outer)

    const defs = (result as any).$defs as Record<string, any>

    expect(defs.Shared).toBeDefined()

    expect(Object.keys(defs).length).toBe(1)

    if (defs.Shared.required) {
      expect(defs.Shared.required).not.toContain("url")
    }
  })
})
