import type { ArrayModel } from "./array"
import type { BooleanModel } from "./boolean"
import type { ConstantModel } from "./constant"
import type { MapModel } from "./map"
import type { NumberModel } from "./number"
import type { OptionalModel } from "./optional"
import type { InferProperties, RecordModel } from "./record"
import type { SetModel } from "./set"
import type { DateModel, DatetimeModel, TimeModel } from "./specials/date-time"
import type { UUIDModel } from "./specials/uuid"
import type { StringModel } from "./string"
import type { InferVariants, TaggedUnionModel } from "./tagged-union"

export type Model =
    | StringModel
    | NumberModel
    | BooleanModel
    | ArrayModel<Model>
    | SetModel<Model>
    | OptionalModel | ConstantModel
    | MapModel
    | TaggedUnionModel
    | RecordModel<{ [key: string]: Model }>
    | DateModel | TimeModel | DatetimeModel
    | UUIDModel

export type InferModel<T extends Model>
    = RecordModel extends T ? any
    : Model extends T ? any
    : T extends StringModel ? string
    : T extends NumberModel ? number
    : T extends BooleanModel ? boolean
    : T extends ArrayModel<infer R> ? InferModel<R>[]
    : T extends SetModel<infer R> ? Set<InferModel<R>>
    : T extends MapModel<infer R> ? { [key: string]: InferModel<R> }
    : T extends OptionalModel<infer T, infer R> ? InferModel<T> | R
    : T extends TaggedUnionModel<infer R> ? InferVariants<R>
    : T extends RecordModel<infer R> ? InferProperties<R>
    : T extends ConstantModel<Model, infer R> ? R
    : T extends DateModel | TimeModel | DatetimeModel ? Date
    : T extends UUIDModel ? string
    : never

// export type PartialProperties<T extends { [key: string]: Model }>
//     = { [key in keyof T]: OptionModel<T[key] extends OptionModel<infer R> ? R : T[key]> }

// export function partial<T extends { [key: string]: Model }>(properties: T,): PartialProperties<T> {

//     const options = new Map<string, OptionModel<Model>>()

//     for (const [key, value] of Object.entries(properties)) {
//         options.set(key, value.kind === 'option' ? value : option(value))
//     }

//     return Object.fromEntries(options) as PartialProperties<T>
// }