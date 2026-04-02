import type { Simplify } from "type-fest"

import type { JsonSchemaObject } from "@/schemas/json-schema-draft-2020-12"
import type { ArraySchema, MapSchema, NumberSchema, SetSchema, StringSchema } from "@/schemas/schema-variants"

export interface BasicModel<T> {
  id?: string
  title?: string
  description?: string
  examples?: T[]
  default?: T
  deprecated?: boolean
}

export interface Int32Model extends BasicModel<number> {
  kind: "int32"
  schema?: NumberSchema
}

export interface Int32ModelOptions extends Omit<Int32Model, "kind"> {}

export function int32(options?: Int32ModelOptions): Int32Model {
  return { kind: "int32", ...options }
}

export interface Int64Model extends BasicModel<string> {
  kind: "int64"
  schema?: StringSchema
}

export interface Int64ModelOptions extends Omit<Int64Model, "kind"> {}

export function int64(options?: Int64ModelOptions): Int64Model {
  return { kind: "int64", ...options }
}

export interface Float32Model extends BasicModel<number> {
  kind: "float32"
  schema?: NumberSchema
}

export interface Float32ModelOptions extends Omit<Float32Model, "kind"> {}

export function float32(options?: Float32ModelOptions): Float32Model {
  return { kind: "float32", ...options }
}

export interface Float64Model extends BasicModel<number> {
  kind: "float64"
  schema?: NumberSchema
}

export interface Float64ModelOptions extends Omit<Float64Model, "kind"> {}

export function float64(options?: Float64ModelOptions): Float64Model {
  return { kind: "float64", ...options }
}

export interface BooleanModel extends BasicModel<boolean> {
  kind: "boolean"
}

export interface BooleanModelOptions extends Omit<BooleanModel, "kind"> {}

export function boolean(options?: BooleanModelOptions): BooleanModel {
  return { kind: "boolean", ...options }
}

export interface StringModel extends BasicModel<string> {
  kind: "string"
  schema?: StringSchema
}

export interface StringModelOptions extends Omit<StringModel, "kind"> {}

export function string(options?: StringModelOptions): StringModel {
  return { kind: "string", ...options }
}

export interface LiteralModel<T extends string | number | boolean> extends BasicModel<T> {
  kind: "literal"
  value: T
}

export interface LiteralModelOptions<T extends string | number | boolean> extends Omit<LiteralModel<T>, "kind"> {}

export function literal<const T extends string | number | boolean>(options: LiteralModelOptions<T>): LiteralModel<T> {
  return { kind: "literal", ...options }
}

/**
 * 表示一个可选类型，代表"值可能存在也可能不存在"的语义。
 *
 * 设计理念：
 * - 统一"空白"语义：将 `null`、`undefined` 和缺失值等多种"空"的概念合并为单一语义，
 *   避免类型系统中存在多个含义模糊的"空"状态。
 * - 序列化到 JSON 时，`Optional` 可以表示为 `null` 或完全省略（取决于上下文）。
 *   `InferModelJsonType<T> | null | undefined` 表示该值可以是基础类型、`null` 或 `undefined`。
 * - 如果需要区分"显式设置为空"和"从未设置"等细分语义，应当另行设计专用类型。
 *
 * @template T 基础模型类型
 */
export interface OptionalModel<T extends TypeModels> extends BasicModel<InferModelJsonType<T> | null | undefined> {
  kind: "optional"
  base: T
}

/**
 * 将类型模型转换为可选类型。
 *
 * @template T 基础模型类型
 */
export type Optionalize<T extends TypeModels> = T extends TypeModels ? OptionalModel<T> : never

export interface OptionalModelOptions<T extends TypeModels> extends Omit<OptionalModel<T>, "kind" | "base"> {}

/**
 * 创建一个可选类型模型。
 *
 * @param base 基础模型类型
 * @param options 可选配置选项
 * @returns 可选类型模型
 */
export function optional<T extends TypeModels>(base: T, options?: OptionalModelOptions<T>): OptionalModel<T> {
  return { kind: "optional", base, ...options }
}

export interface ArrayModel<T> extends BasicModel<InferModelJsonType<T>[]> {
  kind: "array"
  base: T
  schema?: ArraySchema
}

export interface ArrayModelOptions<T extends TypeModels> extends Omit<ArrayModel<T>, "kind" | "base"> {}

export function array<T extends TypeModels>(base: T, options?: ArrayModelOptions<T>): ArrayModel<T> {
  return { kind: "array", base, ...options }
}

export interface SetModel<T extends TypeModels> extends BasicModel<InferModelJsonType<T>[]> {
  kind: "set"
  base: T
  schema?: SetSchema
}

export interface SetModelOptions<T extends TypeModels> extends Omit<SetModel<T>, "kind" | "base"> {}

export function set<T extends TypeModels>(base: T, options?: SetModelOptions<T>): SetModel<T> {
  return { kind: "set", base, ...options }
}

export interface MapModel<T> extends BasicModel<{ [key: string]: InferModelJsonType<T> }> {
  kind: "map"
  base: T
  schema?: MapSchema
}

