import type { Model } from "../models/types"
import type { JsonSchemaObject } from "../json-schema";

export interface CreateJsonSchemaOptions {
    model: Model
    defines?: { [key: string]: Model }
    refPrefix?: string
}

export function createJsonSchema(options: CreateJsonSchemaOptions): JsonSchemaObject {

    const { model, defines = {}, refPrefix = '#/' } = options

    const componentIds = new Map<Model, string>()

    for (const [key, define] of Object.entries(defines)) {
        if (define !== model) componentIds.set(define, key)
    }

    const parse = (model: Model): JsonSchemaObject => {

        const id = componentIds.get(model)

        if (id != null) return {
            $ref: refPrefix + id
        }

        if (model.kind === 'string') {
            const { kind, validations, ...rest } = model

            const ret: JsonSchemaObject = { type: 'string', ...rest }

            if (validations) for (const validation of validations) {
                if (validation.kind === 'min-length-validation') {
                    ret['minLength'] = validation.value
                }
            }

            return ret
        }

        if (model.kind === 'number') {
            const { kind, type, validations, ...rest } = model

            const ret: JsonSchemaObject = {
                type: type === 'short' || type === 'int' || type === 'long' ? 'integer' : 'number',
                ...rest
            }

            if (validations) for (const validation of validations) {
                if (validation.kind === 'minimum-validation') {
                    ret['minimum'] = validation.value
                }

                if (validation.kind === 'maximum-validation') {
                    ret['maximum'] = validation.value
                }
            }

            return ret
        }

        if (model.kind === 'boolean') {
            const { kind, ...rest } = model
            return { type: 'boolean', ...rest }
        }

        if (model.kind === 'array') {
            const { kind, base, ...rest } = model
            return { type: 'array', items: parse(base), ...rest }
        }

        if (model.kind === 'set') {
            const { kind, base, ...rest } = model
            return { type: 'array', items: parse(base), ...rest }
        }

        if (model.kind === 'map') {
            const { kind, base, ...rest } = model
            return { type: 'array', items: parse(base), ...rest }
        }

        if (model.kind === 'record') {
            const { kind, id, properties, ...rest } = model

            const propertiesMap = new Map<string, JsonSchemaObject>()

            for (const [name, property] of Object.entries(properties)) {
                propertiesMap.set(name, parse(property))
            }

            return { type: 'object', properties: Object.fromEntries(propertiesMap), ...rest }
        }

        if (model.kind === 'tagged-union') {
            const { id, variants, ...rest } = model
            const variantsMap = new Map<string, JsonSchemaObject>()

            for (const [name, variant] of Object.entries(variants)) {
                variantsMap.set(name, parse(variant))
            }

            return { oneOf: [...variantsMap.values()], ...rest }
        }

        if (model.kind === 'optional') {
            const { base, value } = model

            if (value === undefined) {
                return { oneOf: [{ type: 'null' }, parse(base)] }
            }

            if (value == null) {
                return { oneOf: [{ type: 'null' }, parse(base)], default: null }
            }

            return { ...parse(base), default: value }
        }

        if (model.kind === 'constant') {
            const { base, value, ...rest } = model
            return { ...parse(base), const: value, ...rest }
        }

        if (model.kind === 'date') {
            const { schema } = model
            return { ...schema, type: 'string', format: 'date' }
        }

        if (model.kind === 'datetime') {
            const { schema } = model
            return { ...schema, type: 'string', format: 'date-time' }
        }

        if (model.kind === 'time') {
            const { schema } = model
            return { ...schema, type: 'string', format: 'time' }
        }

        if (model.kind === 'uuid') {
            const { schema } = model
            return { ...schema, type: 'string', format: 'uuid' }
        }

        return {}
    }

    const components = new Map<string, JsonSchemaObject>()

    for (const [key, define] of Object.entries(defines)) {
        if (define !== model) components.set(key, parse(define))
    }

    return {
        ...parse(model),
        $defs: Object.fromEntries(components)
    }
}