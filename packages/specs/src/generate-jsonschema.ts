import type { StandardTypedV1 } from "@standard-schema/spec"

import type { JsonSchema, JsonSchemaObject } from "./schemas/json-schema-draft-2020-12"
import type { Models } from "./types"

export interface SchemaRegistry {
  getRef: (model: Models) => string | undefined
  add: (id: string, model: Models) => SchemaRegistry
  /** Collect schemas of all registered models for use in $defs / components/schemas. */
  getDefs(): Record<string, JsonSchema>
}

/**
 * Internal: converts a single model into its JSON Schema representation.
 * Does NOT include $schema wrapper or $defs — use generateJsonSchema() for the full document.
 */
export interface BuildJsonSchemaOptions {
  model: Models
  registry?: SchemaRegistry
  /**
   * 将模型的 `StandardTypedV1` schema 翻译成附加的 JSON Schema 字段
   *（如 format、pattern、examples 等）。
   *
   * StandardTypedV1 是 Standard 家族所有接口的基类型：
   * - `StandardSchemaV1` —— 纯验证 schema（zod、valibot、arktype），
   *   有 `validate()` 但没有 JSON Schema 生成能力
   * - `StandardJSONSchemaV1` —— 自带 `.jsonSchema` 转换器的 schema
   *   （库自行实现的扩展，很少见）
   *
   * 大多数库产出的是 `StandardSchemaV1`，这意味着如果你给模型绑定了
   * `schema: z.string().email()`，验证时知道它是 email，但生成 JSON Schema
   * 时无法自动得出 `format: "email"`。每个库需要自己的适配器：
   *
   * ```ts
   * // zod
   * toJsonSchema: (schema) => zodToJsonSchema(schema as ZodSchema)
   *
   * // valibot — 需要独立的包
   * import { toJsonSchema as vbToJson } from "@valibot/to-json-schema"
   * toJsonSchema: (schema) => vbToJson(schema as GenericSchema)
   * ```
   *
   * 返回的 `JsonSchemaObject` 会被浅合并到最终 schema 节点上。
   */
  toJsonSchema?: (type?: StandardTypedV1) => JsonSchemaObject
}

export interface BuildJsonSchemaResult {
  jsonSchema: JsonSchema
  registry: SchemaRegistry
}

/**
 * 内部函数：将单个模型转换为 JSON Schema 片段（不含 $schema 和 $defs）。
 *
 * 已在 registry 注册的命名模型会生成 $ref 指针，未注册的则内联展开。
 * `toJsonSchema` 回调负责将 StandardSchema 翻译为 JSON Schema 字段，
 * 详见 {@link BuildJsonSchemaOptions.toJsonSchema}。
 *
 * 如需完整的 JSON Schema 文档，请使用 `generateJsonSchema()`。
 */
