import type { RoutesModel } from "./routes";

export function isRoutesModel(obj: any): obj is RoutesModel {
    return obj != null && typeof obj === 'object' && 'kind' in obj && obj.kind === 'routes'
}