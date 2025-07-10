import type { Model } from "./meta"

export interface ObjectModel<T extends { [key: string]: Model<unknown> }, R extends keyof T> extends Model<ObjectModelType<T, R>> {
    readonly type: 'object'
    readonly properties: T
    readonly required?: readonly R[]
}

type ObjectModelType<T extends { [key: string]: Model<unknown> }, R extends keyof T = never>
    = { [key in keyof T as key extends R ? key : never]: T[key] extends Model<infer R> ? R : never }
    & { [key in keyof T as key extends R ? never : key]?: T[key] extends Model<infer R> ? R : never }
