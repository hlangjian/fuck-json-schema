import { createJsonSchemaRegistry, generateJsonSchema } from "../generate-jsonschema"
import type { JsonSchemaObject } from "../schemas/json-schema-draft-2020-12"
import type { Models } from "../types"

export function mergeJsonSchemas(schemas: Record<string, Models>): JsonSchemaObject {
  const entries = Object.entries(schemas)

  const registry = entries.reduce(
    (reg, [id, model]) => reg.add(id, model),
    createJsonSchemaRegistry(),
  )

  const $defs = entries.reduce<Record<string, JsonSchemaObject>>(
    (acc, [id, model]) => {
      const { jsonSchema } = generateJsonSchema({ model, registry })
      return typeof jsonSchema === "object" && jsonSchema != null
        ? { ...acc, [id]: jsonSchema as JsonSchemaObject }
        : acc
    },
    {} as Record<string, JsonSchemaObject>,
  )

  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $defs,
  }
}
