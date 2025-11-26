import type { Model } from "../models/types"
import type { ContentTypes } from "../net-types"
import type { ContentModel, HeaderParameterModel, ParameterType } from "./parameters"

export interface ResponseModel {
    kind: 'response'

    status: number

    contentType: ContentTypes

    description?: string

    parameters: {
        [key: string]:
        | HeaderParameterModel<string, ParameterType>
        | ContentModel<Model>
    }
}

export interface ResponseModelOptions {
    status: number
    description?: string
    contentType?: ContentTypes
    parameters: {
        [key: string]:
        | HeaderParameterModel<string, ParameterType>
        | ContentModel<Model>
    }
}

export function response(options: ResponseModelOptions): ResponseModel {
    const { contentType = 'application/json', ...rest } = options
    return { kind: 'response', contentType, ...rest }
}