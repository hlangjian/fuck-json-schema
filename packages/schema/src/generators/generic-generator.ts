import { type RoutesModel } from "../api/routes";
import type { RecordModel } from "../models/record";
import type { TaggedUnionModel } from "../models/tagged-union";
import type { Model } from "../models/types";

export interface GeneratorContext {
    outputDir: string
    baseNamespace: string
    routes: RoutesModel[]
    models: Model[]
    travel: (traveller: (model: RoutesModel | RecordModel | TaggedUnionModel) => Promise<void>) => Promise<void>
    createModule: (id: string) => ModuleGeneratorContext
}

export interface ModuleGeneratorContext {
    id: string
    dependencies: Set<string>
    dependsOn: (id: string) => void
    outputDir: string
    baseNamespace: string
}

export interface GeneratorContextOptions {
    outputDir?: string
    baseNamespace?: string
    routes?: RoutesModel[]
    models?: Model[]
}

export function createGeneratorContext(options?: GeneratorContextOptions): GeneratorContext {

    const {
        outputDir = '',
        baseNamespace = '',
        routes = [],
        models = [],
    } = options ?? {}

    const createModule = (id: string): ModuleGeneratorContext => {
        const dependencies = new Set<string>()

        const dependsOn = (id: string) => dependencies.add(id)

        return { id, dependencies, dependsOn, outputDir, baseNamespace }
    }

    const travel = async (traveller: (model: RoutesModel | RecordModel | TaggedUnionModel) => Promise<void>): Promise<void> => {

        const resolved = new Set<string>()

        const resolve = async (model?: RoutesModel | Model) => {
            if (model == null) return

            if (model.kind === 'record' || model.kind === 'tagged-union' || model.kind === 'routes') {
                if (resolved.has(model.id)) return
                resolved.add(model.id)
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

        for (const model of models) await resolve(model)
    }

    return {
        outputDir,
        baseNamespace,
        routes,
        models,
        createModule,
        travel,
    }
}