import type { Model } from "./meta";

export interface ArrayModel<T> extends Model<T[]> {
    type: 'array'
    base: Model<T>
    maxItems?: number
    minItems?: number
    uniqueItems?: boolean
    maxContains?: number
    minContains?: number
}