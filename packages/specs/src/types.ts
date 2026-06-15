import type { StandardTypedV1 } from "@standard-schema/spec"
import type { PartialOnUndefinedDeep } from "type-fest"

export interface BasicModel<T> {
  title?: string
  description?: string
  deprecated?: boolean
  examples?: T[]
  schema?: StandardTypedV1<T, T>
  default?: T
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

export type InferUnion<T extends Record<string, Models>> = string extends keyof T
  ? any
  : {
      [key in keyof T]: { [k in key]: StandardTypedV1.InferOutput<NonNullable<T[key]["schema"]>> }
    }[keyof T]

export interface TaggedUnionModel<
  K extends string,
  Variants extends Record<string, RecordModel<Record<string, Models>, string>>,
> extends BasicModel<InferTaggedUnion<K, Variants>> {
  kind: "taggedUnion"
  discriminator: K
  variants: Variants
  id: string
}

export type InferTaggedUnion<
  K extends string,
  Variants extends Record<string, RecordModel<Record<string, Models>, string>>,
> = string extends K
  ? any
  : {
      [key in keyof Variants]: StandardTypedV1.InferOutput<NonNullable<Variants[key]["schema"]>>
    }[keyof Variants]

export type ValidateTaggedUnion<
  K extends string,
  V extends Record<string, RecordModel<Record<string, Models>, string>>,
> = {
  [Key in keyof V as V[Key] extends RecordModel<infer Properties, infer Required>
    ? K extends keyof Properties
      ? Properties[K] extends LiteralModel<Key & string>
        ? K extends Required
          ? never
          : `[taggedUnion] variant "${Key & string}" → discriminator "${K}" 不在 required 中`
        : `[taggedUnion] variant "${Key & string}" → "${K}" 必须为 literal("${Key & string}")`
      : `[taggedUnion] variant "${Key & string}" → 缺少 discriminator "${K}"`
    : never]: string
}

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
  | TaggedUnionModel<string, Record<string, RecordModel<Record<string, Models>, string>>>
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

export interface RecordModelOptions<
  T extends Record<string, Models>,
  O extends keyof T & string = never,
> extends Omit<RecordModel<T, Exclude<keyof T & string, O>>, "kind" | "required"> {
  optional?: O[]
}

export function record<
  T extends Record<string, Models>,
  const O extends keyof T & string = never,
>(
  options: RecordModelOptions<T, O>,
): RecordModel<T, Exclude<keyof T & string, O>> {
  const { optional, ...rest } = options
  const allKeys = Object.keys(options.properties) as (keyof T & string)[]
  const required = allKeys.filter((k) => !(optional ?? []).includes(k as any))
  return { kind: "record", ...rest, required } as any
}

export function union<T extends Record<string, Models>>(options: OptionsOf<UnionModel<T>>): UnionModel<T> {
  return { kind: "union", ...options }
}

export function taggedUnion<
  K extends string,
  Variants extends Record<string, RecordModel<Record<string, Models>, string>>,
>(
  options: Omit<TaggedUnionModel<K, Variants>, "kind"> & ValidateTaggedUnion<K, Variants>,
): TaggedUnionModel<K, Variants> {
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
