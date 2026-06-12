import type { Models } from "@huanglangjian/specs"
import { topologicalSortSchemaMap } from "@huanglangjian/specs"
import type { SchemaMap } from "@huanglangjian/specs"
import { camelCase } from "text-case"

export function generateModels(schemaMap: SchemaMap, identifier: (s: string) => string, namespace?: string): string {
  const lines: string[] = []
  lines.push(`import { z } from "zod"`)
  lines.push("")

  for (const [id, schemaInfo] of topologicalSortSchemaMap(schemaMap)) {
    const schemaName = camelCase(id) + "Schema"
    const tsName = identifier(id)

    switch (schemaInfo.kind) {
      case "record": {
        lines.push(`export const ${schemaName} = z.object({`)
        for (const field of schemaInfo.fields!) {
          lines.push(
            `  ${field.name}: ${toZod(field.model, schemaMap)}${field.required ? "" : optionalDefault(field.model)},`,
          )
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
        lines.push(`export const ${schemaName} = z.enum(${JSON.stringify(Object.values(schemaInfo.variants!))})`)
        lines.push(`export type ${tsName} = z.infer<typeof ${schemaName}>`)
        lines.push("")
        break
      }
      case "union": {
        const variants = Object.entries(schemaInfo.unionVariants!)
        const unionItems = variants.map(([, v]) => toZod(v as Models, schemaMap)).join(", ")
        lines.push(`export const ${schemaName} = z.union([${unionItems}])`)
        lines.push(`export type ${tsName} = z.infer<typeof ${schemaName}>`)
        lines.push("")
        break
      }
      case "taggedUnion": {
        const discriminator = schemaInfo.discriminator!
        const unionItems = Object.entries(schemaInfo.unionVariants!).map(([, v]) => `${toZod(v as Models, schemaMap)}`)
        lines.push(
          `export const ${schemaName} = z.discriminatedUnion(${JSON.stringify(discriminator)}, [${unionItems.join(", ")}])`,
        )
        lines.push(`export type ${tsName} = z.infer<typeof ${schemaName}>`)
        lines.push("")
        break
      }
    }
  }

  return lines.join("\n")
}

export function toZod(model: Models, schemaMap: SchemaMap): string {
  switch (model.kind) {
    case "int32":
      return "z.coerce.number().int()"
    case "float32":
    case "float64":
      return "z.coerce.number()"
    case "boolean":
      return "z.coerce.boolean()"
    case "string":
      return "z.string()"
    case "datetime":
      return "z.string().datetime()"
    case "date":
      return "z.string().date()"
    case "duration":
      return "z.string()"
    case "literal":
      return `z.literal(${JSON.stringify(model.value)})`
    case "null":
      return "z.null()"
    case "array":
      return `${toZod(model.base, schemaMap)}.array()`
    case "set":
      return `${toZod(model.base, schemaMap)}.array()`
    case "map":
      return `z.record(z.string(), ${toZod(model.base, schemaMap)})`
    case "enums":
      return `z.enum(${JSON.stringify(Object.values(model.variants))})`
    case "record": {
      const schemaInfo = schemaMap.get(model.id)
      return schemaInfo?.fields ? camelCase(model.id) + "Schema" : "z.unknown()"
    }
    case "union": {
      const schemaInfo = schemaMap.get(model.id)
      if (schemaInfo?.unionVariants) return camelCase(model.id) + "Schema"
      const unionItems = Object.values(model.variants).map((v) => toZod(v as Models, schemaMap))
      return `z.union([${unionItems.join(", ")}])`
    }
    case "taggedUnion": {
      const schemaInfo = schemaMap.get(model.id)
      if (schemaInfo?.unionVariants) return camelCase(model.id) + "Schema"
      const discriminator = model.discriminator as string
      const unionItems = Object.values(model.variants).map((v) => `${toZod(v as Models, schemaMap)}`)
      return `z.discriminatedUnion(${JSON.stringify(discriminator)}, [${unionItems.join(", ")}])`
    }
    default:
      return "z.unknown()"
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

export function optionalDefault(model: Models): string {
  if ("default" in model && model.default != null) {
    return `.optional().default(${JSON.stringify(model.default)})`
  }
  return ".optional()"
}

export function resolveZodSchema(model: Models, schemaMap: SchemaMap): string | null {
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
      const inner = resolveZodSchema(model.base, schemaMap)
      return inner ? `${inner}.array()` : null
    }
    case "map": {
      const inner = resolveZodSchema(model.base, schemaMap)
      return inner ? `z.record(z.string(), ${inner})` : null
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

export function toHonoPath(path: string): string {
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