export interface MapModelOptions<T extends TypeModels> extends Omit<MapModel<T>, "kind" | "base"> {}

export function map<T extends TypeModels>(base: T, options?: MapModelOptions<T>): MapModel<T> {
  return { kind: "map", base, ...options }
}

export interface RecordModel<T extends { [key: string]: TypeModels }> extends BasicModel<InferRecordJsonType<T>> {
  kind: "record"
  id: string
  properties: T
}

type KeyOfOptional<T extends { [key: string]: TypeModels }> = {
  [key in keyof T]: T[key] extends OptionalModel<TypeModels> ? key : never
}[keyof T]

export type InferRecordJsonType<
  T extends { [key: string]: TypeModels },
  O extends KeyOfOptional<T> = KeyOfOptional<T>,
> = Simplify<{ [key in Exclude<keyof T, O>]: InferModelJsonType<T[key]> } & { [key in O]?: InferModelJsonType<T[key]> }>

export interface RecordModelOptions<T extends { [key: string]: TypeModels }> extends Omit<RecordModel<T>, "kind"> {}

export function record<const T extends { [key: string]: TypeModels }>(options: RecordModelOptions<T>): RecordModel<T> {
  return { kind: "record", ...options }
}

export interface UnionModel<T extends { [key: string]: TypeModels }> extends BasicModel<InferUnionJsonType<T>> {
  kind: "union"
  id: string
  variants: T
}

export type InferUnionJsonType<T extends { [key: string]: TypeModels }> = {
  [key in keyof T]: { [k in key]: InferModelJsonType<T[key]> }
}[keyof T]

export interface UnionModelOptions<T extends { [key: string]: TypeModels }> extends Omit<UnionModel<T>, "kind"> {}

export function union<const T extends { [key: string]: TypeModels }>(options: UnionModelOptions<T>): UnionModel<T> {
  return { kind: "union", ...options }
}

export interface DatetimeModel extends BasicModel<string> {
  kind: "datetime"
  schema?: StringSchema
}

export interface DatetimeModelOptions extends Omit<DatetimeModel, "kind"> {}

export function datetime(options?: DatetimeModelOptions): DatetimeModel {
  return { kind: "datetime", ...options }
}

export interface DateModel extends BasicModel<string> {
  kind: "date"
  schema?: StringSchema
}

export interface DateModelOptions extends Omit<DateModel, "kind"> {}

export function date(options?: DateModelOptions): DateModel {
  return { kind: "date", ...options }
}

export interface DurationModel extends BasicModel<string> {
  kind: "duration"
  schema?: StringSchema
}

export interface DurationModelOptions extends Omit<DurationModel, "kind"> {}

export function duration(options?: DurationModelOptions): DurationModel {
  return { kind: "duration", ...options }
}

export interface ErrorModel<Code extends string, Context extends { [key: string]: TypeModels }> extends BasicModel<
  InferErrorModel<Code, Context>
> {
  kind: "error"
  id: string
  code: Code
  context?: Context
}

export type InferErrorModel<Code extends string, Context extends { [key: string]: TypeModels }> = [Context] extends [
  never,
]
  ? { code: Code }
  : { code: Code; context: Context }

export interface ErrorModelOptions<Code extends string, Context extends { [key: string]: TypeModels }> extends Omit<
  ErrorModel<Code, Context>,
  "kind"
> {}

export function error<Code extends string, Context extends { [key: string]: TypeModels }>(
  options: ErrorModelOptions<Code, Context>,
): ErrorModel<Code, Context> {
  return { kind: "error", ...options }
}

export interface EnumsModel<T extends { [key: string]: string }> extends BasicModel<T[keyof T]> {
  id: string
  kind: "enums"
  variants: T
}

export interface EnumsModelOptions<T extends { [key: string]: string }> extends Omit<EnumsModel<T>, "kind"> {}

export function enums<const T extends { [key: string]: string }>(options: EnumsModelOptions<T>): EnumsModel<T> {
  return { kind: "enums", ...options }
}

export type TypeModels =
  | Int32Model
  | Int64Model
  | Float32Model
  | Float64Model
  | BooleanModel
  | StringModel
  | LiteralModel<string | number | boolean>
  | OptionalModel<TypeModels>
  | ArrayModel<TypeModels>
  | SetModel<TypeModels>
  | MapModel<TypeModels>
  | RecordModel<{ [key: string]: TypeModels }>
  | UnionModel<{ [key: string]: TypeModels }>
  | DatetimeModel
  | DateModel
  | DurationModel
  | ErrorModel<string, { [key: string]: TypeModels }>
  | EnumsModel<{ [key: string]: string }>

