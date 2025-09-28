import type { Simplify } from "type-fest"
import type { JsonSchemaObject } from "./json-schema"

export const modelSymbol: unique symbol = Symbol('model')

export type Model = PrimitiveModel | CustomModel

export type BasicModel = StringModel | NumberModel | BooleanModel | DerivedModel<StringModel> | DerivedModel<NumberModel> | DerivedModel<BooleanModel>

/** Primitive Models */

export interface StringModel {
    kind: 'string'
    title?: string
    description?: string
    examples?: string[]
    [modelSymbol]: true
}

export type StringModelOptions = Omit<StringModel, typeof modelSymbol | 'kind'>

export function string(options?: StringModelOptions): StringModel {
    return ({ kind: 'string', ...options, [modelSymbol]: true })
}

export interface NumberModel {
    kind: 'number'
    type: 'short' | 'int' | 'long' | 'float' | 'double' | 'decimal'
    title?: string
    description?: string
    examples?: number[]
    [modelSymbol]: true
}

export type NumberModelOptions = Omit<NumberModel, typeof modelSymbol | 'kind' | 'type'>

export function number(type: NumberModel['type'] = 'int', options?: NumberModelOptions): NumberModel {
    return ({ kind: 'number', type, ...options, [modelSymbol]: true })
}

export interface BooleanModel {
    kind: 'boolean'
    title?: string
    description?: string
    examples?: boolean[]
    [modelSymbol]: true
}

export type BooleanModelOptions = Omit<BooleanModel, typeof modelSymbol | 'kind'>

export function boolean(options?: BooleanModelOptions): BooleanModel {
    return ({ kind: 'boolean', ...options, [modelSymbol]: true })
}

export interface ArrayModel<T extends Model> {
    kind: 'array'
    base: T
    title?: string
    description?: string
    examples?: TypeOfModel<T>[]
    [modelSymbol]: true
}

export type ArrayModelOptions<T extends Model> = Omit<ArrayModel<T>, typeof modelSymbol | 'kind' | 'base'>

export function array<T extends Model>(base: T, options?: ArrayModelOptions<T>): ArrayModel<T> {
    return ({ kind: 'array', base, ...options, [modelSymbol]: true })
}

export interface SetModel<T extends Model> {
    kind: 'set'
    base: T,
    title?: string
    description?: string
    examples?: Set<TypeOfModel<T>>[]
    [modelSymbol]: true
}

export type SetModelOptions<T extends Model> = Omit<SetModel<T>, typeof modelSymbol | 'kind' | 'base'>

export function set<T extends Model>(base: T, options?: SetModelOptions<T>): SetModel<T> {
    return ({ kind: 'set', base, ...options, [modelSymbol]: true })
}

export interface MapModel<T extends Model> {
    kind: 'map'
    base: T
    title?: string
    description?: string
    examples?: { [key: string]: TypeOfModel<T> }[]
    [modelSymbol]: true
}

export type MapModelOptions<T extends Model> = Omit<MapModel<T>, typeof modelSymbol | 'kind' | 'base'>

export function map<T extends Model>(base: T, options?: MapModelOptions<T>): MapModel<T> {
    return ({ kind: 'map', base, ...options, [modelSymbol]: true })
}

export interface OptionalModel<T extends Model> {
    kind: 'optional'
    base: T
    [modelSymbol]: true
}

export function optional<T extends Model>(base: T): OptionalModel<T> {
    return { kind: 'optional', base, [modelSymbol]: true }
}

export interface ConstantModel<T extends Model> {
    kind: 'constant'
    base: T
    value: TypeOfModel<T>
    title?: string
    description?: string
    examples?: TypeOfModel<T>[]
    [modelSymbol]: true
}

export type ConstantModelOptions<T extends Model> = Omit<ConstantModel<T>, typeof modelSymbol | 'kind' | 'base' | 'value'>

export function constant<T extends Model>(base: T, value: TypeOfModel<T>, options?: ConstantModelOptions<T>): ConstantModel<T> {
    return { kind: 'constant', base, value, ...options, [modelSymbol]: true }
}

export type PrimitiveModel = StringModel | NumberModel | BooleanModel | ArrayModel<any> | SetModel<any> | MapModel<any> | OptionalModel<any> | ConstantModel<any>

export type TypeOfPrimitiveModel<T extends PrimitiveModel> =
    | PrimitiveModel extends T ? any
    : T extends StringModel ? string
    : T extends NumberModel ? number
    : T extends BooleanModel ? boolean
    : T extends ArrayModel<infer R> ? TypeOfModel<R>[]
    : T extends SetModel<infer R> ? Set<TypeOfModel<R>>
    : T extends MapModel<infer R> ? { [key: string]: TypeOfModel<R> }
    : T extends OptionalModel<infer R> ? TypeOfModel<R>
    : T extends ConstantModel<infer R> ? TypeOfModel<R>
    : never

/** Custom Models */

export interface DerivedModel<T extends PrimitiveModel> {
    kind: 'derived'
    id: string
    base: T
    schema?: JsonSchemaObject
    title?: string
    description?: string
    examples?: TypeOfModel<T>[]
    [modelSymbol]: true
}

