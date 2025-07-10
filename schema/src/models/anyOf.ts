import type { Model } from "./meta";

export interface AnyOfModel<T> extends Model<T> {
    readonly type: 'anyOf'
    readonly models: Model<T>[]
}