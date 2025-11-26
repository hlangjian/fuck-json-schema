import type { Model } from "./types"
import { normalizeValidations, type MaxLengthValidation, type MinLengthValidation } from "./validations"

export interface SetModelOptions<T extends Model> {
    title?: string

    description?: string

    deprecated?: boolean

    exmaples?: Set<T>[]

    validations?: Array<MaxLengthValidation | MinLengthValidation>
}

export interface SetModel<T extends Model> extends SetModelOptions<T> {
    kind: 'set'
    base: T
}

export function set<T extends Model>(base: T, options?: SetModelOptions<T>): SetModel<T> {
    const { validations, ...rest } = options ?? {}
    return { kind: 'set', base, validations: normalizeValidations(validations), ...rest }
}