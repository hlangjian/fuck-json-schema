import type { Model } from "./meta";

export interface MapModel<T> extends Model<{ [key: string]: T }> {
    readonly type: 'map'
    readonly base: Model<T>
}