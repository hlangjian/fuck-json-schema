export interface JsonSchemaObject<T = any> extends
    JsonSchemaCore,
    JsonSchemaApplicator,
    JsonSchemaUnevaluated,
    JsonSchemaValidation,
    JsonSchemaMetaData<T>,
    JsonSchemaFormat,
    JsonSchemaContent { }

export type JsonSchema = JsonSchemaObject | boolean

export interface JsonSchemaCore {
    $id?: string
    $schema?: string
    $ref?: string
    $anchor?: string
    $dynamicRef?: string
    $dynamicAnchor?: string
    $vocabulary?: { [key: string]: boolean }
    $comment?: string
    $defs?: { [key: string]: JsonSchema }
}

export interface JsonSchemaApplicator {
    prefixItems?: JsonSchema[]
    items?: JsonSchema
    contains?: JsonSchema
    additionalProperties?: JsonSchema
    properties?: { [key: string]: JsonSchema }
    patternProperties?: { [key: string]: JsonSchema }
    dependentSchemas?: { [key: string]: JsonSchema }
    propertyNames?: JsonSchema
    if?: JsonSchema
    then?: JsonSchema
    else?: JsonSchema
    allOf?: JsonSchema[]
    anyOf?: JsonSchema[]
    oneOf?: JsonSchema[]
    not?: JsonSchema
}

export interface JsonSchemaUnevaluated {
    unevaluatedItems?: JsonSchema
    unevaluatedProperties?: JsonSchema
}

export interface JsonSchemaValidation {
    type?: SimpleType | SimpleType[]
    const?: any
    enum?: any[]
    multipleOf?: number
    maximum?: number
    exclusiveMaximum?: number
    minimum?: number
    exclusiveMinimum?: number
    maxLength?: number
    minLength?: number
    pattern?: string
    maxItems?: number
    minItems?: number
    uniqueItems?: boolean
    maxContains?: number
    minContains?: number
    maxProperties?: number
    minProperties?: number
    required?: string[]
    dependentRequired?: { [key: string]: string[] }
}

export interface JsonSchemaMetaData<T> {
    title?: string
    description?: string
    default?: T
    deprecated?: boolean
    readOnly?: boolean
    writeOnly?: boolean
    examples?: T[]
}

export interface JsonSchemaFormat {
    format?: FormatVariants | (string & {})
}

export type FormatVariants =
    | "date-time"
    | "date"
    | "time"
    | "duration"
    | "email"
    | "hostname"
    | "ipv4"
    | "ipv6"
    | "uri"
    | "uri-reference"
    | "uri-template"
    | "url"
    | "json-pointer"
    | "relative-json-pointer"
    | "regex"
    | "byte"
    | "binary"
    | "uuid"
    | "ipvfuture"

export interface JsonSchemaContent {
    contentEncoding?: string
    contentMediaType?: string
    contentSchema?: JsonSchema
}

export const SimpleTypes = [
    'array', 'boolean', 'integer', 'null', 'number', 'object', 'string'
] as const

export type SimpleType = typeof SimpleTypes[number]

export const MetaKeys: string[] = ['title', 'description', 'default', 'deprecated', 'examples', 'readOnly', 'writeOnly'] as const

export interface SchemaRefs {
    ref: (key: string) => JsonSchema
    dynamic: (key: string) => JsonSchema
    get: (key: string) => JsonSchema
}

export function parseReferences(node: JsonSchema): SchemaRefs {
    const [defs, anchors, dynamicAnchors]: Record<string, JsonSchema>[] = [{}, { "#": node }, { "#meta": node }]

    const ref = (key: string) => {
        if (key in anchors) return anchors[key]
        if (key in defs) return defs[key]
        throw Error(`cannot found ref ${key}`)
    }

    const dynamic = (key: string) => {
        if (key in dynamicAnchors) return dynamicAnchors[key]
        if (key in defs) return defs[key]
        throw Error(`cannot found dynamic ref ${key}`)
    }

    const get = (key: string) => {

        if (typeof node === 'boolean') throw Error('cannot use json pointer in boolean')

        const keys = key.slice(1).split('/').filter(Boolean)

        let temp: { [key: string]: any } = node

        for (let i = 0; i < keys.length; i++) if (keys[i] in temp) temp = temp[keys[i]]

        return temp
    }

    const parse = (node: JsonSchema, prefix: string = '#'): SchemaRefs => {

        if (node === null || typeof node !== 'object') return { ref, dynamic, get }

        for (const [key, value] of Object.entries(node)) {
            const nextKey = prefix + '/' + key
            if (typeof key === 'string' && key === '$anchor') anchors[nextKey] = node
            if (typeof key === 'string' && key === '$dynamicAnchor') dynamicAnchors[nextKey] = node

            if (key === '$defs') for (const [k, v] of Object.entries(value)) {
                defs[nextKey + '/' + k] = v as JsonSchema
            }

            if (typeof value === 'object' && value != null) parse(value, nextKey)
        }

        return { ref, dynamic, get }
    }

    return parse(node)
}

export function parseNodeType(schema: JsonSchema): Map<JsonSchema, SimpleType[]> {
    const map = new Map<JsonSchema, SimpleType[]>()

    const parse = (node: JsonSchema) => {
        if (typeof node === 'boolean') {
            map.set(node, node ? [] : [])
            return
        }

        for (const key of [
            'items', 'contains',
            'additionalProperties', 'propertyNames',
            'if', 'then', 'else', 'not',
            'unevaluatedItems', 'unevaluatedProperties',
            'contentSchema'
        ] as const) if (node[key]) parse(node[key])

        for (const key of [
            'prefixItems',
            'allOf', 'anyOf', 'oneOf'
        ] as const) if (node[key]) for (const sub of node[key]) parse(sub)

        for (const key of [
            '$defs', 'properties', 'patternProperties', 'dependentSchemas'
        ] as const) if (node[key]) for (const subkey in node[key]) parse(node[key][subkey])
    }

    parse(schema)

    return map
}

export interface JsonSchemaContext extends SchemaRefs {
    type: (schema: JsonSchema) => SimpleType[]
}

export function parseJsonSchemaContext(schema: JsonSchema): JsonSchemaContext {
    const { ref, dynamic, get } = parseReferences(schema)
    const map = parseNodeType(schema)
    return {
        ref, dynamic, get,
        type: schema => {
            const types = map.get(schema)
            if (types != null) return types
            throw Error('cannot find schema: ' + schema)
        }
    }
}