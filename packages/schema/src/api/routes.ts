import { string } from "../models/string"
import type { Model } from "../models/types"
import type { ContentTypes, HttpMethod } from "../net-types"
import type { SecurityModel } from "../security"
import { extractPathParams, type ExtractPathParams } from "../utils"

export interface RoutesModel {
    id: string
    kind: 'routes'
    path: string
    pathParams: { [key: string]: Model }
    operations: { [key: string]: OperationModel }
    summary?: string
    description?: string
    tags?: string[]
}

export interface RouterOptions<T extends string> {
    id: string
    pathParams?: { [key in ExtractPathParams<T>]?: Model }
    operations: { [key: string]: OperationModel }
    summary?: string
    description?: string
    tags?: string[]
}

export function routes<T extends string>(path: T, options: RouterOptions<T>): RoutesModel {

    const { pathParams, ...rest } = options

    const pathParamMap = new Map<string, Model>()

    for (const parameterName of extractPathParams(path)) {
        if (pathParams && parameterName in pathParams) {
            const model = pathParams[parameterName as keyof typeof pathParams]
            if (model) pathParamMap.set(parameterName, model)
        }
        else pathParamMap.set(parameterName, string())
    }

    return {
        kind: 'routes',
        path,
        pathParams: Object.fromEntries(pathParamMap),
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
        ...rest
    } = options

    return {
        kind: 'operation',
        method,
        path,
        contentType,
        responses,
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