import type { Models } from "@huanglangjian/specs"
import { topologicalSortSchemaMap } from "@huanglangjian/specs"
import type { SchemaMap } from "@huanglangjian/specs"
import { camelCase } from "text-case"
import type { ValidationLib } from "./validation-lib"

export function generateModels(
  schemaMap: SchemaMap,
  identifier: (s: string) => string,
  lib: ValidationLib,
  namespace?: string,
): string {
  const lines: string[] = []
  lines.push(lib.importStmt)
  lines.push("")

  for (const [id, schemaInfo] of topologicalSortSchemaMap(schemaMap)) {
    const schemaName = camelCase(id) + "Schema"
    const tsName = identifier(id)

    switch (schemaInfo.kind) {
      case "record": {
        lines.push(`export const ${schemaName} = ${lib.ns}.object({`)
        for (const field of schemaInfo.fields!) {
          const expr = toSchema(field.model, schemaMap, lib)
          const finalExpr = field.required ? expr : lib.optional(expr, modelDefault(field.model))
          lines.push(`  ${field.name}: ${finalExpr},`)
        }
        lines.push(`})`)
        lines.push("")

        lines.push(`export interface ${tsName} {`)
        for (const field of schemaInfo.fields!) {
          lines.push(
            `  ${field.name}${field.required ? "" : "?"}: ${toTs(field.model, schemaMap, identifier, namespace)};`,
          )
        }
        lines.push(`}`)
        lines.push("")
        break
      }
      case "enums": {
        lines.push(`export const ${schemaName} = ${lib.enums(Object.values(schemaInfo.variants!))}`)
        lines.push(`export type ${tsName} = ${lib.infer(schemaName)}`)
        lines.push("")
        break
      }
      case "union": {
        const variants = Object.entries(schemaInfo.unionVariants!)
        const unionItems = variants.map(([, v]) => toSchema(v as Models, schemaMap, lib))
        lines.push(`export const ${schemaName} = ${lib.union(unionItems)}`)
        lines.push(`export type ${tsName} = ${lib.infer(schemaName)}`)
        lines.push("")
        break
      }
      case "taggedUnion": {
        const discriminator = schemaInfo.discriminator!
        const unionItems = Object.entries(schemaInfo.unionVariants!).map(([, v]) =>
          toSchema(v as Models, schemaMap, lib),
        )
        lines.push(`export const ${schemaName} = ${lib.discriminatedUnion(discriminator, unionItems)}`)
        lines.push(`export type ${tsName} = ${lib.infer(schemaName)}`)
        lines.push("")
        break
      }
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
      const schemaInfo = schemaMap.get(model.id)
      return schemaInfo?.fields ? camelCase(model.id) + "Schema" : lib.unknown()
    }
    case "union": {
      const schemaInfo = schemaMap.get(model.id)
      if (schemaInfo?.unionVariants) return camelCase(model.id) + "Schema"
      const unionItems = Object.values(model.variants).map((v) => toSchema(v as Models, schemaMap, lib))
      return lib.union(unionItems)
    }
    case "taggedUnion": {
      const schemaInfo = schemaMap.get(model.id)
      if (schemaInfo?.unionVariants) return camelCase(model.id) + "Schema"
      const discriminator = model.discriminator as string
      const unionItems = Object.values(model.variants).map((v) => toSchema(v as Models, schemaMap, lib))
      return lib.discriminatedUnion(discriminator, unionItems)
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
      const schemaInfo = schemaMap.get(model.id)
      if (schemaInfo?.variants) return identifier(model.id)
      return Object.values(model.variants)
        .map((v) => JSON.stringify(v))
        .join(" | ")
    }
    case "record": {
      const schemaInfo = schemaMap.get(model.id)
      return schemaInfo?.fields ? identifier(model.id) : "unknown"
    }
    case "union":
    case "taggedUnion": {
      const schemaInfo = schemaMap.get(model.id)
      if (schemaInfo?.unionVariants) return identifier(model.id)
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
      const schemaInfo = schemaMap.get(model.id)
      return schemaInfo ? camelCase(model.id) + "Schema" : null
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
      const schemaInfo = schemaMap.get(model.id)
      return schemaInfo ? [camelCase(model.id) + "Schema"] : []
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
