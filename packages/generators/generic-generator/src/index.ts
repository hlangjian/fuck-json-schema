import type { Model, RecordModel, RoutesModel, TaggedUnionModel } from '@huanglangjian/schema'

export interface GeneratorContext {
    models: Map<string, Model | RoutesModel>
    outputDir: string
    travel: (traveller: (model: RoutesModel | RecordModel | TaggedUnionModel) => Promise<void>) => Promise<void>
    createModule: (id: string) => ModuleGeneratorContext
    requireId: (model: Model | RoutesModel) => string
    addModel: (id: string, model: Model | RoutesModel) => void
}

export interface ModuleGeneratorContext {
    id: string
    dependencies: Set<string>
    dependsOn: (id: string) => void
    outputDir: string
    requireId: (model: Model | RoutesModel) => string
    addModel: (id: string, model: Model | RoutesModel) => void
}

export interface GeneratorContextOptions {
    outputDir?: string
    models?: Map<string, Model | RoutesModel>
}

export function createGeneratorContext(options?: GeneratorContextOptions): GeneratorContext {

    const {
        outputDir = '',
        models = new Map<string, Model | RoutesModel>(),
    } = options ?? {}

    const modelIdMap = new Map<Model | RoutesModel, string>()

    const routes: RoutesModel[] = []

    for (const [key, value] of models) {
        modelIdMap.set(value, key)
        if (value.kind === 'routes') routes.push(value)
    }

    const requireId = (model: Model | RoutesModel) => {
        const id = modelIdMap.get(model)
        if (id == null) throw Error('Unable to locate the model by its ID. Please make sure the model is defined and properly exported.')
        return id
    }

    const addModel = (id: string, model: Model | RoutesModel) => {
        if (models.has(id)) throw Error(`Duplicate model id ${id}`)
        models.set(id, model)
        modelIdMap.set(model, id)
    }

    const createModule = (id: string): ModuleGeneratorContext => {
        const dependencies = new Set<string>()

        const dependsOn = (id: string) => dependencies.add(id)

        return { id, dependencies, dependsOn, outputDir, requireId, addModel }
    }

    const travel = async (traveller: (model: RoutesModel | RecordModel | TaggedUnionModel) => Promise<void>): Promise<void> => {

        const resolved = new Set<string>()

        const resolve = async (model?: RoutesModel | Model) => {
            if (model == null) return

            if (model.kind === 'record' || model.kind === 'tagged-union' || model.kind === 'routes') {
                const modelId = requireId(model)
                if (resolved.has(modelId)) return
                resolved.add(modelId)
                await traveller(model)
            }
        }

        for (const route of routes) {
            for (const parameter of Object.values(route.pathParams)) {
                await resolve(parameter)
            }

            for (const operation of Object.values(route.operations)) {

                if (operation.pathParams) for (const parameter of Object.values(operation.pathParams)) {
                    await resolve(parameter)
                }

                if (operation.queryParams) for (const parameter of Object.values(operation.queryParams)) {
                    await resolve(parameter)
                }

                if (operation.headerParams) for (const parameter of Object.values(operation.headerParams)) {
                    await resolve(parameter)
                }

                if (operation.content) await resolve(operation.content)

                for (const response of Object.values(operation.responses)) {

                    if (response.headers) for (const parameter of Object.values(response.headers)) {
                        await resolve(parameter)
                    }

                    if (response.content) await resolve(response.content)
                }
            }

            await traveller(route)
        }

        for (const model of models.values()) await resolve(model)
    }

    return {
        outputDir,
        models,
        createModule,
        travel,
        requireId,
        addModel,
    }
}