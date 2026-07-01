export interface FieldOptions {
  optional?: boolean
  defaultValue?: unknown
}

export interface ValidationLib {
  name: string
  ns: string
  importStmt: string

  int32(): string

  float32(): string

  float64(): string

  boolean(): string

  string(): string

  datetime(): string

  date(): string

  duration(): string

  uuid(): string

  literal(value: unknown): string

  null(): string

  unknown(): string

  array(inner: string): string

  set(inner: string): string

  map(keyType: string, valueType: string): string

  enums(values: string[]): string

  union(members: string[]): string

  discriminatedUnion(key: string, members: string[]): string

  field(inner: string, opts?: FieldOptions): string

  parse(schemaExpr: string, dataExpr: string): string

  infer(schemaRefName: string): string

  envArray(inner: string): string

  envSet(inner: string): string
}

const escape = JSON.stringify

export const zodLib: ValidationLib = {
  name: "zod",
  ns: "z",
  importStmt: 'import { z } from "zod"',

  int32: () => "z.coerce.number().int()",
  float32: () => "z.coerce.number()",
  float64: () => "z.coerce.number()",
  boolean: () => "z.coerce.boolean()",
  string: () => "z.string()",
  datetime: () => "z.iso.datetime()",
  date: () => "z.iso.date()",
  duration: () => "z.string()",
  uuid: () => "z.uuid()",
  literal: (v) => `z.literal(${escape(v)})`,
  null: () => "z.null()",
  unknown: () => "z.unknown()",

  array: (inner) => `${inner}.array()`,
  set: (inner) => `${inner}.array()`,
  map: (key, value) => `z.record(${key}, ${value})`,
  enums: (values) => `z.enum(${escape(values)})`,
  union: (members) => `z.union([${members.join(", ")}])`,
  discriminatedUnion: (key, members) => `z.discriminatedUnion(${escape(key)}, [${members.join(", ")}])`,

  field: (inner, opts = {}) => {
    if (opts.defaultValue !== undefined) return `${inner}.default(${escape(opts.defaultValue)})`

    if (opts.optional) return `${inner}.optional()`

    return inner
  },

  parse: (schema, data) => `${schema}.parse(${data})`,
  infer: (ref) => `z.infer<typeof ${ref}>`,

  envArray: (inner) => `z.coerce.string().transform(s => z.array(${inner}).parse(s.split(',').filter(Boolean)))`,
  envSet: (inner) => `z.coerce.string().transform(s => z.array(${inner}).parse(s.split(',').filter(Boolean)))`,
}

export const valibotLib: ValidationLib = {
  name: "valibot",
  ns: "v",
  importStmt: 'import * as v from "valibot"',

  int32: () => "v.pipe(v.string(), v.toNumber(), v.integer())",
  float32: () => "v.pipe(v.string(), v.toNumber())",
  float64: () => "v.pipe(v.string(), v.toNumber())",
  boolean: () => "v.pipe(v.string(), v.parseBoolean())",
  string: () => "v.string()",
  datetime: () => "v.pipe(v.string(), v.isoDateTime())",
  date: () => "v.pipe(v.string(), v.isoDate())",
  duration: () => "v.string()",
  uuid: () => "v.pipe(v.string(), v.uuid())",
  literal: (v) => `v.literal(${escape(v)})`,
  null: () => "v.null()",
  unknown: () => "v.unknown()",

  array: (inner) => `v.array(${inner})`,
  set: (inner) => `v.set(${inner})`,
  map: (key, value) => `v.record(${key}, ${value})`,
  enums: (values) => `v.picklist(${escape(values)})`,
  union: (members) => `v.union([${members.join(", ")}])`,
  discriminatedUnion: (key, members) => `v.variant(${escape(key)}, [${members.join(", ")}])`,

  field: (inner, opts = {}) =>
    opts.defaultValue !== undefined
      ? `v.optional(${inner}, ${escape(String(opts.defaultValue as string | number | boolean))})`
      : opts.optional
        ? `v.optional(${inner})`
        : inner,

  parse: (schema, data) => `v.parse(${schema}, ${data})`,
  infer: (ref) => `v.InferOutput<typeof ${ref}>`,

  envArray: (inner) => `v.pipe(v.string(), v.transform(s => s.split(',').filter(Boolean)), v.array(${inner}))`,
  envSet: (inner) => `v.pipe(v.string(), v.transform(s => s.split(',').filter(Boolean)), v.array(${inner}))`,
}

export function resolveLib(name: string): ValidationLib {
  if (name === "valibot") return valibotLib

  return zodLib
}
