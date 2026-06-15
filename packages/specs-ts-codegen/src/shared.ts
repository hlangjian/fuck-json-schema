import type { Models } from "@huanglangjian/specs"
import { topologicalSortSchemaMap } from "@huanglangjian/specs"
import type { SchemaMap } from "@huanglangjian/specs"
import { camelCase } from "text-case"
import type { ValidationLib } from "./validation-lib"

/**
 * 遍历模型树，将带 `id` 的命名子模型注册到 schemaMap 中。
 * 用于注册路由未引用但需要生成类型定义的游离模型。
 */
export function addModelsToSchemaMap(models: Models[], schemaMap: SchemaMap): void {
  const seen = new Set<Models>()
  const walk = (m: Models) => {
    if (seen.has(m)) return
    seen.add(m)

    if ("id" in m && !schemaMap.has(m.id)) {
      schemaMap.set(m.id, m)
    }

    if (m.kind === "record") {
      Object.values(m.properties).forEach((v) => walk(v))
    } else if (m.kind === "union" || m.kind === "taggedUnion") {
      Object.values(m.variants).forEach((v) => walk(v))
    } else if (m.kind === "array" || m.kind === "set" || m.kind === "map") {
      walk(m.base)
    }
  }
  for (const model of models) walk(model)
}

function jsdocTags(model: {
  description?: string
  deprecated?: boolean
  examples?: unknown[]
  default?: unknown
}): string[] {
  const tags: string[] = []
  if (model.description) tags.push(`@description ${model.description}`)
  if (model.deprecated) tags.push("@deprecated")
  if (model.examples && model.examples.length > 0) {
    tags.push(`@example ${JSON.stringify(model.examples[0])}`)
  }
  if (model.default !== undefined) {
    tags.push(`@default ${JSON.stringify(model.default)}`)
  }
  return tags
}

function jsdocBlock(model: {
  description?: string
  deprecated?: boolean
  examples?: unknown[]
  default?: unknown
}): string | null {
  const tags = jsdocTags(model)
  if (tags.length === 0) return null
  return `/**\n * ${tags.join("\n * ")}\n */`
}

export function fieldJsdoc(field: { title?: string; description?: string; deprecated?: boolean; default?: unknown }, indent = ""): string | null {
  const desc = field.description || field.title
  if (!desc && !field.deprecated && field.default === undefined) return null
  const parts: string[] = []
  if (desc) parts.push(`@description ${desc}`)
  if (field.deprecated) parts.push("@deprecated")
  if (field.default !== undefined) parts.push(`@default ${JSON.stringify(field.default)}`)
  return `${indent}/**\n${indent} * ${parts.join(`\n${indent} * `)}\n${indent} */`
}

export function generateModels(
  schemaMap: SchemaMap,
  identifier: (s: string) => string,
  lib: ValidationLib,
  namespace?: string,
): string {
  const lines: string[] = []
  lines.push(lib.importStmt)
  lines.push("")

  for (const [id, m] of topologicalSortSchemaMap(schemaMap)) {
    const schemaName = camelCase(id) + "Schema"
    const tsName = identifier(id)
    const docBlock = jsdocBlock(m)

    switch (m.kind) {
      case "record": {
        const required = m.required as string[]
        lines.push(`export const ${schemaName} = ${lib.ns}.object({`)
        for (const [name, fieldModel] of Object.entries(m.properties)) {
          const expr = toSchema(fieldModel, schemaMap, lib)
          const finalExpr = required.includes(name as any)
            ? expr
            : lib.optional(expr, modelDefault(fieldModel))
          lines.push(`  ${name}: ${finalExpr},`)
        }
        lines.push(`})`)
        lines.push("")

        if (docBlock) lines.push(docBlock)
        lines.push(`export interface ${tsName} {`)
        for (const [name, fieldModel] of Object.entries(m.properties)) {
          const doc = fieldJsdoc(fieldModel, "  ")
          if (doc) lines.push(doc)
          const opt = required.includes(name as any) ? "" : "?"
          const tsType = toTs(fieldModel, schemaMap, identifier, namespace)
          lines.push(`  ${name}${opt}: ${tsType};`)
        }
        lines.push(`}`)
        lines.push("")
        break
      }
      case "enums": {
        lines.push(`export const ${schemaName} = ${lib.enums(Object.values(m.variants))}`)
        if (docBlock) lines.push(docBlock)
        lines.push(`export type ${tsName} = ${lib.infer(schemaName)}`)
        lines.push("")
        break
      }
      case "union": {
        const unionItems = Object.values(m.variants).map((v) => toSchema(v, schemaMap, lib))
        lines.push(`export const ${schemaName} = ${lib.union(unionItems)}`)
        if (docBlock) lines.push(docBlock)
        lines.push(`export type ${tsName} = ${lib.infer(schemaName)}`)
        lines.push("")
        break
      }
      case "taggedUnion": {
        const unionItems = Object.values(m.variants).map((v) => toSchema(v, schemaMap, lib))
        lines.push(`export const ${schemaName} = ${lib.discriminatedUnion(m.discriminator, unionItems)}`)
        if (docBlock) lines.push(docBlock)
        lines.push(`export type ${tsName} = ${lib.infer(schemaName)}`)
        lines.push("")
        break
      }
      default:
        break
    }
  }

  return lines.join("\n")
}

