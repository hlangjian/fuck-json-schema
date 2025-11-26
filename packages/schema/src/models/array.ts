import type { InferModel, Model } from "./types"
import { normalizeValidations, type MaxLengthValidation, type MinLengthValidation } from "./validations"

export interface ArrayModelOptions<T extends Model> {
    title?: string

    description?: string

    deprecated?: boolean

    exmaples?: InferModel<T>[][]

    validations?: Array<MinLengthValidation | MaxLengthValidation>
}

export interface ArrayModel<T extends Model> extends ArrayModelOptions<T> {
    kind: 'array'

    base: T
}

export function array<T extends Model>(base: T, options?: ArrayModelOptions<T>): ArrayModel<T> {
    const { validations, ...rest } = options ?? {}
    return { kind: 'array', base, validations: normalizeValidations(validations), ...rest }
}