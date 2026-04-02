export interface JsonSchema7Object extends
  JsonSchema7Core,
  JsonSchema7Applicator,
  JsonSchema7Validation,
  JsonSchema7MetaData,
  JsonSchema7Format,
  JsonSchema7Dependencies { }

export type JsonSchema7 = JsonSchema7Object | boolean

export interface JsonSchema7Core {
  $id?: string
  $schema?: string
  $ref?: string
  definitions?: { [key: string]: JsonSchema7 }
  $comment?: string
}

export interface JsonSchema7Applicator {
  items?: JsonSchema7 | JsonSchema7[]
  additionalItems?: JsonSchema7
  contains?: JsonSchema7
  additionalProperties?: JsonSchema7
  properties?: { [key: string]: JsonSchema7 }
  patternProperties?: { [key: string]: JsonSchema7 }
  propertyNames?: JsonSchema7
  if?: JsonSchema7
  then?: JsonSchema7
  else?: JsonSchema7
  allOf?: JsonSchema7[]
  anyOf?: JsonSchema7[]
  oneOf?: JsonSchema7[]
  not?: JsonSchema7
}

export interface JsonSchema7Validation {
  type?: SimpleType7 | SimpleType7[]
  const?: any
  enum?: any[]
  multipleOf?: number
  maximum?: number
  exclusiveMaximum?: boolean
  minimum?: number
  exclusiveMinimum?: boolean
  maxLength?: number
  minLength?: number
  pattern?: string
  maxItems?: number
  minItems?: number
  uniqueItems?: boolean
  maxProperties?: number
  minProperties?: number
  required?: string[]
}

export interface JsonSchema7MetaData {
  title?: string
  description?: string
  default?: any
  deprecated?: boolean
  examples?: any[]
}

export interface JsonSchema7Format {
  format?: FormatVariants7 | (string & {})
}

export type FormatVariants7 =
  | "date-time"
  | "date"
  | "time"
  | "email"
  | "hostname"
  | "ipv4"
  | "ipv6"
  | "uri"
  | "uri-reference"
  | "uri-template"
  | "url"
  | "json-pointer"
  | "regex"

export interface JsonSchema7Dependencies {
  dependencies?: { [key: string]: JsonSchema7 | string[] }
}

export const SimpleTypes7 = ["array", "boolean", "integer", "null", "number", "object", "string"] as const

export type SimpleType7 = (typeof SimpleTypes7)[number]

export const MetaKeys7: string[] = ["title", "description", "default", "deprecated", "examples"] as const

export interface SchemaRefs7 {
  ref: (key: string) => JsonSchema7
  get: (key: string) => JsonSchema7
}

export function parseReferences7(node: JsonSchema7): SchemaRefs7 {
  const [defs, anchors]: Record<string, JsonSchema7>[] = [{}, { "#": node }]

  const ref = (key: string) => {
    if (key in anchors) return anchors[key]
    if (key in defs) return defs[key]
    throw Error(`cannot found ref ${key}`)
  }

  const get = (key: string) => {
    if (typeof node === "boolean") throw Error("cannot use json pointer in boolean")

    const keys = key.slice(1).split("/").filter(Boolean)

    let temp: { [key: string]: any } = node

    for (let i = 0; i < keys.length; i++) if (keys[i] in temp) temp = temp[keys[i]]

    return temp
  }

  const parse = (node: JsonSchema7, prefix: string = "#"): SchemaRefs7 => {
    if (node === null || typeof node !== "object") return { ref, get }

    for (const [key, value] of Object.entries(node)) {
      const nextKey = prefix + "/" + key

      if (key === "definitions")
        for (const [k, v] of Object.entries(value)) {
          defs[nextKey + "/" + k] = v as JsonSchema7
        }

      if (typeof value === "object" && value != null) parse(value, nextKey)
    }

    return { ref, get }
  }

  return parse(node)
}

export function parseNodeType7(schema: JsonSchema7): Map<JsonSchema7, SimpleType7[]> {
  const map = new Map<JsonSchema7, SimpleType7[]>()

  const parse = (node: JsonSchema7) => {
    if (typeof node === "boolean") {
      map.set(node, node ? [] : [])
      return
    }

    for (const key of [
      "contains",
      "additionalProperties",
      "propertyNames",
      "if",
      "then",
      "else",
      "not",
      "additionalItems",
    ] as const)
      if (node[key]) parse(node[key])

    // Handle items which can be JsonSchema7 or JsonSchema7[]
    if (node.items) {
      if (Array.isArray(node.items)) {
        for (const item of node.items) parse(item)
      } else {
        parse(node.items)
      }
    }

    for (const key of ["allOf", "anyOf", "oneOf"] as const) if (node[key]) for (const sub of node[key]) parse(sub)

    for (const key of ["definitions", "properties", "patternProperties", "dependencies"] as const)
      if (node[key])
        for (const subkey in node[key]) {
          const value = node[key][subkey]
          if (typeof value === "object" && value != null && !Array.isArray(value)) {
            parse(value as JsonSchema7)
          }
        }
  }

  parse(schema)

  return map
}

export interface JsonSchemaContext7 extends SchemaRefs7 {
  type: (schema: JsonSchema7) => SimpleType7[]
}

export function parseJsonSchemaContext7(schema: JsonSchema7): JsonSchemaContext7 {
  const { ref, get } = parseReferences7(schema)
  const map = parseNodeType7(schema)
  return {
    ref,
    get,
    type: (schema) => {
      const types = map.get(schema)
      if (types != null) return types
      throw Error("cannot find schema: " + schema)
    },
  }
}
