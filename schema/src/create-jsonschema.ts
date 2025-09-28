import type { JsonSchemaObject } from "./json-schema";
import type { Model, OptionalModel } from "./model";

export function createJsonSchema(model: Model): JsonSchemaObject {

    const parse = (model: Model | OptionalModel<Model>): JsonSchemaObject => {
        if (model.kind === 'string') {
            return { type: 'string' }
        }

        if (model.kind === 'number') {
            return { type: 'number' }
        }

        if (model.kind === 'boolean') {
            return { type: 'boolean' }
        }

        if (model.kind === 'derived') {
            const { base, title, description, examples, schema } = model
            return { ...parse(base), title, description, examples, ...schema }
        }

        if (model.kind === 'array') {
            const { base, title, description, examples } = model
            return { type: 'array', title, description, examples, items: parse(base) }
        }

        if (model.kind === 'set') {
            const { base, title, description, examples } = model
            return { type: 'array', title, description, examples, items: parse(base) }
        }

        if (model.kind === 'map') {
            const { base, title, description, examples } = model
            return { type: 'array', title, description, examples, items: parse(base) }
        }

        if (model.kind === 'enums') {
            const { base, variants, title, description, examples } = model
            return { ...parse(base), enum: Object.values(variants), title, description, examples }
        }

        if (model.kind === 'record') {
            const { properties, title, description, examples, schema } = model

            const propertiesMap = new Map<string, JsonSchemaObject>()

            for (const [name, property] of Object.entries(properties)) {
                propertiesMap.set(name, parse(property))
            }

            return { type: 'object', properties: Object.fromEntries(propertiesMap), title, description, examples, ...schema }
        }

        if (model.kind === 'union') {
            const { variants, title, description, examples, discriminator } = model
            const variantsMap = new Map<string, JsonSchemaObject>()

            for (const [name, variant] of Object.entries(variants)) {
                variantsMap.set(name, parse(variant))
            }

            return discriminator == null
                ? { title, description, examples, anyOf: [...variantsMap.values()] }
                : { title, description, examples, oneOf: [...variantsMap.values()] }
        }

        if (model.kind === 'optional') {
            const { base } = model
            return { oneOf: [{ type: 'null' }, parse(base)] }
        }

        if (model.kind === 'constant') {
            const { base, value, title, description, examples } = model
            return { title, description, examples, const: value }
        }

        return {}
    }

    return parse(model)
}