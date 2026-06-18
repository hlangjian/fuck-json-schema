import { describe, expect, it, vi } from "vitest"

import type { HttpMethod } from "./api"
import { json, route } from "./api"
import { generateOpenapi } from "./generate-openapi"
import { buildJsonSchema } from "./generate-jsonschema"
import type { JsonSchemaObject } from "./schemas/json-schema-draft-2020-12"
import { apikey, openIdConnect } from "./security"
import type { SecurityPolicyModel } from "./security"
import { deployOpenIdConnect } from "./deployment"
import { array, int32, record, string } from "./types"

describe("buildJsonSchema", () => {
  it("generates schema for int32", () => {
    const { jsonSchema } = buildJsonSchema({ model: int32() })
    const s = jsonSchema as JsonSchemaObject
    expect(s.type).toBe("integer")
    expect(s.format).toBe("int32")
  })

  it("generates schema for record", () => {
    const model = record({
      id: "User",
      properties: { name: string() },
    })
    const { jsonSchema } = buildJsonSchema({ model })
    const s = jsonSchema as JsonSchemaObject
    expect(s.type).toBe("object")
    expect(s.additionalProperties).toBe(false)
    expect(s.required).toEqual(["name"])
  })
})

describe("generateOpenapi", () => {
  const Warehouse = record({
    id: "Warehouse",
    properties: {
      id: int32(),
      name: string(),
    },
  })

  const router = {
    list: route({
      method: "GET",
      path: "/warehouses",
      summary: "List",
      responses: { "200": json({ body: array({ base: Warehouse }) }) },
    }),
  }

  it("generates openapi with correct structure", () => {
    const { openapi } = generateOpenapi({
      info: { title: "Test", version: "1.0.0" },
      routers: [{ id: "TestGroup", routes: router }],
    })
    expect(openapi.openapi).toBe("3.2.0")
    expect(openapi.info.title).toBe("Test")
    expect(openapi.paths?.["/warehouses"]?.get?.summary).toBe("List")
    expect(openapi.components?.schemas).toBeDefined()
  })

  it("injects securitySchemes and operation security for apikey", () => {
    const apiKeyAuth = apikey({
      id: "xKey",
      name: "X-Key",
    })

    const methodGet: HttpMethod[] = ["GET"]

    const policy: SecurityPolicyModel = {
      name: "default",
      paths: {
        "^/warehouses": {
          methods: methodGet,
          pipeline: [apiKeyAuth.apply()],
        },
      },
    }

    const { openapi } = generateOpenapi({
      info: { title: "Test", version: "1.0.0" },
      routers: [{ id: "TestGroup", routes: router }],
      security: { policy },
    })

    const scheme = openapi.components?.securitySchemes?.["xKey"]
    expect(scheme).toBeDefined()
    if (scheme && "type" in scheme) {
      expect(scheme.type).toBe("apiKey")
    }

    const op = openapi.paths?.["/warehouses"]?.get
    expect(op?.security).toEqual([{ xKey: [] }])
  })

  it("openid connect per-method scopes work correctly", () => {
    const keycloak = openIdConnect({
      id: "keycloak",
      scopes: ["read", "write"],
    })

    const deploy = deployOpenIdConnect({
      component: keycloak,
      issuer: "https://auth.example.com",
    })

    const methodGet: HttpMethod[] = ["GET"]

    const policy: SecurityPolicyModel = {
      name: "default",
      paths: {
        "^/warehouses": {
          methods: methodGet,
          pipeline: [keycloak.apply("read")],
        },
      },
    }

    const { openapi } = generateOpenapi({
      info: { title: "Test", version: "1.0.0" },
      routers: [{ id: "TestGroup", routes: router }],
      security: { policy, deployments: { keycloak: deploy } },
    })

    const scheme = openapi.components?.securitySchemes?.["keycloak"]
    expect(scheme).toBeDefined()
    if (scheme && "type" in scheme) {
      expect(scheme.type).toBe("openIdConnect")
    }

    const getOp = openapi.paths?.["/warehouses"]?.get
    expect(getOp?.security).toEqual([{ keycloak: ["read"] }])
    expect(getOp?.security?.[0]?.keycloak).not.toContain("write")
  })

  it("warns when openid scheme has no deployment", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

    const keycloak = openIdConnect({
      id: "keycloak",
      scopes: ["read"],
    })

    const policy: SecurityPolicyModel = {
      name: "default",
      paths: {
        "^/warehouses": {
          pipeline: [keycloak.apply("read")],
        },
      },
    }

    generateOpenapi({
      info: { title: "Test", version: "1.0.0" },
      routers: [{ id: "TestGroup", routes: router }],
      security: { policy },
    })

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("keycloak"),
    )

    warnSpy.mockRestore()
  })

  it("merges routes across multiple routers", () => {
    const routerA = {
      list: route({
        method: "GET",
        path: "/warehouses",
        summary: "List Warehouses",
        responses: { "200": json({ body: array({ base: Warehouse }) }) },
      }),
    }
    const routerB = {
      list: route({
        method: "GET",
        path: "/items",
        summary: "List Items",
        responses: { "200": json({ body: array({ base: Warehouse }) }) },
      }),
    }

    const { openapi } = generateOpenapi({
      info: { title: "Test", version: "1.0.0" },
      routers: [
        { id: "Warehouses", routes: routerA },
        { id: "Items", routes: routerB },
      ],
    })

    expect(openapi.paths?.["/warehouses"]?.get?.tags).toContain("Warehouses")
    expect(openapi.paths?.["/items"]?.get?.tags).toContain("Items")
  })

  it("joins basePath with route path", () => {
    const r = {
      list: route({
        method: "GET",
        path: "/warehouses",
        summary: "List",
        responses: { "200": json({ body: array({ base: Warehouse }) }) },
      }),
    }

    const { openapi } = generateOpenapi({
      info: { title: "Test", version: "1.0.0" },
      routers: [{ id: "V1", basePath: "/api/v1", routes: r }],
    })

    expect(openapi.paths?.["/api/v1/warehouses"]).toBeDefined()
    expect(openapi.paths?.["/warehouses"]).toBeUndefined()
  })
})
