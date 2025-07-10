import type { AllOfModel } from "./allOf";
import type { AnyOfModel } from "./anyOf";
import type { ArrayModel } from "./array";
import type { BooleanModel } from "./boolean";
import type { MapModel } from "./map";
import type { Model } from "./meta";
import type { NumberModel } from "./number";
import type { ObjectModel } from "./object";
import type { OneOfModel } from "./oneOf";
import type { StringModel } from "./string";

export type ModelOptions =
    | StringModel
    | NumberModel
    | BooleanModel
    | ObjectModel<any, any>
    | ArrayModel<any>
    | MapModel<any>
    | OneOfModel<any>
    | AnyOfModel<any>
    | AllOfModel<any>

export type InferModelOptions<T extends ModelOptions> =
    | T extends StringModel ? StringModel
    : T extends NumberModel ? NumberModel
    : T extends BooleanModel ? BooleanModel
    : T extends ObjectModel<infer R, never> ? ObjectModel<R, never>
    : T extends ObjectModel<infer R, infer D> ? ObjectModel<R, D>
    : T extends ArrayModel<infer R> ? ArrayModel<R>
    : T extends MapModel<infer R> ? MapModel<R>
    : T extends OneOfModel<infer R> ? OneOfModel<R>
    : T extends AnyOfModel<infer R> ? AnyOfModel<R>
    : T extends AllOfModel<infer R> ? AllOfModel<R>
    : never

export function model<const T extends ModelOptions>(model: T): InferModelOptions<T> {
    return model as unknown as InferModelOptions<T>
}

export const isStringModel = (model: Model<unknown>): model is StringModel => model.type === 'string'

export const isNumberModel = (model: Model<unknown>): model is NumberModel => model.type === 'number'

export const isIntegerModel = (model: Model<unknown>): model is NumberModel => model.type === 'integer'

export const isBooleanModel = (model: Model<unknown>): model is BooleanModel => model.type === 'boolean'

export const isArrayModel = (model: Model<unknown>): model is ArrayModel<unknown> => model.type === 'array'

export const isMapModel = (model: Model<unknown>): model is MapModel<unknown> => model.type === 'map'

export const isObjectModel = (model: Model<unknown>): model is ObjectModel<{ [key: string]: Model<unknown> }, string> => model.type === 'object'

export const isOneOfModel = (model: Model<unknown>): model is OneOfModel<Model<unknown>> => model.type === 'oneOf'

export const isAnyOfModel = (model: Model<unknown>): model is AnyOfModel<Model<unknown>> => model.type === 'anyOf'

export const isAllOfModel = (model: Model<unknown>): model is AllOfModel<Model<unknown>> => model.type === 'allOf'