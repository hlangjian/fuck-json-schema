import type { InferModel, Model } from "./types"
import { normalizeValidations, type MaxLengthValidation, type MinLengthValidation } from "./validations"

export interface MapModelOptions<T extends Model> {
    title?: string

    description?: string

    deprecated?: boolean

    exmaples?: { [key: string]: InferModel<T> }[]

    validations?: Array<MinLengthValidation | MaxLengthValidation>
}

export interface MapModel<T extends Model = Model> extends MapModelOptions<T> {
    kind: 'map'

    base: T
}

export function map<T extends Model>(base: T, options?: MapModelOptions<T>): MapModel<T> {
    const { validations, ...rest } = options ?? {}
    return { kind: 'map', base, validations: normalizeValidations(validations), ...rest }
}