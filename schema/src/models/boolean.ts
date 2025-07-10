import type { Model } from "./meta";

export interface BooleanModel extends Model<boolean> {
    readonly type: 'boolean'
}