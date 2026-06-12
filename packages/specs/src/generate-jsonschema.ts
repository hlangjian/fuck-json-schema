import type { StandardTypedV1 } from "@standard-schema/spec"

import type { JsonSchema, JsonSchemaObject } from "./schemas/json-schema-draft-2020-12"
import type { Models } from "./types"

export interface SchemaRegistry {
  getRef: (model: Models) => string | undefined
  add: (id: string, model: Models) => SchemaRegistry
}

export interface GenerateJsonSchemaOptions {
  model: Models
  registry?: SchemaRegistry
  toJsonSchema?: (type?: StandardTypedV1) => JsonSchemaObject
}

export interface GenerateJsonSchemaResult {
  jsonSchema: JsonSchema
  registry: SchemaRegistry
}

export function generateJsonSchema(options: GenerateJsonSchemaOptions): GenerateJsonSchemaResult {
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
      const { jsonSchema, registry: newRegistry } = generateJsonSchema({
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
      const { jsonSchema, registry: newRegistry } = generateJsonSchema({
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
      const { jsonSchema, registry: newRegistry } = generateJsonSchema({
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

          const generated = generateJsonSchema({
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

          const generated = generateJsonSchema({
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

          const generated = generateJsonSchema({
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
  }
}

export function createJsonSchemaRegistry(models?: Map<Models, { id: string; schema: JsonSchema }>): SchemaRegistry {
  const map = new Map<Models, { id: string; schema: JsonSchema }>(models)

  const registry: SchemaRegistry = {
    getRef(model) {
      const entry = map.get(model)
      return entry ? "#/$defs/" + entry.id : undefined
    },
    add(id, model) {
      const { jsonSchema } = generateJsonSchema({ model, registry })
      return createJsonSchemaRegistry(map.set(model, { id, schema: jsonSchema }))
    },
  }

  return registry
}

export function createOpenapiSchemaRegistry(models?: Map<Models, { id: string; schema: JsonSchema }>): SchemaRegistry {
  const map = new Map<Models, { id: string; schema: JsonSchema }>(models)

  const registry: SchemaRegistry = {
    getRef(model) {
      const entry = map.get(model)
      return entry ? "#/components/schemas/" + entry.id : undefined
    },
    add(id, model) {
      const { jsonSchema } = generateJsonSchema({ model, registry })
      return createOpenapiSchemaRegistry(map.set(model, { id, schema: jsonSchema }))
    },
  }

  return registry
}
