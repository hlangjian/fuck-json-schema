import type { JsonSchema7Object } from "./json-schema-draft-07"
import type { FormatVariants, JsonSchemaObject } from "./json-schema-draft-2020-12"

// JSON Schema 2020-12 variants
export interface StringSchema {
  maxLength?: number
  minLength?: number
  pattern?: string
  format?: FormatVariants | (string & {})
}

export interface NumberSchema {
  multipleOf?: number
  maximum?: number
  exclusiveMaximum?: number
  minimum?: number
  exclusiveMinimum?: number
}

export interface Int64Schema {
  multipleOf?: number
  maximum?: number
  exclusiveMaximum?: number
  minimum?: number
  exclusiveMinimum?: number
}

export interface ArraySchema {
  maxItems?: number
  minItems?: number
  contains?: JsonSchemaObject
  maxContains?: number
  minContains?: number
}

export interface SetSchema {
  maxItems?: number
  minItems?: number
  contains?: JsonSchemaObject
  maxContains?: number
  minContains?: number
}

export interface MapSchema {
  maxProperties?: number
  minProperties?: number
  required?: string[]
  dependentRequired?: { [key: string]: string[] }
}

export interface RecordSchema {}

// JSON Schema 7 (draft-07) variants
export interface JsonSchema7StringSchema {
  maxLength?: number
  minLength?: number
  pattern?: string
}

export interface JsonSchema7NumberSchema {
  multipleOf?: number
  maximum?: number
  exclusiveMaximum?: boolean
  minimum?: number
  exclusiveMinimum?: boolean
}

export interface JsonSchema7ArraySchema {
  maxItems?: number
  minItems?: number
  contains?: JsonSchema7Object
}

export interface JsonSchema7SetSchema {
  maxItems?: number
  minItems?: number
  contains?: JsonSchema7Object
}

export interface JsonSchema7MapSchema {
  maxProperties?: number
  minProperties?: number
  required?: string[]
}

export interface JsonSchema7RecordSchema {}