export function toSchema(model: Models, schemaMap: SchemaMap, lib: ValidationLib): string {
  switch (model.kind) {
    case "int32":
      return lib.int32()
    case "float32":
    case "float64":
      return lib.float32()
    case "boolean":
      return lib.boolean()
    case "string":
      return lib.string()
    case "datetime":
      return lib.datetime()
    case "date":
      return lib.date()
    case "duration":
      return lib.duration()
    case "literal":
      return lib.literal(model.value)
    case "null":
      return lib.null()
    case "array":
      return lib.array(toSchema(model.base, schemaMap, lib))
    case "set":
      return lib.set(toSchema(model.base, schemaMap, lib))
    case "map":
      return lib.map(lib.string(), toSchema(model.base, schemaMap, lib))
    case "enums":
      return lib.enums(Object.values(model.variants))
    case "record": {
      return schemaMap.has(model.id) ? camelCase(model.id) + "Schema" : lib.unknown()
    }
    case "union": {
      if (schemaMap.has(model.id)) return camelCase(model.id) + "Schema"
      const unionItems = Object.values(model.variants).map((v) => toSchema(v, schemaMap, lib))
      return lib.union(unionItems)
    }
    case "taggedUnion": {
      if (schemaMap.has(model.id)) return camelCase(model.id) + "Schema"
      const unionItems = Object.values(model.variants).map((v) => toSchema(v, schemaMap, lib))
      return lib.discriminatedUnion(model.discriminator, unionItems)
    }
    default:
      return lib.unknown()
  }
}

export function toSchemaEnv(model: Models, schemaMap: SchemaMap, lib: ValidationLib): string {
  switch (model.kind) {
    case "array":
      return lib.envArray(toSchema(model.base, schemaMap, lib))
    case "set":
      return lib.envSet(toSchema(model.base, schemaMap, lib))
    case "map":
      throw new Error("unsupported configuration value of kind map")
    default:
      return toSchema(model, schemaMap, lib)
  }
}

export function toTs(
  model: Models,
  schemaMap: SchemaMap,
  identifier: (s: string) => string,
  namespace?: string,
): string {
  void namespace
  switch (model.kind) {
    case "int32":
    case "float32":
    case "float64":
      return "number"
    case "boolean":
      return "boolean"
    case "string":
    case "datetime":
    case "date":
    case "duration":
      return "string"
    case "literal":
      return JSON.stringify(model.value)
    case "null":
      return "null"
    case "array":
    case "set":
      return `${toTs(model.base, schemaMap, identifier, namespace)}[]`
    case "map":
      return `Record<string, ${toTs(model.base, schemaMap, identifier, namespace)}>`
    case "enums": {
      if (schemaMap.has(model.id)) return identifier(model.id)
      return Object.values(model.variants)
        .map((v) => JSON.stringify(v))
        .join(" | ")
    }
    case "record": {
      return schemaMap.has(model.id) ? identifier(model.id) : "unknown"
    }
    case "union":
    case "taggedUnion": {
      if (schemaMap.has(model.id)) return identifier(model.id)
      return Object.values(model.variants)
        .map((v) => toTs(v as Models, schemaMap, identifier, namespace))
        .join(" | ")
    }
    default:
      return "unknown"
  }
}

export function resolveSchemaExpr(model: Models, schemaMap: SchemaMap, lib: ValidationLib): string | null {
  switch (model.kind) {
    case "record":
    case "union":
    case "taggedUnion":
    case "enums": {
      return schemaMap.has(model.id) ? camelCase(model.id) + "Schema" : null
    }
    case "array":
    case "set": {
      const inner = resolveSchemaExpr(model.base, schemaMap, lib)
      return inner ? lib.array(inner) : null
    }
    case "map": {
      const inner = resolveSchemaExpr(model.base, schemaMap, lib)
      return inner ? lib.map(lib.string(), inner) : null
    }
    default:
      return null
  }
}

export function collectSchemaRefs(model: Models, schemaMap: SchemaMap): string[] {
  switch (model.kind) {
    case "record":
    case "union":
    case "taggedUnion":
    case "enums": {
      return schemaMap.has(model.id) ? [camelCase(model.id) + "Schema"] : []
    }
    case "array":
    case "set":
      return collectSchemaRefs(model.base, schemaMap)
    case "map":
      return collectSchemaRefs(model.base, schemaMap)
    default:
      return []
  }
}

export function modelDefault(model: Models): unknown {
  if ("default" in model && model.default != null) return model.default
  return undefined
}

export function toColonPath(path: string): string {
  return path.replace(/\{(\w+)\}/g, ":$1")
}

export function contentTypeForKind(kind: string): string {
  switch (kind) {
    case "binary":
      return "application/octet-stream"
    case "stream-response":
      return "application/x-ndjson"
    case "sse-response":
      return "text/event-stream"
    default:
      return "application/json"
  }
}
