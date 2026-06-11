import type { StandardTypedV1 } from "@standard-schema/spec"
import type { PartialOnUndefinedDeep } from "type-fest"

export interface BasicModel<T> {
  title?: string
  description?: string
  examples?: T[]
  schema?: StandardTypedV1<T, T>
}

export interface Int32Model extends BasicModel<number> {
  kind: "int32"
}

export interface Float32Model extends BasicModel<number> {
  kind: "float32"
}

export interface Float64Model extends BasicModel<number> {
  kind: "float64"
}

export interface BooleanModel extends BasicModel<boolean> {
  kind: "boolean"
}

export interface StringModel extends BasicModel<string> {
  kind: "string"
}

export interface ArrayModel<T extends Models> extends BasicModel<InferModel<T>[]> {
  kind: "array"
  base: T
}

export interface SetModel<T extends Models> extends BasicModel<Set<InferModel<T>>> {
  kind: "set"
  base: T
}

export interface MapModel<T extends Models> extends BasicModel<Map<string, InferModel<T>>> {
  kind: "map"
  base: T
}

export interface RecordModel<T extends Record<string, Models>, R extends keyof T & string> extends BasicModel<
  PropertiesType<T, R>
> {
  kind: "record"
  properties: T
  required: R[]
  id: string
}

export type PropertiesType<T extends Record<string, Models>, R extends keyof T> = PartialOnUndefinedDeep<{
  [key in keyof T]: key extends R ? InferModel<T[key]> : InferModel<T[key]> | undefined
}>

export interface UnionModel<T extends Record<string, Models>> extends BasicModel<InferUnion<T>> {
  kind: "union"
  variants: T
  id: string
}

export type InferUnion<T extends Record<string, Models>> = {
  [key in keyof T]: { [k in key]: StandardTypedV1.InferOutput<NonNullable<T[key]["schema"]>> }
}[keyof T]

export interface TaggedUnionModel<
  K extends string,
  D extends string,
  V extends Record<string, Models>,
> extends BasicModel<InferTaggedUnion<K, D, V>> {
  kind: "taggedUnion"
  variants: V
  variantKey: K
  payloadKey: D
  id: string
}

interface TaggedUnionModelOptions<K extends string, D extends string, V extends Record<string, Models>> extends Omit<
  TaggedUnionModel<K, D, V>,
  "kind"
> {}

export type InferTaggedUnion<K extends string, D extends string, V extends Record<string, Models>> = {
  [key in keyof V]: {
    [k in K | D]: k extends K ? key : k extends D ? StandardTypedV1.InferOutput<NonNullable<V[key]["schema"]>> : never
  }
}[keyof V]

export interface LiteralModel<T extends string | number | boolean> extends BasicModel<T> {
  kind: "literal"
  value: T
}

export interface NullModel extends BasicModel<undefined | null> {
  kind: "null"
}

export type OptionsOf<T extends Models> = Omit<T, "kind">

export interface EnumsModel<T extends { [key: string]: string }> extends BasicModel<T[keyof T]> {
  kind: "enums"
  id: string
  variants: T
}

export interface DatetimeModel extends BasicModel<string> {
  kind: "datetime"
}

export interface DateModel extends BasicModel<string> {
  kind: "date"
}

export interface DurationModel extends BasicModel<string> {
  kind: "duration"
}

export type Models =
  | Int32Model
  | Float32Model
  | Float64Model
  | BooleanModel
  | StringModel
  | ArrayModel<any>
  | SetModel<any>
  | MapModel<any>
  | RecordModel<Record<string, Models>, string>
  | UnionModel<Record<string, Models>>
  | TaggedUnionModel<string, string, Record<string, Models>>
  | LiteralModel<string | number | boolean>
  | NullModel
  | EnumsModel<{ [key: string]: string }>
  | DatetimeModel
  | DateModel
  | DurationModel

export type InferModel<T> = T extends { schema?: StandardTypedV1<unknown, unknown> }
  ? StandardTypedV1.InferOutput<NonNullable<T["schema"]>>
  : never

export function int32(options?: OptionsOf<Int32Model>): Int32Model {
  return { kind: "int32", ...options }
}

export function float32(options?: OptionsOf<Float32Model>): Float32Model {
  return { kind: "float32", ...options }
}

export function float64(options?: OptionsOf<Float64Model>): Float64Model {
  return { kind: "float64", ...options }
}

export function boolean(options?: OptionsOf<BooleanModel>): BooleanModel {
  return { kind: "boolean", ...options }
}

export function string(options?: OptionsOf<StringModel>): StringModel {
  return { kind: "string", ...options }
}

export function array<T extends Models>(options: OptionsOf<ArrayModel<T>>): ArrayModel<T> {
  return { kind: "array", ...options }
}

export function set<T extends Models>(options: OptionsOf<SetModel<T>>): SetModel<T> {
  return { kind: "set", ...options }
}

export function map<T extends Models>(options: OptionsOf<MapModel<T>>): MapModel<T> {
  return { kind: "map", ...options }
}

export function record<T extends Record<string, Models>, R extends keyof T & string>(
  options: OptionsOf<RecordModel<T, R>>,
): RecordModel<T, R> {
  return { kind: "record", ...options }
}

export function union<T extends Record<string, Models>>(options: OptionsOf<UnionModel<T>>): UnionModel<T> {
  return { kind: "union", ...options }
}

export function taggedUnion<K extends string, D extends string, V extends Record<string, Models>>(
  options: TaggedUnionModelOptions<K, D, V>,
): TaggedUnionModel<K, D, V> {
  return { kind: "taggedUnion", ...options }
}

export function literal<const T extends string | boolean | number>(value: T): LiteralModel<T> {
  return { kind: "literal", value }
}

export function nullLike(): NullModel {
  return { kind: "null" }
}

export interface EnumsModelOptions<T extends { [key: string]: string }> extends Omit<EnumsModel<T>, "kind"> {}

export function enums<const T extends { [key: string]: string }>(options: EnumsModelOptions<T>): EnumsModel<T> {
  return { kind: "enums", ...options }
}

export interface DatetimeModelOptions extends Omit<DatetimeModel, "kind"> {}

export function datetime(options?: DatetimeModelOptions): DatetimeModel {
  return { kind: "datetime", ...options }
}

export interface DateModelOptions extends Omit<DateModel, "kind"> {}

export function date(options?: DateModelOptions): DateModel {
  return { kind: "date", ...options }
}

export interface DurationModelOptions extends Omit<DurationModel, "kind"> {}

export function duration(options?: DurationModelOptions): DurationModel {
  return { kind: "duration", ...options }
}