export function buildJsonSchema(options: BuildJsonSchemaOptions): BuildJsonSchemaResult {
  const { model, toJsonSchema = () => ({}) } = options

  const registry = options.registry ?? createJsonSchemaRegistry()

  const schema = toJsonSchema(model.schema)

  switch (model.kind) {
    case "int32":
      return {
        jsonSchema: { ...schema, type: "integer", format: "int32" },
        registry,
      }

    case "float32":
      return {
        jsonSchema: { ...schema, type: "number", format: "float" },
        registry,
      }

    case "float64":
      return {
        jsonSchema: { ...schema, type: "number", format: "float" },
        registry,
      }

    case "boolean":
      return {
        jsonSchema: { ...schema, type: "boolean" },
        registry,
      }

    case "null":
      return {
        jsonSchema: { ...schema, type: "null" },
        registry,
      }

    case "enums":
      return {
        jsonSchema: { ...schema, type: "string", enum: Object.values(model.variants) },
        registry,
      }

    case "datetime":
      return {
        jsonSchema: { ...schema, type: "string", format: "date-time" },
        registry,
      }

    case "date":
      return {
        jsonSchema: { ...schema, type: "string", format: "date" },
        registry,
      }

    case "duration":
      return {
        jsonSchema: { ...schema, type: "string", format: "duration" },
        registry,
      }

    case "uuid":
      return {
        jsonSchema: { ...schema, type: "string", format: "uuid" },
        registry,
      }

    case "literal":
      return {
        jsonSchema: { ...schema, const: model.value },
        registry,
      }

    case "string":
      return {
        jsonSchema: { ...schema, type: "string" },
        registry,
      }

    case "array": {
      const ref = registry.getRef(model.base)
      if (ref) {
        return {
          jsonSchema: { ...schema, type: "array", items: { $ref: ref } },
          registry,
        }
      }

      const { jsonSchema, registry: newRegistry } = buildJsonSchema({
        model: model.base,
        registry,
        toJsonSchema,
      })

      return {
        jsonSchema: { ...schema, type: "array", items: jsonSchema },
        registry: newRegistry,
      }
    }

    case "map": {
      const ref = registry.getRef(model.base)
      if (ref) {
        return {
          jsonSchema: { ...schema, type: "object", additionalProperties: { $ref: ref } },
          registry,
        }
      }

      const { jsonSchema, registry: newRegistry } = buildJsonSchema({
        model: model.base,
        registry,
        toJsonSchema,
      })

      return {
        jsonSchema: { ...schema, type: "object", additionalProperties: jsonSchema },
        registry: newRegistry,
      }
    }

    case "set": {
      const ref = registry.getRef(model.base)
      if (ref) {
        return {
          jsonSchema: { ...schema, type: "array", items: { $ref: ref }, uniqueItems: true },
          registry,
        }
      }

      const { jsonSchema, registry: newRegistry } = buildJsonSchema({
        model: model.base,
        registry,
        toJsonSchema,
      })

      return {
        jsonSchema: { ...schema, type: "array", items: jsonSchema, uniqueItems: true },
        registry: newRegistry,
      }
    }

    case "record": {
      const result = Object.entries(model.properties).reduce<{
        registry: SchemaRegistry
        properties: Record<string, JsonSchema>
      }>(
        (acc, [key, propModel]) => {
          const ref = acc.registry.getRef(propModel)

          if (ref) {
            return {
              registry: acc.registry,
              properties: { ...acc.properties, [key]: { $ref: ref } },
            }
          }

          const generated = buildJsonSchema({
            model: propModel,
            registry: acc.registry,
            toJsonSchema,
          })

          return {
            registry: generated.registry,
            properties: { ...acc.properties, [key]: generated.jsonSchema },
          }
        },
        { registry, properties: {} as Record<string, JsonSchema> },
      )

      return {
        jsonSchema: {
          ...schema,
          type: "object",
          required: model.required,
          additionalProperties: false,
          properties: result.properties,
        },
        registry: result.registry,
      }
    }

    case "union": {
      const result = Object.entries(model.variants).reduce<{
        registry: SchemaRegistry
        oneOf: JsonSchema[]
      }>(
        (acc, [key, variantModel]) => {
          const ref = acc.registry.getRef(variantModel)

          if (ref) {
            return {
              registry: acc.registry,
              oneOf: [
                ...acc.oneOf,
                {
                  type: "object",
                  required: [key],
                  properties: { [key]: { $ref: ref } },
                } satisfies JsonSchemaObject,
              ],
            }
          }

          const generated = buildJsonSchema({
            model: variantModel,
            registry: acc.registry,
            toJsonSchema,
          })

          return {
            registry: generated.registry,
            oneOf: [
              ...acc.oneOf,
              {
                type: "object",
                required: [key],
                properties: { [key]: generated.jsonSchema },
              } satisfies JsonSchemaObject,
            ],
          }
        },
        { registry, oneOf: [] as JsonSchema[] },
      )

      return {
        jsonSchema: { ...schema, oneOf: result.oneOf },
        registry: result.registry,
      }
    }

    case "taggedUnion": {
      const result = Object.entries(model.variants).reduce<{
        registry: SchemaRegistry
        oneOf: JsonSchema[]
      }>(
        (acc, [, variantModel]) => {
          const ref = acc.registry.getRef(variantModel)

          if (ref) {
            return {
              registry: acc.registry,
              oneOf: [...acc.oneOf, { $ref: ref }],
            }
          }

          const generated = buildJsonSchema({
            model: variantModel,
            registry: acc.registry,
            toJsonSchema,
          })

          return {
            registry: generated.registry,
            oneOf: [...acc.oneOf, generated.jsonSchema],
          }
        },
        { registry, oneOf: [] as JsonSchema[] },
      )

      return {
        jsonSchema: { ...schema, oneOf: result.oneOf },
        registry: result.registry,
      }
    }
    case "unknown": {
      return { jsonSchema: { ...schema }, registry }
    }
  }
}

