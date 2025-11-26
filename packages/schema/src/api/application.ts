import type { TagObject } from "../openapi-shema"
import type { RoutesModel } from "./routes"
import type { Model } from '../models/types'

export interface ApplicationModel {
    kind: 'application'
    routes: RoutesModel[]
    models: Model[]
    tags?: TagObject[]
}

export interface ApplicationModelOptions {
    routes?: RoutesModel[]
    models?: Model[]
    tags?: TagObject[]
}

export function application(options: ApplicationModelOptions): ApplicationModel {

    const {
        routes = [],
        models = [],
        tags = [],
    } = options

    return {
        kind: 'application',
        routes,
        models,
        tags,
    }
}