import { mkdirSync, writeFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

import type { HttpMethod } from "./api"
import { binary as binaryResponse, json, route, routerModel } from "./api"
import { generateOpenapi } from "./generate-openapi"
import { collectNamedModels, collectOperations } from "./codegen/collect"
import { mergeJsonSchemas } from "./codegen/json-schema"
import { apikey, openIdConnect } from "./security"
import type { SecurityPolicyModel } from "./security"
import { deployOpenIdConnect } from "./deployment"
import { array, datetime, enums, int32, literal, record, set, string, taggedUnion, union } from "./types"

const Warehouse = record({
  id: "Warehouse",
  title: "仓库",
  description: "仓库信息",
  properties: {
    id: int32({ description: "仓库ID" }),
    name: string({ description: "仓库名称" }),
    location: string({ description: "仓库位置" }),
    capacity: int32({ description: "最大容量" }),
    createdAt: datetime({ description: "创建时间" }),
  },
})

const CreateWarehouse = record({
  id: "CreateWarehouse",
  title: "创建仓库",
  description: "创建仓库请求体",
  properties: {
    name: string({ description: "仓库名称" }),
    location: string({ description: "仓库位置" }),
    capacity: int32({ description: "最大容量" }),
  },
})

const UpdateWarehouse = record({
  id: "UpdateWarehouse",
  title: "更新仓库",
  description: "更新仓库请求体",
  properties: {
    name: string({ description: "仓库名称" }),
    location: string({ description: "仓库位置" }),
    capacity: int32({ description: "最大容量" }),
  },
})

const ErrorResponse = record({
  id: "ErrorResponse",
  title: "错误响应",
  properties: {
    message: string({ description: "错误信息" }),
  },
})

// ---- Server config with taggedUnion, union, nested ----
const PostgresConfig = record({
  id: "PostgresConfig",
  properties: {
    type: literal("postgres"),
    host: string({ description: "PostgreSQL 主机地址" }),
    port: int32({ description: "PostgreSQL 端口" }),
    username: string({ description: "数据库用户名" }),
    password: string({ description: "数据库密码" }),
    auth: taggedUnion({
      id: "PostgresAuth",
      discriminator: "method",
      variants: {
        password: record({
          id: "AuthPassword",
          properties: { method: literal("password"), username: string(), password: string() },
        }),
        cert: record({
          id: "AuthCert",
          properties: { method: literal("cert"), certFile: string(), keyFile: string() },
        }),
      },
    }),
  },
})

const SqliteConfig = record({
  id: "SqliteConfig",
  properties: {
    type: literal("sqlite"),
    name: string({ description: "SQLite 数据库文件名" }),
  },
})

const ServerConfig = record({
  id: "ServerConfig",
  title: "服务端配置",
  properties: {
    port: int32({ description: "监听端口" }),
    host: string({ description: "监听地址" }),
    logLevel: enums({ id: "LogLevel", variants: { debug: "debug", info: "info", warn: "warn", error: "error" } }),
    tags: array({ base: string(), description: "标签列表" }),
    allowedPorts: set({ base: int32(), description: "允许的端口集合" }),
    database: taggedUnion({
      id: "DatabaseConfig",
      discriminator: "type",
      variants: {
        postgres: PostgresConfig,
        sqlite: SqliteConfig,
      },
    }),
    cache: union({
      id: "CacheConfig",
      variants: {
        redis: record({
          id: "RedisCache",
          properties: { url: string(), prefix: string() },
          optional: ["prefix"],
        }),
        memory: record({
          id: "MemoryCache",
          properties: { maxSize: int32(), ttl: int32() },
          optional: ["ttl"],
        }),
      },
    }),
  },
  optional: ["logLevel", "tags", "allowedPorts", "cache"],
})

const router = routerModel({
  name: "Warehouses",
  routes: {
    listWarehouses: route({
    method: "GET",
    path: "/warehouses",
    summary: "获取仓库列表",
    description: "返回所有仓库的列表",
    responses: {
      "200": json({ summary: "仓库列表", body: array({ base: Warehouse }) }),
    },
  }),

  getWarehouse: route({
    method: "GET",
    path: "/warehouses/{id}",
    summary: "获取单个仓库",
    description: "根据ID获取指定仓库",
    variables: { id: int32({ description: "仓库ID" }) },
    responses: {
      "200": json({ summary: "仓库详情", body: Warehouse }),
      "404": json({ summary: "仓库不存在", body: ErrorResponse }),
    },
  }),

  createWarehouse: route({
    method: "POST",
    path: "/warehouses",
    summary: "创建仓库",
    description: "创建一个新仓库",
    body: CreateWarehouse,
    responses: {
      "201": json({ summary: "创建成功", body: Warehouse }),
      "400": json({ summary: "请求参数错误", body: ErrorResponse }),
    },
  }),

  updateWarehouse: route({
    method: "PUT",
    path: "/warehouses/{id}",
    summary: "更新仓库",
    description: "更新指定仓库的信息",
    variables: { id: int32({ description: "仓库ID" }) },
    body: UpdateWarehouse,
    responses: {
      "200": json({ summary: "更新成功", body: Warehouse }),
      "404": json({ summary: "仓库不存在", body: ErrorResponse }),
    },
  }),

  deleteWarehouse: route({
    method: "DELETE",
    path: "/warehouses/{id}",
    summary: "删除仓库",
    description: "删除指定仓库",
    variables: { id: int32({ description: "仓库ID" }) },
    responses: {
      "204": json({ summary: "删除成功" }),
      "404": json({ summary: "仓库不存在", body: ErrorResponse }),
    },
  }),

  exportWarehouses: route({
    method: "GET",
    path: "/warehouses/export",
    summary: "导出仓库数据",
    description: "以二进制格式导出所有仓库数据",
    responses: {
      "200": binaryResponse({ summary: "导出文件" }),
    },
  }),
  },
})

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = resolve(__dirname, "..", "output")
mkdirSync(outDir, { recursive: true })

// Security components
const apiKeyAuth = apikey({
  id: "xApiKey",
  name: "X-API-Key",
  description: "API Key 认证",
})

const keycloak = openIdConnect({
  id: "keycloak",
  description: "Keycloak OIDC 认证",
  scopes: ["read:warehouses", "write:warehouses"],
})

// Security policy
const methodGetPostPutDelete: HttpMethod[] = ["GET", "POST", "PUT", "DELETE"]

const securityPolicy: SecurityPolicyModel = {
  name: "default",
  paths: {
    "^/warehouses$": {
      pipeline: [
        apiKeyAuth.apply(),
        keycloak.apply("read:warehouses"),
      ],
    },
    "^/warehouses/": {
      methods: methodGetPostPutDelete,
      pipeline: [
        apiKeyAuth.apply(),
        keycloak.apply("read:warehouses", "write:warehouses"),
      ],
    },
  },
}

const keycloakDeployment = deployOpenIdConnect({
  component: keycloak,
  issuer: "https://keycloak.example.com",
})

// 1. OpenAPI spec
const { openapi } = generateOpenapi({
  info: { title: "Warehouse API", version: "1.0.0", description: "仓库管理 CRUD API" },
  servers: [{ url: "http://localhost:3000", description: "本地开发服务器" }],
  routers: [router],
  security: {
    policy: securityPolicy,
    deployments: { keycloak: keycloakDeployment },
  },
})

writeFileSync(resolve(outDir, "openapi.json"), JSON.stringify(openapi, null, 2), "utf-8")
console.log("✅ openapi.json")

// 2. Server config JSON Schema
const configSchema = mergeJsonSchemas({ ServerConfig, PostgresConfig, SqliteConfig, AuthPassword: record({ id: "AuthPassword", properties: { method: literal("password"), username: string(), password: string() } }), AuthCert: record({ id: "AuthCert", properties: { method: literal("cert"), certFile: string(), keyFile: string() } }), RedisCache: record({ id: "RedisCache", properties: { url: string(), prefix: string() }, optional: ["prefix"] }), MemoryCache: record({ id: "MemoryCache", properties: { maxSize: int32(), ttl: int32() }, optional: ["ttl"] }) })

writeFileSync(resolve(outDir, "server-config.schema.json"), JSON.stringify(configSchema, null, 2), "utf-8")
console.log("✅ server-config.schema.json")

// 3. Codegen model collection demo
const allModels = [Warehouse, CreateWarehouse, UpdateWarehouse, ErrorResponse]
const named = collectNamedModels(allModels)
const ops = collectOperations([router])

console.log(`  → ${named.length} named models collected`)
console.log(`  → ${ops.length} operations collected`)
