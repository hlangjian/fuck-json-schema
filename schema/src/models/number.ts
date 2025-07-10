import type { Model } from "./meta";

export interface NumberModel extends Model<number> {
    readonly type: 'number' | 'integer'
    readonly multipleOf?: number
    readonly maximum?: number
    readonly exclusiveMaximum?: number
    readonly minimum?: number
    readonly exclusiveMinimum?: number
}