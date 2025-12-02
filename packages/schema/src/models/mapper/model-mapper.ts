import { headerParam, type HeaderParameterModel, type PathParameterModel, type QueryParameterModel } from "../../api/parameters"
import { number } from "../number"
import { record, type RecordModel } from "../record"
import { string } from "../string"
import type { InferModel, Model } from "../types"

type FlattenKeys<T extends { [key: string]: any }> = {
    [key in keyof T & string]: T[key] extends object ? `${key}.${FlattenKeys<T[key]>}` : key
}[keyof T & string]

export function createMapper<
    T extends RecordModel,
    S extends RecordModel,
    R extends { [key in FlattenKeys<InferModel<S>>]: FlattenKeys<InferModel<T>> }
>(target: T, source: S, map: R): R {
    return map
}

function createHttpMapper<
    S extends RecordModel,
    R extends { [key in FlattenKeys<InferModel<S>>]?: PathParameterModel | QueryParameterModel | HeaderParameterModel }
>(source: S, map: R): R {
    return map
}

const test = record({
    id: 'test',
    properties: {
        name: string(),
        age: number(),
    }
})

const mapping = createHttpMapper(test, {
    name: headerParam('name', test.properties.name),
})