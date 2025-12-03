import type { Model } from "./types"

export interface ServiceModel<T extends { [key: string]: MethodModel }> {
    kind: 'service'
    methods: T
    summary?: string
    description?: string
    tags?: string[]
}

export interface ServiceModelOptions<T extends { [key: string]: MethodModel }> {
    methods: T
    summary?: string
    description?: string
    tags?: string[]
}

export function service<T extends { [key: string]: MethodModel }>(options: ServiceModelOptions<T>): ServiceModel<T> {
    return { kind: 'service', ...options }
}

export interface MethodModel<T extends { [key: string]: Model } = { [key: string]: Model }, R extends Model = Model> {
    kind: 'method'
    args: T
    return?: R
    summary?: string
    description?: string
    tags?: string[]
}

export interface MethodModelOptions<T extends { [key: string]: Model }, R extends Model> {
    args: T
    return?: R
    summary?: string
    description?: string
    tags?: string[]
}

export function method<T extends { [key: string]: Model }, R extends Model>(options: MethodModelOptions<T, R>): MethodModel<T, R> {
    return { kind: 'method', ...options }
}