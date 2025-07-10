import { isAllOfModel, isAnyOfModel, isArrayModel, isBooleanModel, isMapModel, isNumberModel, isObjectModel, isOneOfModel, isStringModel } from "./models"
import type { Model } from "./models/meta"

export const SupportSchema = [
    'https://json-schema.org/draft/2020-12/schema',
] as const

export interface SchemaOptions<T extends Model<unknown>, D extends { [key: string]: Model<unknown> } = {}> {
    id?: string
    schema?: typeof SupportSchema[number]
    model: T
    defs?: D
}

export function modelToJsonSchema<T extends Model<unknown>, D extends { [key: string]: Model<unknown> } = {}>(options: SchemaOptions<T, D>): object {
    const {
        id,
        schema,
        model,
        defs = {} as D
    } = options

    const defsMap = new Map<Model<unknown>, string>()
    for (const [k, v] of Object.entries(defs)) defsMap.set(v, k)

    const parse = (): object => {
        const defs = new Map(defsMap)
        defs.delete(model)
        return parseModel(model, defs)
    }

    const parseDef = (node: Model<unknown>): object => {
        const defs = new Map(defsMap)
        defs.delete(node)
        defs.delete(model)
        return parseModel(node, defs)
    }

    const $defs = {}

    for (const [k, v] of Object.entries(defs)) v !== model && Object.defineProperty($defs, k, {
        enumerable: true,
        value: parseDef(v)
    })

    const ret = {
        $id: id,
        $schema: schema,
        ...parse(),
        $defs
    }

    if ('properties' in ret && typeof ret.properties === 'object') {
        Object.defineProperty(ret.properties, '$schema', {
            enumerable: true,
            value: { type: 'string' }
        })
    }

    return ret
}

function parseModel(model: Model<unknown>, defs: Map<Model<unknown>, string>): object {
    const name = defs.get(model)
    if (name) return { $ref: '#/$defs/' + name }

    if (isStringModel(model)) return model

    if (isNumberModel(model)) return model

    if (isBooleanModel(model)) return model

    if (isObjectModel(model)) {
        const { properties: propertyMap, required, ...rest } = model

        const properties = {}

        for (const [key, model] of Object.entries(propertyMap)) Object.defineProperty(properties, key, {
            enumerable: true,
            value: { ...parseModel(model, defs) }
        })

        return {
            ...rest,
            properties,
            additionalProperties: false,
            required
        }
    }

    if (isArrayModel(model)) {
        const { base, ...rest } = model
        return { ...rest, items: parseModel(base, defs) }
    }

    if (isMapModel(model)) {
        const { base, ...rest } = model
        return { ...rest, additionalProperties: parseModel(base, defs) }
    }

    if (isOneOfModel(model)) {
        const { models, ...rest } = model
        const oneOf: any[] = models.map(o => parseModel(o, defs))
        return { ...rest, oneOf }
    }

    if (isAnyOfModel(model)) {
        const { models, ...rest } = model
        const anyOf: any[] = models.map(o => parseModel(o, defs))
        return { ...rest, anyOf }
    }

    if (isAllOfModel(model)) {
        const { models, ...rest } = model
        const allOf: any[] = models.map(o => parseModel(o, defs))
        return { ...rest, allOf }
    }

    throw Error('unknown model type ' + model.type)
}