export type ToJsonSchema = (type?: StandardTypedV1) => JsonSchemaObject

export function createJsonSchemaRegistry(
  models?: Map<string, { id: string; schema: JsonSchema }>,
  toJsonSchema?: ToJsonSchema,
): SchemaRegistry {
  const map = new Map<string, { id: string; schema: JsonSchema }>(models)

  const registry: SchemaRegistry = {
    getRef(model) {
      if (typeof model !== "object" || model === null || !("id" in model)) return undefined
      const entry = map.get(model.id as string)
      return entry ? "#/$defs/" + entry.id : undefined
    },
    add(id, model) {
      const { jsonSchema } = buildJsonSchema({ model, registry, toJsonSchema })
      return createJsonSchemaRegistry(map.set(id, { id, schema: jsonSchema }), toJsonSchema)
    },
    getDefs() {
      const defs: Record<string, JsonSchema> = {}
      map.forEach(({ id, schema }) => { defs[id] = schema })
      return defs
    },
  }

  return registry
}

export function createOpenapiSchemaRegistry(
  models?: Map<string, { id: string; schema: JsonSchema }>,
  toJsonSchema?: ToJsonSchema,
): SchemaRegistry {
  const map = new Map<string, { id: string; schema: JsonSchema }>(models)

  const registry: SchemaRegistry = {
    getRef(model) {
      if (typeof model !== "object" || model === null || !("id" in model)) return undefined
      const entry = map.get(model.id as string)
      return entry ? "#/components/schemas/" + entry.id : undefined
    },
    add(id, model) {
      const { jsonSchema } = buildJsonSchema({ model, registry, toJsonSchema })
      return createOpenapiSchemaRegistry(map.set(id, { id, schema: jsonSchema }), toJsonSchema)
    },
    getDefs() {
      const defs: Record<string, JsonSchema> = {}
      map.forEach(({ id, schema }) => { defs[id] = schema })
      return defs
    },
  }

  return registry
}

/**
 * 自动遍历模型树，收集所有带 `id` 的命名子模型，注册到 registry 中。
 */
function collectNamedModels(model: Models): Models[] {
  const seen = new Set<Models>()
  const out: Models[] = []
  const walk = (m: Models) => {
    if (seen.has(m)) return
    seen.add(m)
    if (typeof m === "object" && m !== null && "id" in m) out.push(m)
    if (m.kind === "record") {
      Object.values(m.properties).forEach((v) => walk(v))
    } else if (m.kind === "union" || m.kind === "taggedUnion") {
      Object.values(m.variants).forEach((v) => walk(v))
    } else if (m.kind === "array" || m.kind === "set" || m.kind === "map") {
      walk(m.base)
    }
  }
  walk(model)
  // 排除根模型自身，只返回子依赖
  return out.filter((m) => m !== model)
}

/**
 * 为一个模型生成完整的 JSON Schema（Draft 2020-12）。
 *
 * 自动遍历模型树发现所有命名子模型（带 `id` 的 record / enum / union / taggedUnion），
 * 注册到 registry 后，根模型的属性通过 $ref 指向子模型，子模型的 schema 放入 $defs。
 *
 * 如需额外注入库特有的 JSON Schema 字段（如 zod 的 format），
 * 请使用底层的 {@link buildJsonSchema} 并传入 `toJsonSchema` 回调。
 *
 * @example
 * generateJsonSchema(ServerConfig)
 * // → { $schema: "...", type: "object", properties: { database: { $ref: "#/$defs/DatabaseConfig" } }, $defs: {...} }
 */
export function generateJsonSchema(
  model: Models,
  options?: { toJsonSchema?: ToJsonSchema },
): JsonSchemaObject {
  const deps = collectNamedModels(model)
  const toJsonSchema = options?.toJsonSchema
  const registry = deps.reduce(
    (reg, m) => reg.add((m as { id: string }).id, m),
    createJsonSchemaRegistry(undefined, toJsonSchema),
  )
  const { jsonSchema } = buildJsonSchema({ model, registry, toJsonSchema })
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    ...(jsonSchema as Record<string, unknown>),
    $defs: registry.getDefs(),
  } as JsonSchemaObject
}
