import type { Simplify } from "type-fest"

import {
  type ArrayModel,
  type BooleanModel,
  type DateModel,
  type DatetimeModel,
  type DurationModel,
  type EnumsModel,
  type ErrorModel,
  type Float32Model,
  type Float64Model,
  type Int32Model,
  type Int64Model,
  type KeyOfOptional,
  type LiteralModel,
  type MapModel,
  type OptionalModel,
  type RecordModel,
  type SetModel,
  type StringModel,
  type TaggedUnionModel,
  type TypeModels,
  type UnionModel,
} from "./basic"

/* prettier-ignore */
export type InferDeserialized<T> = 
    | any extends T ? never
    : TypeModels extends T ? any
    : T extends Int32Model ? number
    : T extends Int64Model ? bigint
    : T extends Float32Model ? number
    : T extends Float64Model ? number
    : T extends BooleanModel ? boolean
    : T extends StringModel ? string
    : T extends LiteralModel<infer R> ? R
    : T extends OptionalModel<infer R> ? InferDeserialized<R> | undefined | null
    : T extends ArrayModel<infer R> ? InferDeserialized<R>[]
    : T extends SetModel<infer R> ? Set<InferDeserialized<R>>
    : T extends MapModel<infer R> ? Map<string, InferDeserialized<R>>
    : T extends RecordModel<infer R> ? InferDeserializedRecord<R>
    : T extends UnionModel<infer R> ? InferDeserializedUnion<R>
    : T extends TaggedUnionModel<infer _Tag, infer R> ? InferDeserializedTaggedUnion<R>
    : T extends DatetimeModel ? Temporal.Instant
    : T extends DateModel ? Temporal.Instant
    : T extends DurationModel ? Temporal.Duration
    : T extends ErrorModel<infer Code, infer Context> ? InferDeserializedError<Code, Context>
    : T extends EnumsModel<infer R> ? R[keyof R]
    : never

// prettier-ignore
export type InferDeserializedRecord<T extends {[key: string]: TypeModels}, O extends KeyOfOptional<T> = KeyOfOptional<T>> = Simplify<
  & { [key in Exclude<keyof T, O>]: InferDeserialized<T[key]> } 
  & { [key in O]?: InferDeserialized<T[key]> }
>

// prettier-ignore
export type InferDeserializedUnion<T extends { [key: string]: TypeModels }> = {
    [key in keyof T]: { [k in key]: InferDeserialized<T[key]> }
}[keyof T]

// prettier-ignore
export type InferDeserializedTaggedUnion<Variants extends {[key: string]: RecordModel<{[key: string]: TypeModels}>}> = {
    [key in keyof Variants]:  InferDeserialized<Variants[key]>
}[keyof Variants]

// prettier-ignore
export type InferDeserializedError<Code extends string, Context extends { [key: string]: TypeModels }> = [Context] extends [never] 
  ? { code: Code }
  : { code: Code; context: InferDeserializedRecord<Context> }

export function deserialize<T extends TypeModels>(model: T, json: string): DeserializeResult<InferDeserialized<T>> {
  return deserializeInner(model, JSON.parse(json))
}

