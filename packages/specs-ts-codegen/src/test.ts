import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

import { binary as binaryResponse, json, route, router } from "@huanglangjian/specs"
import { array, datetime, enums, int32, literal, record, set, string, taggedUnion, union } from "@huanglangjian/specs"

import { generateTsClient } from "./client"
import { generateTsServer } from "./server"

const Warehouse = record({
  id: "Warehouse",
  title: "仓库",
  description: "仓库信息",
  examples: [{ id: 1, name: "默认仓库", location: "北京", capacity: 1000, createdAt: "2024-01-01T00:00:00Z" }],
  properties: {
    id: int32({ description: "仓库ID" }),
    name: string({ description: "仓库名称" }),
    location: string({ description: "仓库位置" }),
    capacity: int32({ description: "最大容量", default: 100 }),
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

const WarehouseType = enums({
  id: "WarehouseType",
  title: "仓库类型",
  variants: { cold: "cold", dry: "dry", hazmat: "hazmat" },
})

const OldWarehouse = record({
  id: "OldWarehouse",
  title: "旧仓库",
  description: "已废弃的仓库模型",
  deprecated: true,
  properties: {
    name: string({ description: "仓库名称" }),
    legacyCode: string({ description: "旧编码", deprecated: true }),
  },
})

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
  description: "服务端运行时配置",
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

const warehousesRouter = router({
  id: "Warehouses",
  description: "仓库管理 API 集合",
  routes: {
    listWarehouses: route({
      method: "GET",
      path: "/warehouses",
      summary: "获取仓库列表",
      description: "返回所有仓库的列表",
      responses: {
        200: json({ summary: "仓库列表", body: array({ base: Warehouse }) }),
      },
    }),

    getWarehouse: route({
      method: "GET",
      path: "/warehouses/{id}",
      summary: "获取单个仓库",
      description: "根据ID获取指定仓库",
      variables: { id: int32({ description: "仓库ID" }) },
      responses: {
        200: json({ summary: "仓库详情", body: Warehouse }),
        404: json({ summary: "仓库不存在", body: ErrorResponse }),
      },
    }),

    createWarehouse: route({
      method: "POST",
      path: "/warehouses",
      summary: "创建仓库",
      description: "创建一个新仓库",
      body: CreateWarehouse,
      responses: {
        201: json({ summary: "创建成功", body: Warehouse }),
        400: json({ summary: "请求参数错误", body: ErrorResponse }),
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
        200: json({ summary: "更新成功", body: Warehouse }),
        404: json({ summary: "仓库不存在", body: ErrorResponse }),
      },
    }),

    deleteWarehouse: route({
      method: "DELETE",
      path: "/warehouses/{id}",
      summary: "删除仓库",
      description: "删除指定仓库",
      variables: { id: int32({ description: "仓库ID" }) },
      responses: {
        204: json({ summary: "删除成功" }),
        404: json({ summary: "仓库不存在", body: ErrorResponse }),
      },
    }),

    exportWarehouses: route({
      method: "GET",
      path: "/warehouses/export",
      summary: "导出仓库数据",
      description: "以二进制格式导出所有仓库数据",
      deprecated: true,
      responses: {
        200: binaryResponse({ summary: "导出文件" }),
      },
    }),
    searchWarehouses: route({
      method: "GET",
      path: "/warehouses/search",
      summary: "搜索仓库",
      description: "按条件搜索仓库列表",
      queries: record({
        id: "WarehouseQuery",
        properties: {
          keyword: string({ description: "搜索关键词" }),
          type: WarehouseType,
          tags: array({ base: string(), description: "标签过滤" }),
        },
        optional: ["keyword", "type", "tags"],
      }),
      headers: record({
        id: "SearchHeaders",
        properties: {
          "x-trace-id": string({ description: "链路追踪ID" }),
          "x-tenant-id": string({ description: "租户ID" }),
        },
        optional: ["x-trace-id"],
      }),
      responses: {
        200: json({ summary: "搜索结果", body: array({ base: Warehouse }) }),
      },
    }),
    getOldWarehouse: route({
      method: "GET",
      path: "/warehouses/old/{id}",
      summary: "获取旧仓库",
      description: "根据ID获取旧仓库（已废弃）",
      deprecated: true,
      variables: { id: int32({ description: "仓库ID" }) },
      responses: {
        200: json({ summary: "旧仓库详情", body: OldWarehouse }),
        404: json({ summary: "仓库不存在", body: ErrorResponse }),
      },
    }),
  },
})

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = resolve(__dirname, "..", "output")
mkdirSync(outDir, { recursive: true })

// 1. Server handler code
const serverFiles = generateTsServer({
  routers: [warehousesRouter],
  configuration: ServerConfig,
})
const serverOutDir = resolve(outDir, "server-handlers")
rmSync(serverOutDir, { recursive: true, force: true })
mkdirSync(serverOutDir, { recursive: true })
for (const [path, content] of Object.entries(serverFiles)) {
  const full = resolve(serverOutDir, path)
  mkdirSync(dirname(full), { recursive: true })
  writeFileSync(full, content, "utf-8")
}
console.log(`✅ server-handlers (${Object.keys(serverFiles).length} files)`)

// 2. TypeScript client code
const clientFiles = generateTsClient({
  routers: [warehousesRouter],
})
const clientOutDir = resolve(outDir, "api-client")
rmSync(clientOutDir, { recursive: true, force: true })
mkdirSync(clientOutDir, { recursive: true })
for (const [path, content] of Object.entries(clientFiles)) {
  const full = resolve(clientOutDir, path)
  mkdirSync(dirname(full), { recursive: true })
  writeFileSync(full, content, "utf-8")
}
console.log(`✅ api-client (${Object.keys(clientFiles).length} files)`)

// 3. Valibot server handler code
const vbServerFiles = generateTsServer({
  routers: [warehousesRouter],
  configuration: ServerConfig,
  validationLib: "valibot",
})
const vbServerOutDir = resolve(outDir, "server-handlers-valibot")
rmSync(vbServerOutDir, { recursive: true, force: true })
mkdirSync(vbServerOutDir, { recursive: true })
for (const [path, content] of Object.entries(vbServerFiles)) {
  const full = resolve(vbServerOutDir, path)
  mkdirSync(dirname(full), { recursive: true })
  writeFileSync(full, content, "utf-8")
}
console.log(`✅ server-handlers-valibot (${Object.keys(vbServerFiles).length} files)`)

// 4. Valibot client code
const vbClientFiles = generateTsClient({
  routers: [warehousesRouter],
  validationLib: "valibot",
})
const vbClientOutDir = resolve(outDir, "api-client-valibot")
rmSync(vbClientOutDir, { recursive: true, force: true })
mkdirSync(vbClientOutDir, { recursive: true })
for (const [path, content] of Object.entries(vbClientFiles)) {
  const full = resolve(vbClientOutDir, path)
  mkdirSync(dirname(full), { recursive: true })
  writeFileSync(full, content, "utf-8")
}
console.log(`✅ api-client-valibot (${Object.keys(vbClientFiles).length} files)`)
