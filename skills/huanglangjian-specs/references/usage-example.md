# Usage example

Complete warehouse CRUD example:

```ts
import { int32, string, datetime, array, record, enums, set, literal, taggedUnion, union } from "@huanglangjian/specs"
import { route, json, binary as binaryResponse, router } from "@huanglangjian/specs"
import { generateOpenapi } from "@huanglangjian/specs"
import { generateJsonSchema } from "@huanglangjian/specs"
import { apikey, openIdConnect } from "@huanglangjian/specs"
import { deployOpenIdConnect } from "@huanglangjian/specs"
import { zodToJsonSchema } from "zod-to-json-schema"

// 1. Define data models
const Warehouse = record({
  id: "Warehouse",
  title: "仓库",
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
  properties: { message: string({ description: "错误信息" }) },
})

// 2. Define server config with complex types
const PostgresConfig = record({
  id: "PostgresConfig",
  properties: {
    type: literal("postgres"),
    host: string({ description: "主机地址" }),
    port: int32({ description: "端口" }),
    username: string({ description: "数据库用户名" }),
    password: string({ description: "数据库密码" }),
  },
})

const SqliteConfig = record({
  id: "SqliteConfig",
  properties: { type: literal("sqlite"), name: string({ description: "数据库文件名" }) },
})

const ServerConfig = record({
  id: "ServerConfig",
  title: "服务端配置",
  description: "服务端运行时配置",
  properties: {
    port: int32({ description: "监听端口" }),
    host: string({ description: "监听地址" }),
    logLevel: enums({
      id: "LogLevel",
      variants: { debug: "debug", info: "info", warn: "warn", error: "error" },
    }),
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
        redis: record({ id: "RedisCache", properties: { url: string({ description: "Redis 连接地址" }), prefix: string({ description: "缓存键前缀" }) }, optional: ["prefix"] }),
        memory: record({ id: "MemoryCache", properties: { maxSize: int32({ description: "最大缓存条目数" }), ttl: int32({ description: "缓存过期秒数" }) }, optional: ["ttl"] }),
      },
    }),
  },
  optional: ["logLevel", "cache"],
})

// 3. Define routes — use router() factory, no tags needed (auto from id)
const router = router({
  id: "Warehouses",
  routes: {
    listWarehouses: route({
      method: "GET",
      path: "/warehouses",
      summary: "获取仓库列表",
      responses: { "200": json({ summary: "仓库列表", body: array({ base: Warehouse }) }) },
    }),
    getWarehouse: route({
      method: "GET",
      path: "/warehouses/{id}",
      variables: { id: int32({ description: "仓库ID" }) },
      responses: {
        "200": json({ summary: "仓库详情", body: Warehouse }),
        "404": json({ summary: "仓库不存在", body: ErrorResponse }),
      },
    }),
    createWarehouse: route({
      method: "POST",
      path: "/warehouses",
      body: CreateWarehouse,
      responses: {
        "201": json({ summary: "创建成功", body: Warehouse }),
        "400": json({ summary: "请求参数错误", body: ErrorResponse }),
      },
    }),
    updateWarehouse: route({
      method: "PUT",
      path: "/warehouses/{id}",
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
      variables: { id: int32({ description: "仓库ID" }) },
      responses: {
        "204": json({ summary: "删除成功" }),
        "404": json({ summary: "仓库不存在", body: ErrorResponse }),
      },
    }),
    exportWarehouses: route({
      method: "GET",
      path: "/warehouses/export",
      responses: { "200": binaryResponse({ summary: "导出文件" }) },
    }),
  },
})

// 4. Security
const apiKeyAuth = apikey({ id: "xApiKey", name: "X-API-Key" })
const keycloak = openIdConnect({ id: "keycloak", scopes: ["read:warehouses", "write:warehouses"] })

const securityPolicy = {
  name: "default",
  paths: {
    "^/warehouses$": { pipeline: [apiKeyAuth.apply(), keycloak.apply("read:warehouses")] },
    "^/warehouses/": {
      methods: ["GET", "POST", "PUT", "DELETE"],
      pipeline: [apiKeyAuth.apply(), keycloak.apply("read:warehouses", "write:warehouses")],
    },
  },
}

const keycloakDeployment = deployOpenIdConnect({ component: keycloak, issuer: "https://keycloak.example.com" })

// 5. Generate OpenAPI spec
const { openapi } = generateOpenapi({
  info: { title: "Warehouse API", version: "1.0.0" },
  routers: [router],
  security: { policy: securityPolicy, deployments: { keycloak: keycloakDeployment } },
  // Optional: library-specific adapter to extract Zod/Valibot schema metadata (default, format, etc.)
  toJsonSchema: (schema) => zodToJsonSchema(schema as any),
})
// → write: JSON.stringify(openapi, null, 2)

// 6. Generate server config JSON Schema
const configSchema = generateJsonSchema(ServerConfig)
// → JSON Schema with $schema + properties + $defs
```