/* prettier-ignore */
export type InferModelJsonType<T> = any extends T
  ? never
  : TypeModels extends T ? any
  : T extends Int32Model? number
  : T extends Int64Model? string
  : T extends Float32Model? number
  : T extends Float64Model? number
  : T extends BooleanModel? boolean
  : T extends StringModel? string
  : T extends LiteralModel<infer R>? R
  : T extends ArrayModel<infer R>? InferModelJsonType<R>[]
  : T extends SetModel<infer R>? InferModelJsonType<R>[]
  : T extends MapModel<infer R>? Record<string, InferModelJsonType<R>>
  : T extends RecordModel<infer R>? InferRecordJsonType<R>
  : T extends UnionModel<infer R>? InferUnionJsonType<R>
  : T extends DatetimeModel? string
  : T extends DateModel? string
  : T extends DurationModel? string
  : T extends ErrorModel<infer Code, infer Context>? InferErrorModel<Code, Context>
  : T extends EnumsModel<infer R>? R[keyof R]
  : never

export interface ModelToJsonSchemaOptions {
  model: TypeModels
  target?: "draft-2020-12"
  reference?: "inline" | "json-schema" | "openapi"
  depth?: number
}

export function generateJsonSchema(options: ModelToJsonSchemaOptions): JsonSchemaObject {
  const { model, target = "draft-2020-12", reference = "json-schema", depth = 0 } = options ?? {}

  const $schema = getSchemaRef(target)

  const convert = (partial?: JsonSchemaObject): JsonSchemaObject => ({
    $schema: depth === 0 ? $schema : undefined,
    title: model.title,
    description: model.description,
    examples: model.examples,
    deprecated: model.deprecated,
    default: model.default,
    ...partial,
    ...("schema" in model ? model.schema : {}),
  })

  const getReferenceSchema = (schema: TypeModels): JsonSchemaObject => {
    switch (reference) {
      case "inline":
        return generateJsonSchema({ model: schema, target, reference, depth: depth + 1 })

      case "json-schema":
        return schema.id != null
          ? { $ref: "#/$defs/" + schema.id }
          : generateJsonSchema({ model: schema, target, reference, depth: depth + 1 })

      case "openapi":
        return schema.id != null
          ? { $ref: "#/components/schemas/" + schema.id }
          : generateJsonSchema({ model: schema, target, reference, depth: depth + 1 })
    }
  }

  switch (model.kind) {
    case "int32":
      return convert({
        type: "integer",
        format: "int32",
      })

    case "float32":
      return convert({
        type: "number",
        format: "float",
      })

    case "float64":
      return convert({
        type: "number",
        format: "float",
      })

    case "int64":
      return convert({
        type: "string",
        format: "int64",
      })

    case "boolean":
      return convert({
        type: "boolean",
      })

    case "string":
      return convert({
        type: "string",
      })

    case "literal":
      return convert({
        const: model.value,
      })

    case "optional": {
      const baseSchema = getReferenceSchema(model.base)

      if ("$ref" in baseSchema)
        return convert({
          oneOf: [baseSchema, { type: "null" }],
        })

      const { type = [], ...others } = baseSchema

      return convert({
        type: Array.isArray(type) ? ([...new Set([...type, "null"])] as JsonSchemaObject["type"]) : [type, "null"],
        ...others,
      })
    }

    case "array":
      return convert({
        type: "array",
        items: getReferenceSchema(model.base),
      })

    case "set":
      return {
        $schema,
        type: "array",
        items: getReferenceSchema(model.base),
        uniqueItems: true,
      }

    case "map":
      return convert({
        type: "object",
        additionalProperties: getReferenceSchema(model.base),
      })

    case "record":
      return convert({
        type: "object",
        properties: Object.fromEntries(Object.entries(model.properties).map(([k, v]) => [k, getReferenceSchema(v)])),
        required: Object.entries(model.properties)
          .filter(([_, v]) => v.kind !== "optional")
          .map(([k]) => k),
        additionalProperties: false,
      })

    case "union":
      return convert({
        oneOf: Object.entries(model.variants).map(([k, v]) => ({
          type: "object",
          title: v.title ?? k,
          properties: { [k]: getReferenceSchema(v as TypeModels) },
          required: [k],
          additionalProperties: false,
        })),
      })

    case "datetime":
      return convert({
        type: "string",
        format: "date-time",
      })

    case "date":
      return convert({
        type: "string",
        format: "date",
      })

    case "duration":
      return convert({
        type: "string",
        format: "duration",
      })

    case "error":
      return convert({
        type: "object",
        properties: {
          code: { const: model.code },
          context:
            model.context == null
              ? undefined
              : {
                  type: "object",
                  properties: Object.fromEntries(
                    Object.entries(model.context).map(([k, v]) => [k, getReferenceSchema(v as TypeModels)]),
                  ),
                  additionalProperties: false,
                },
        },
        additionalProperties: false,
      })

    case "enums":
      return convert({
        type: "string",
        enum: Object.values(model.variants),
      })
  }
}

function getSchemaRef(target: ModelToJsonSchemaOptions["target"]) {
  switch (target) {
    case "draft-2020-12":
      return "https://json-schema.org/draft/2020-12/schema"
  }
}

export type NamedModel =
  | RecordModel<{ [key: string]: TypeModels }>
  | EnumsModel<{ [key: string]: string }>
  | UnionModel<{ [key: string]: TypeModels }>
  | ErrorModel<string, { [key: string]: TypeModels }>
