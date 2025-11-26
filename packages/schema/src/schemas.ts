import type { FormatVariants } from "./json-schema"

export interface AnySchemaObject {
    title?: string
    description?: string
    default?: any
    deprecated?: boolean
    readOnly?: boolean
    writeOnly?: boolean
    examples?: any[]
    if?: AnySchemaObject
    then?: AnySchemaObject
    else?: AnySchemaObject
    allOf?: AnySchemaObject[]
    anyOf?: AnySchemaObject[]
    oneOf?: AnySchemaObject[]
    not?: AnySchemaObject
}

export interface StringSchemaObject {
    title?: string
    description?: string
    default?: string
    deprecated?: boolean
    readOnly?: boolean
    writeOnly?: boolean
    examples?: string[]
    format?: FormatVariants | (string & {})
    maxLength?: number
    minLength?: number
    pattern?: string
    if?: StringSchemaObject
    then?: StringSchemaObject
    else?: StringSchemaObject
    allOf?: StringSchemaObject[]
    anyOf?: StringSchemaObject[]
    oneOf?: StringSchemaObject[]
    not?: StringSchemaObject
}

export interface NumberSchemaObject {
    title?: string
    description?: string
    default?: number
    deprecated?: boolean
    readOnly?: boolean
    writeOnly?: boolean
    examples?: number[]
    multipleOf?: number
    maximum?: number
    exclusiveMaximum?: number
    minimum?: number
    exclusiveMinimum?: number
    if?: NumberSchemaObject
    then?: NumberSchemaObject
    else?: NumberSchemaObject
    allOf?: NumberSchemaObject[]
    anyOf?: NumberSchemaObject[]
    oneOf?: NumberSchemaObject[]
    not?: NumberSchemaObject
}

export interface BooleanSchemaObject {
    title?: string
    description?: string
    default?: boolean
    deprecated?: boolean
    readOnly?: boolean
    writeOnly?: boolean
    examples?: boolean[]
    if?: BooleanSchemaObject
    then?: BooleanSchemaObject
    else?: BooleanSchemaObject
    allOf?: BooleanSchemaObject[]
    anyOf?: BooleanSchemaObject[]
    oneOf?: BooleanSchemaObject[]
    not?: BooleanSchemaObject
}

export interface ArraySchemaObject<T> {
    title?: string
    description?: string
    default?: T[]
    deprecated?: boolean
    readOnly?: boolean
    writeOnly?: boolean
    examples?: T[][]
    maxItems?: number
    minItems?: number
    if?: ArraySchemaObject<T>
    then?: ArraySchemaObject<T>
    else?: ArraySchemaObject<T>
    allOf?: ArraySchemaObject<T>[]
    anyOf?: ArraySchemaObject<T>[]
    oneOf?: ArraySchemaObject<T>[]
    not?: ArraySchemaObject<T>
}

export interface SetSchemaObject<T> {
    title?: string
    description?: string
    default?: T[]
    deprecated?: boolean
    readOnly?: boolean
    writeOnly?: boolean
    examples?: T[][]
    maxContains?: number
    minContains?: number
    if?: SetSchemaObject<T>
    then?: SetSchemaObject<T>
    else?: SetSchemaObject<T>
    allOf?: SetSchemaObject<T>[]
    anyOf?: SetSchemaObject<T>[]
    oneOf?: SetSchemaObject<T>[]
    not?: SetSchemaObject<T>
}

export interface MapSchemaObject<T> {
    title?: string
    description?: string
    default?: { [key: string]: T }
    deprecated?: boolean
    readOnly?: boolean
    writeOnly?: boolean
    examples?: { [key: string]: T }[]
    if?: MapSchemaObject<T>
    then?: MapSchemaObject<T>
    else?: MapSchemaObject<T>
    allOf?: MapSchemaObject<T>[]
    anyOf?: MapSchemaObject<T>[]
    oneOf?: MapSchemaObject<T>[]
    not?: MapSchemaObject<T>
}

export interface RecordSchemaObject<T> {
    title?: string
    description?: string
    default?: T
    deprecated?: boolean
    readOnly?: boolean
    writeOnly?: boolean
    examples?: T[]
}

export interface EnumsSchemaObject<T> {
    title?: string
    description?: string
    default?: T
    deprecated?: boolean
    readOnly?: boolean
    writeOnly?: boolean
    examples?: T[]
}

export interface AnyOfSchemaObject<T> {
    title?: string
    description?: string
    default?: T
    deprecated?: boolean
    readOnly?: boolean
    writeOnly?: boolean
    examples?: T[]
}

export interface OneOfSchemaObject<T> {
    title?: string
    description?: string
    default?: T
    deprecated?: boolean
    readOnly?: boolean
    writeOnly?: boolean
    examples?: T[]
}