import type { Model } from "./meta";

export interface AllOfModel<T> extends Model<T> {
    readonly type: 'allOf'
    readonly models: Model<T>[]
}