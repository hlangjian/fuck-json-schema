import type { InferModel, Model } from "./types"

export interface ConstantModel<T extends Model = Model, R = any> {
    kind: 'constant'

    base: T

    value: R

    title?: string

    description?: string

    deprecated?: boolean
}

export interface ConstantModelOptions {
    title?: string

    description?: string

    deprecated?: boolean
}

export function constant<T extends Model, const R extends InferModel<T>>(base: T, value: R, options?: ConstantModelOptions): ConstantModel<T, R> {
    return { kind: 'constant', base, value, ...options }
}