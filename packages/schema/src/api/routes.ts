import { extractPathParams, normalizePath, type ExtractPathParams } from "utils"
import { string } from "../models/string"
import type { Model } from "../models/types"
import type { ContentTypes, HttpMethod } from "../net-types"
import type { SecurityModel } from "../security"

export interface RoutesModel {
    kind: 'routes'
    path: string
    pathParams: { [key: string]: Model }
    operations: { [key: string]: OperationModel }
    summary?: string
    description?: string
    tags?: string[]
}

export interface RouterOptions<T extends string> {
    pathParams?: { [key in ExtractPathParams<T>]?: Model }
    operations: { [key: string]: OperationModel }
    summary?: string
    description?: string
    tags?: string[]
}

export function routes<T extends string>(path: T, options: RouterOptions<T>): RoutesModel {

    const { pathParams, operations, ...rest } = options

    const pathParamMap = new Map<string, Model>()

    const realOperations = new Map<string, OperationModel>()

    for (const operation of Object.values(operations)) {
        const operationPath = normalizePath([path, operation.path].join('/'))

        for (const parameterName of extractPathParams(operationPath)) {
            if (pathParams && parameterName in pathParams) {
                const model = pathParams[parameterName as keyof typeof pathParams]
                if (model) pathParamMap.set(parameterName, model)
            }
            else pathParamMap.set(parameterName, string())
        }
    }

    for (const [operationName, operation] of Object.entries(operations)) {
        const operationPath = normalizePath([path, operation.path].join('/'))

        const pathParameters = extractPathParams(operationPath).map(o => [o, pathParamMap.get(o)!] as const)

        const newOperation: OperationModel = {
            ...operation,
            pathParams: Object.fromEntries(pathParameters)
        }

        realOperations.set(operationName, newOperation)
    }

    return {
        kind: 'routes',
        path,
        pathParams: Object.fromEntries(pathParamMap),
        operations: Object.fromEntries(realOperations),
        ...rest
    }
}

export interface OperationModel<T extends { [key: string]: ResponseModel } = { [key: string]: ResponseModel }> {
    kind: 'operation'
    responses: T
    path: string
    method: HttpMethod
    contentType: ContentTypes
    pathParams?: { [key: string]: Model }
    headerParams?: { [key: string]: Model }
    queryParams?: { [key: string]: Model }
    content?: Model
    summary?: string
    description?: string
    tags?: string[]
    deprecated?: boolean
    security?: SecurityModel[][]
}

export interface OperationModelOptions<P extends string, T extends { [key: string]: ResponseModel }> {
    responses: T
    contentType?: ContentTypes
    pathParams?: { [key in ExtractPathParams<P>]: Model }
    headerParams?: { [key: string]: Model }
    queryParams?: { [key: string]: Model }
    content?: Model
    summary?: string
    description?: string
    tags?: string[]
    deprecated?: boolean
    security?: SecurityModel[][]
}

export function operation<P extends string, T extends { [key: string]: ResponseModel }>(method: HttpMethod, path: P, options: OperationModelOptions<P, T>): OperationModel {

    const {
        contentType = 'application/json',
        responses,
        pathParams,
        ...rest
    } = options

    return {
        kind: 'operation',
        method,
        path,
        contentType,
        responses,
        pathParams,
        ...rest
    }
}

export interface ResponseModel {
    kind: 'response'
    contentType: ContentTypes
    status: number
    headers?: { [key: string]: Model }
    content?: Model
    description?: string
}

export interface ResponseModelOptions {
    status: number
    contentType?: ContentTypes
    headers?: { [key: string]: Model }
    content?: Model
    description?: string
}

export function response(options: ResponseModelOptions): ResponseModel {
    const {
        status,
        headers,
        content,
        contentType = 'application/json',
        description,
    } = options

    return {
        kind: 'response',
        status,
        headers,
        contentType,
        content,
        description,
    }
}