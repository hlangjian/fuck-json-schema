import type { HttpMethod, RouteModel, SimpleType } from "../api"
import type { Models, RecordModel } from "../types"

export type AnyRouteModel = RouteModel<
  string,
  Record<string, SimpleType>,
  Models,
  RecordModel<Record<string, Models>, string>,
  RecordModel<Record<string, Models>, string>,
  Record<number, any>
>

export interface CollectOptions {
  /** 将 originalId 映射为标识符，默认 pascalCase */
  identifier?: (id: string) => string
  /** 命名空间，如 "com.example" */
  namespace?: string
}

export interface ModelDescriptor {
  kind: string
  originalId: string
  identifier: string
  namespace?: string
  title?: string
  description?: string
  deprecated?: boolean
  examples?: unknown[]
}

export interface RecordDescriptor extends ModelDescriptor {
  kind: "record"
  fields: FieldDescriptor[]
}

export interface FieldDescriptor {
  name: string
  model: Models
  required: boolean
  title?: string
  description?: string
  deprecated?: boolean
}

export interface EnumsDescriptor extends ModelDescriptor {
  kind: "enums"
  values: Record<string, string>
}

export interface UnionDescriptor extends ModelDescriptor {
  kind: "union"
  variants: Record<string, Models>
}

export interface TaggedUnionDescriptor extends ModelDescriptor {
  kind: "taggedUnion"
  variants: Record<string, Models>
  variantKey: string
  payloadKey: string
}

export type AnyNamedDescriptor = RecordDescriptor | EnumsDescriptor | UnionDescriptor | TaggedUnionDescriptor

export interface OperationDescriptor {
  id: string
  group: string
  method: HttpMethod
  path: string
  summary?: string
  description?: string
  tags?: string[]
  requestModel: Models | null
  responses: Record<number, Models | null>
  responseKinds: Record<number, string>
  pathVariables: Record<string, { model: Models; name: string }>
  queries: Record<string, { model: Models; name: string; required: boolean }>
  headers: Record<string, { model: Models; name: string; required: boolean }>
}

export interface SchemaInfo {
  kind: "record" | "enums" | "union" | "taggedUnion"
  fields?: Array<{ name: string; model: Models; required: boolean }>
  variants?: Record<string, string>
  unionVariants?: Record<string, Models>
  variantKey?: string
  payloadKey?: string
}

export type SchemaMap = Map<string, SchemaInfo>