export type DerivedModelOptions<T extends PrimitiveModel> = Omit<DerivedModel<T>, typeof modelSymbol | 'kind' | 'id' | 'base'>

export function derived<T extends PrimitiveModel>(id: string, base: T, options?: DerivedModelOptions<T>): DerivedModel<T> {
    return { kind: 'derived', id, base, ...options, [modelSymbol]: true }
}

export interface RecordModel<T extends { [key: string]: Model | OptionalModel<Model> }> {
    kind: 'record'
    id: string
    properties: T
    schema?: JsonSchemaObject
    title?: string
    description?: string
    examples?: TypeOfProperties<T>[]
    [modelSymbol]: true
}

export type TypeOfProperties<T extends { [key: string]: Model | OptionalModel<Model> }> = Simplify<
    & { [key in keyof T as T[key] extends OptionalModel<any> ? key : never]?: TypeOfModel<T[key]> }
    & { [key in keyof T as T[key] extends OptionalModel<any> ? never : key]: TypeOfModel<T[key]> }
>

export type RecordModelOptions<T extends { [key: string]: Model | OptionalModel<Model> }> = Omit<RecordModel<T>, typeof modelSymbol | 'kind' | 'id' | 'properties'>

export function record<T extends { [key: string]: Model | OptionalModel<Model> }>(id: string, properties: T, options?: RecordModelOptions<T>): RecordModel<T> {
    return { kind: 'record', id, properties, ...options, [modelSymbol]: true }
}

export interface EnumsModel<T extends StringModel | NumberModel> {
    kind: 'enums'
    id: string
    base: T
    variants: { [key: string]: TypeOfPrimitiveModel<T> }
    title?: string
    description?: string
    examples?: TypeOfPrimitiveModel<T>[]
    [modelSymbol]: true
}

export type EnumsModelOptions<T extends StringModel | NumberModel> = Omit<EnumsModel<T>, typeof modelSymbol | 'kind' | 'id' | 'base' | 'values'>

export function enums<T extends StringModel | NumberModel>(id: string, base: T, variants: { [key: string]: TypeOfPrimitiveModel<T> }, options?: EnumsModelOptions<T>): EnumsModel<T> {
    return { kind: 'enums', id, base, variants, ...options, [modelSymbol]: true }
}

export interface UnionModel<T extends { [key: string]: RecordModel<{ [key: string]: Model | OptionalModel<Model> }> }> {
    kind: 'union'
    id: string
    variants: T
    discriminator?: string
    title?: string
    description?: string
    examples?: TypeOfModel<T[keyof T]>[]
    [modelSymbol]: true
}

export type UnionModelOptions<T extends { [key: string]: RecordModel<any> }> = Omit<UnionModel<T>, typeof modelSymbol | 'kind' | 'id' | 'variants'>

export function union<T extends { [key: string]: RecordModel<{ [key: string]: Model | OptionalModel<Model> }> }>(id: string, variants: T, options?: UnionModelOptions<T>): UnionModel<T> {
    return { kind: 'union', id, variants, ...options, [modelSymbol]: true }
}

export type CustomModel = DerivedModel<PrimitiveModel> | EnumsModel<StringModel | NumberModel> | RecordModel<{ [key: string]: Model | OptionalModel<Model> }> | UnionModel<{ [key: string]: RecordModel<{ [key: string]: Model | OptionalModel<Model> }> }>

export type TypeOfCustomModel<T extends CustomModel> =
    | CustomModel extends T ? any
    : T extends DerivedModel<infer R> ? TypeOfPrimitiveModel<R>
    : T extends EnumsModel<infer R> ? TypeOfPrimitiveModel<R>
    : T extends UnionModel<infer R> ? { [key: string]: RecordModel<{ [key: string]: Model | OptionalModel<Model> }> } extends R ? any : TypeOfCustomModel<R[keyof R]>
    : T extends RecordModel<infer R> ? { [key: string]: Model | OptionalModel<Model> } extends R ? any : TypeOfProperties<R>
    : never

/** Helper Model */

export type TypeOfModel<T extends Model> =
    | T extends PrimitiveModel ? TypeOfPrimitiveModel<T>
    : T extends CustomModel ? TypeOfCustomModel<T>
    : never

export function isBasicModel(model: Model): model is BasicModel {
    if (model.kind === 'string' || model.kind === 'number' || model.kind === 'boolean') return true
    if (model.kind === 'derived' && isBasicModel(model.base)) return true
    return false
}

export function isModel(value: any): value is Model {
    return typeof value === 'object' && !Array.isArray(value) && modelSymbol in value
}

export function isCustomModel(value: any): value is CustomModel {
    if (isModel(value)) {
        return value.kind === 'derived'
            || value.kind === 'enums'
            || value.kind === 'record'
            || value.kind === 'union'
    }
    return false
}

export function isPrimitiveModel(value: any): value is PrimitiveModel {
    return isModel(value) && !isCustomModel(value)
}