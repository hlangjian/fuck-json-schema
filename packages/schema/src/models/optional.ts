import type { InferModel, Model } from "./types"

export interface OptionalModel<T extends Model = Model, R = any> {
    kind: 'optional'

    base: T

    value?: R
}

export function optional<T extends Model, R extends InferModel<T> | undefined = undefined>(base: T, value?: R): OptionalModel<T, R> {
    return { kind: 'optional', base, value: value as R }
}