import type { Model } from "../models/types"

export type ParameterType = Model // StringModel | NumberModel | BooleanModel | OptionalModel<StringModel | NumberModel | BooleanModel, string | number | boolean>

export type PathParameterType = Model// StringModel | NumberModel | BooleanModel

export interface HeaderParameterModel<N extends string = string, T extends ParameterType = ParameterType> {
    kind: 'header-parameter'
    base: T
    name: N
}

export function headerParam<N extends string, T extends ParameterType>(name: N, base: T): HeaderParameterModel<N, T> {
    return { kind: 'header-parameter', name, base }
}

export interface QueryParameterModel<N extends string = string, T extends ParameterType = ParameterType> {
    kind: 'query-parameter'
    base: T
    name: N
}

export function queryParam<N extends string, T extends ParameterType>(name: N, base: T): QueryParameterModel<N, T> {
    return { kind: 'query-parameter', name, base }
}

export interface PathParameterModel<N extends string = string, T extends PathParameterType = PathParameterType> {
    kind: 'path-parameter'
    base: T
    name: N
}

export function pathParam<N extends string, T extends PathParameterType>(name: N, base: T): PathParameterModel<N, T> {
    return { kind: 'path-parameter', name, base }
}

export interface ContentModel<T extends Model = Model> {
    kind: 'content'
    base: T
    name: 'content'
}

export function content<T extends Model>(base: T): ContentModel<T> {
    return { kind: 'content', name: 'content', base }
}