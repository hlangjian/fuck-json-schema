import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

import { binary as binaryResponse, json, route, routerModel } from "@huanglangjian/specs"
import { array, datetime, enums, int32, literal, record, set, string, taggedUnion, union } from "@huanglangjian/specs"
import { generateTsServer } from "./server"
import { generateTsClient } from "./client"

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

// 1. Server handler code
const serverFiles = generateTsServer({
  routers: [router],
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
  routers: [router],
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
