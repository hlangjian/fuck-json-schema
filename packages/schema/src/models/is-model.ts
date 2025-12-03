import type { Model } from "./types"

type ModelKinds = ["string", "number", "boolean", "array", "set", "optional", "constant", "map", "tagged-union", "record", "date", "time", "datetime", "uuid"]

export const modelKinds: ModelKinds = [
    'string', 'number', 'boolean', 'array', 'set', 'optional',
    'constant', 'map', 'tagged-union', 'record', 'date', 'time', 'datetime', 'uuid'
]

export function isModel(obj: any): obj is Model {
    return obj != null && typeof obj === 'object' && 'kind' in obj && modelKinds.includes(obj.kind)
}