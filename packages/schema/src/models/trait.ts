import { operation, response, routes, type OperationModel, type RoutesModel } from "../api/routes"
import { record } from "./record"
import { string } from "./string"
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

const warehouseService = service({
    methods: {
        createWarehouse: method({
            args: {
                name: string()
            },
        })
    }
})

function createRoute<
    T extends { [key: string]: MethodModel },
    M extends { [key in keyof T]: (method: T[key]) => OperationModel }
>(id: string, path: string, service: ServiceModel<T>, mapper: M): RoutesModel {
    const operations = new Map<string, OperationModel>()

    for (const name in service.methods) {
        const method = service.methods[name]
        const operation = mapper[name](method)
        operations.set(name, operation)
    }

    return routes(path, {
        id,
        operations: Object.fromEntries(operations)
    })
}

const route = createRoute('WarehouseRoute', '/warehouse', warehouseService, {
    createWarehouse: o => operation('GET', '/', {
        ...o,
        responses: {
            Ok: response({
                status: 200,
                content: o.return
            })
        },
        content: record({
            id: 'createWarehouseRequest',
            properties: o.args,
        })
    })
})