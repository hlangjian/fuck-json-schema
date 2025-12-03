import type { Simplify } from "type-fest"
import type { InferModel, Model } from "./types"
import { type OptionalModel } from './optional'

export interface RecordModelOptions<T extends { [key: string]: Model }> {
    title?: string

    description?: string

    deprecated?: boolean

    exmaples?: InferProperties<T>[]

    properties: T
}

export interface RecordModel<T extends { [key: string]: Model } = { [key: string]: Model }> extends RecordModelOptions<T> {
    kind: 'record'
}

export function record<T extends { [key: string]: Model }>(options: RecordModelOptions<T>): RecordModel<T> {
    return { kind: 'record', ...options }
}

export type InferProperties<T extends { [key: string]: Model }> = Simplify<
    & { [key in keyof T as T[key] extends OptionalModel ? key : never]?: InferModel<T[key]> }
    & { [key in keyof T as T[key] extends OptionalModel ? never : key]: InferModel<T[key]> }
>