import { modelKinds, type Model, type OperationModel, type ResponseModel, type RoutesModel } from "@huanglangjian/schema";

export type ScanableModel = Model | RoutesModel | OperationModel | ResponseModel

export const isScanableModel = (obj?: any): obj is ScanableModel => {
    return obj != null
        && typeof obj === 'object'
        && 'kind' in obj
        && typeof obj.kind === 'string'
        && (modelKinds.includes(obj.kind)
            || obj.kind === 'routes'
            || obj.kind === 'operation'
            || obj.kind === 'response')
}

export interface GeneratorContextOptions {
    outputDir?: string
    models: Map<string, ScanableModel>
}

export interface GeneratorContext {
    getId: (model: ScanableModel) => string | undefined
}

export function createGenerator<T>(models: Map<string, ScanableModel>, generator: (model: ScanableModel) => T) {
}