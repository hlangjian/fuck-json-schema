import { string, type BasicModel, type Model } from "./model"
import type { ContentTypes, HttpMethod } from "./net-types"
import type { SecurityModel } from "./security"
import { completePathParameters, type ExtractPathParams } from "./utils"

export const apiSymbol: unique symbol = Symbol('api')

export interface ResourceModel<T extends string> {
    kind: 'resource'
    id: string
    path: T
    parameters: { [key: string]: Model }
    tags: string[]
    description?: string
    routes: RouteModel<string>[]
    security?: SecurityModel
    [apiSymbol]: true
}

export interface RouteModel<T extends string> {
    kind: 'route'
    path: T
    parameter: { [key: string]: Model }
    operations: { [key: string]: OperationModel }
    [apiSymbol]: true
}

export interface OperationModel {
    kind: 'operation'
    method: HttpMethod
    contentType: ContentTypes
    description?: string
    header?: { [key: string]: Model }
    query?: { [key: string]: Model }
    content?: Model
    responses: { [key: string]: ResponseModel }
    tags?: string[]
    deprecated: boolean
    security?: SecurityModel
    [apiSymbol]: true
}

export interface ResponseModel {
    status: number
    contentType: ContentTypes
    header?: { [key: string]: Model }
    content?: Model
    description?: string
}

export interface ResponseModelOptions {
    status: number
    contentType?: ContentTypes
    header?: { [key: string]: Model }
    content?: Model
    description?: string
}

export interface ResourceOptions<T extends string> {
    parameters?: { [key in ExtractPathParams<T>]?: Model }
    tags?: string[]
    description?: string
    security?: SecurityModel
}

export interface RouteModelOptions<T extends string> {
    parameter?: { [key in ExtractPathParams<T>]?: Model }
    operations?: { [key: string]: OperationModel }
}

export interface OperationModelOptions {
    contentType?: ContentTypes
    description?: string
    header?: { [key: string]: Model }
    query?: { [key: string]: Model }
    content?: Model
    responses?: { [key: string]: ResponseModelOptions }
    tags?: string[]
    deprecated?: boolean
    security?: SecurityModel
}

export function resource<const T extends string>(id: string, path: T, options?: ResourceOptions<T>): (...routes: RouteModel<string>[]) => ResourceModel<T> {

    const { parameters = {}, tags = [], description, security } = options ?? {}

    return (...routes) => ({
        kind: 'resource',
        id,
        path,
        parameters: completePathParameters(path, parameters),
        tags,
        description,
        routes,
        security,
        [apiSymbol]: true
    })
}

export function route<T extends string>(path: T, parameters?: { [key in ExtractPathParams<T>]?: BasicModel }): (operations: { [key: string]: OperationModel }) => RouteModel<T> {
    return (operations) => ({ kind: 'route', path, parameter: completePathParameters(path, parameters ?? {}), operations, [apiSymbol]: true })
}

export function operation(method: HttpMethod, options?: OperationModelOptions): OperationModel {

    const { contentType = 'application/json', content, header, query, responses = {}, description, tags, deprecated = false, security } = options ?? {}

    const realResponse = new Map<string, ResponseModel>()

    for (const [key, { contentType = 'application/json', ...rest }] of Object.entries(responses)) {
        realResponse.set(key, { contentType, ...rest })
    }

    return {
        kind: 'operation',
        method,
        contentType,
        content,
        header,
        query,
        responses: Object.fromEntries(realResponse),
        description,
        tags,
        deprecated,
        security,
        [apiSymbol]: true
    }
}