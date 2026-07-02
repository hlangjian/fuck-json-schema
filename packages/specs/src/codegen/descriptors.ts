import type { HttpMethod, RouteModel, SimpleType } from "../api"
import type { Models, RecordModel } from "../types"

export type AnyRouteModel = RouteModel<
  string,
  Record<string, SimpleType>,
  Models,
  RecordModel<Record<string, Models>, string>,
  RecordModel<Record<string, Models>, string>,
  Record<string, any>
>

export interface CollectOptions {
  identifier?: (id: string) => string
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
  discriminator: string
}

export type AnyNamedDescriptor = RecordDescriptor | EnumsDescriptor | UnionDescriptor

export interface OperationDescriptor {
  id: string
  group: string
  groupDescription?: string
  method: HttpMethod
  path: string
  summary?: string
  description?: string
  deprecated?: boolean
  tags?: string[]
  requestModel: Models | null
  responses: { key: string; status: number; model: Models | null; kind: string }[]
  pathVariables: Record<string, { model: Models; name: string }>
  queries: Record<string, { model: Models; name: string; required: boolean }>
  headers: Record<string, { model: Models; name: string; required: boolean }>
}

export type SchemaMap = Map<string, Models>