export function deserializeInner<T extends TypeModels>(model: T, value: any): DeserializeResult<InferDeserialized<T>> {
  type Ret = DeserializeResult<InferDeserialized<T>>

  const success = (value: any): Ret => ({ isSuccess: true, value })

  if (model.kind === "string") {
    if (typeof value === "string") return success(value)

    return deserializeFailed(model, value)
  }

  if (model.kind === "boolean") {
    if (typeof value === "boolean") return success(value)

    return deserializeFailed(model, value)
  }

  if (model.kind === "int32" || model.kind === "float32" || model.kind === "float64") {
    if (typeof value === "number") return success(value)

    return deserializeFailed(model, value)
  }

  if (model.kind === "int64") {
    if (typeof value === "string") {
      try {
        return success(BigInt(value))
      } catch {
        return deserializeFailed(model, value)
      }
    }

    return deserializeFailed(model, value)
  }

  if (model.kind === "date" || model.kind === "datetime") {
    if (typeof value === "string") {
      try {
        return success(Temporal.Instant.from(value))
      } catch {
        return deserializeFailed(model, value)
      }
    }

    return deserializeFailed(model, value)
  }

  if (model.kind === "duration") {
    if (typeof value === "string") {
      try {
        return success(Temporal.Duration.from(value))
      } catch {
        return deserializeFailed(model, value)
      }
    }

    return deserializeFailed(model, value)
  }

  if (model.kind === "optional") {
    return value == null ? success(undefined) : deserializeInner(model.base, value)
  }

  if (model.kind === "literal") {
    if (model.value === value) return success(value)

    return deserializeFailed(model, value)
  }

  if (model.kind === "array") {
    if (typeof value === "object" && Array.isArray(value)) {
      return success(value.map((o) => deserializeInner(model.base, o)))
    }

    return deserializeFailed(model, value)
  }

  if (model.kind === "set") {
    if (typeof value === "object" && Array.isArray(value)) {
      return success(new Set(value.map((o) => deserializeInner(model.base, o))))
    }

    return deserializeFailed(model, value)
  }

  if (model.kind === "map") {
    if (typeof value === "object" && !Array.isArray(value)) {
      const properties = new Map<string, any>()

      for (const key in value) {
        const result = deserializeInner(model.base, value[key])

        if (result.isSuccess) properties.set(key, result.value)
        else return result
      }

      return success(properties)
    }

    return deserializeFailed(model, value)
  }

  if (model.kind === "enums") {
    if (typeof value === "string" && Object.values(model.variants).includes(value)) return success(value)

    return deserializeFailed(model, value)
  }

  if (model.kind === "record") {
    if (typeof value === "object" && !Array.isArray(value)) {
      const properties = new Map<string, any>()

      for (const key in model.properties) {
        const result = deserializeInner(model.properties[key], value[key])

        if (result.isSuccess) properties.set(key, result.value)
        else return deserializeFailed(model, value)
      }

      return success(Object.fromEntries(properties))
    }

    return deserializeFailed(model, value)
  }

  if (model.kind === "union") {
    if (typeof value === "object" && !Array.isArray(value)) {
      const variantKeys = Object.keys(model.variants)

      for (const key of variantKeys)
        if (key in value) {
          const result = deserializeInner(model.variants[key], value[key])

          if (result.isSuccess) return success({ [key]: result.value })
        }
    }

    return deserializeFailed(model, value)
  }

  if (model.kind === "tagged-union") {
    if (typeof value === "object" && !Array.isArray(value)) {
      const tag = value[model.tag]

      for (const [key, variant] of Object.entries(model.variants)) {
        const tagModel = variant.properties[model.tag] as TypeModels

        if (tagModel.kind === "literal" && tagModel.value === tag) {
          const result = deserializeInner(variant, value)

          if (result.isSuccess) return success({ [key]: result.value })
        }
      }
    }

    return deserializeFailed(model, value)
  }

  if (
    typeof value === "object" &&
    !Array.isArray(value) &&
    "code" in value &&
    "context" in value &&
    value.code === model.code &&
    typeof value.context === "object" &&
    !Array.isArray(value.context)
  ) {
    const properties = new Map<string, any>()

    for (const key in model.context) {
      const result = deserializeInner(model.context[key], value[key])

      if (result.isSuccess) properties.set(key, result.value)
      else return result
    }

    return success({ code: model.code, context: Object.fromEntries(properties) })
  }

  return deserializeFailed(model, value)
}

export interface DeserializeSuccess<T> {
  isSuccess: true
  value: T
}

export interface DeserializeFailed {
  isSuccess: false
  code: "deserial-failed"
  context: {
    expect: TypeModels
    receive: any
  }
}

function deserializeFailed(expect: TypeModels, receive: any): DeserializeFailed {
  return {
    isSuccess: false,
    code: "deserial-failed",
    context: { expect, receive },
  }
}

export type DeserializeResult<T> = DeserializeSuccess<T> | DeserializeFailed

export function serialize<T extends TypeModels>(model: T, value: InferDeserialized<T>): string {
  if (model.kind === "string" || model.kind === "int64") {
    const ret = value as string | bigint
    return `"${ret.toString()}"`
  }

  if (model.kind === "int32" || model.kind === "float32" || model.kind === "float64" || model.kind === "boolean") {
    const ret = value as string | number | boolean | bigint
    return ret.toString()
  }

  if (model.kind === "array") {
    const arr = value as unknown[]
    return arr.map((o) => serialize(model.base, o)).join(",")
  }

  if (model.kind === "set") {
    const set = value as Set<unknown>
    return set
      .values()
      .map((o) => serialize(model.base, o))
      .toArray()
      .join(",")
  }

  if (model.kind === "map") {
    const map = value as Map<string, unknown>
    return `{${map.entries().map(([k, v]) => `"${k}": ${serialize(model.base, v)}`)}}`
  }

  if (model.kind === "literal") return model.value.toString()

  if (model.kind === "date" || model.kind === "datetime" || model.kind === "duration") {
    const ret = value as Temporal.Instant | Temporal.Duration
    return ret.toJSON()
  }

  if (model.kind === "optional") {
    return value == null ? "null" : serialize(model.base, value)
  }

  if (model.kind === "error") {
    const properties: string[] = []

    for (const key in model.context) {
      properties.push(`"${key}": ${serialize(model.context[key], value[key])}`)
    }

    return `{"code":"${model.code}",context:{${properties}}}`
  }

  if (model.kind === "record") {
    const properties: string[] = []

    for (const key in model.properties) {
      properties.push(`"${key}": ${serialize(model.properties[key], value[key])}`)
    }

    return `{${properties}}`
  }

  if (model.kind === "union") {
    const variantKeys = Object.keys(model.variants)

    for (const key of variantKeys)
      if (key in value) {
        return `{"${key}":${serialize(model.variants[key], value[key])}}`
      }
  }

  if (model.kind === "tagged-union") {
    return JSON.stringify(value)
  }

  // Enums
  return String(value)
}
