import type { Model } from "./meta";

export interface OneOfModel<T> extends Model<T> {
    readonly type: 'oneOf'
    readonly models: Model<T>[]
}