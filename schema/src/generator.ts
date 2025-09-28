import type { OperationModel, ResourceModel, ResponseModel, RouteModel } from "./api";
import { isCustomModel, type CustomModel, type Model } from "./model";
import { mkdir, writeFile } from "fs/promises";
import { dirname } from "path";

export const generationSymbol: unique symbol = Symbol('generation')

export interface OperationGenerationModel {
    kind: 'operation-generation'
    operation: OperationModel
    route: RouteModel<string>
    resource: ResourceModel<string>
    [generationSymbol]: true
}

export interface ResponseGenerationModel {
    kind: 'response-generation'
    response: { [key: string]: ResponseModel }
    operation: OperationModel
    route: RouteModel<string>
    resource: ResourceModel<string>
    [generationSymbol]: true
}

export function createGenerator(parse: (context: {
    model: CustomModel | ResourceModel<string>
    getCodes: (startwith: string) => Map<string, string>
    writeCode: (id: string, code: string) => void
    writeFile: (path: string, code: string) => void
}) => void): (models: (CustomModel | ResourceModel<string>)[]) => Map<string, string> {

    const getCustomModelFromResource = (resource: ResourceModel<string>): CustomModel[] => {

        const customs: CustomModel[] = []

        const tryPush = (model: Model) => {
            if (isCustomModel(model)) customs.push(model)
        }

        for (const [name, parameter] of Object.entries(resource.parameters)) {
            tryPush(parameter)
        }

        for (const [name, route] of Object.entries(resource.routes)) {

            for (const [name, parameter] of Object.entries(route.parameter)) {
                tryPush(parameter)
            }

            for (const [name, operation] of Object.entries(route.operations)) {

                if (operation.query) for (const [name, parameter] of Object.entries(operation.query)) {
                    tryPush(parameter)
                }

                if (operation.header) for (const [name, parameter] of Object.entries(operation.header)) {
                    tryPush(parameter)
                }

                if (operation.content) {
                    tryPush(operation.content)
                }

                if (operation.responses) for (const [responseName, response] of Object.entries(operation.responses)) {

                    if (response.header) for (const [name, parameter] of Object.entries(response.header)) {
                        tryPush(parameter)
                    }

                    if (response.content) {
                        tryPush(response.content)
                    }
                }
            }
        }

        return [...new Set(customs)]
    }

    const getCustomModels = (models: (CustomModel | ResourceModel<string>)[]) => {

        const customModels: CustomModel[] = []

        const resourceModels: ResourceModel<string>[] = []

        for (const model of models) {
            if (model.kind === 'resource') {
                resourceModels.push(model)
                customModels.push(...getCustomModelFromResource(model))
            }
            else customModels.push(model)
        }

        return {
            customModels: [...new Set(customModels)],
            resourceModels
        }
    }

    return models => {

        const { customModels, resourceModels } = getCustomModels(models)

        const codes = new Map<string, string>()

        const files = new Map<string, string>()

        const getCodes = (startWith: string) => {
            return new Map(codes.keys().filter(o => o.startsWith(startWith)).map(o => [o, codes.get(o)!]))
        }

        const writeCode = (id: string, code: string) => {
            if (codes.has(id)) throw Error(`you are writing code with same id ${id}`)
            codes.set(id, code)
        }

        const writeFile = (path: string, code: string) => {
            if (files.has(path)) throw Error(`you are writing file with same path ${path}`)
            files.set(path, code)
        }

        for (const model of [...customModels, ...resourceModels]) {
            parse({ model, getCodes, writeCode, writeFile })
        }

        return files
    }
}

export async function outputFile(path: string, text: string) {
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, text)
}