import type { FormatVariants } from "../net-types"

export interface PatternValidation {
    kind: 'pattern-validation'
    pattern: string
    message?: string
}

export function pattern(pattern: string, message?: string): PatternValidation {
    return { kind: 'pattern-validation', pattern, message }
}

export interface MaxLengthValidation {
    kind: 'max-length-validation'
    value: number
    message?: string
}

export function maxLength(value: number, message?: string): MaxLengthValidation {
    return { kind: 'max-length-validation', value, message }
}

export interface MinLengthValidation {
    kind: 'min-length-validation'
    value: number
    message?: string
}

export function minLength(value: number, message?: string): MinLengthValidation {
    return { kind: 'min-length-validation', value, message }
}

export interface FormatValidation {
    kind: 'format-validation'
    format: FormatVariants
    pattern: string
    message?: string
}

export function format(format: FormatVariants, message?: string): FormatValidation {
    return { kind: 'format-validation', format, pattern: formatRegex[format], message }
}

export const formatRegex: Record<FormatVariants, string> = {
    "date-time": "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?(?:Z|[+-]\\d{2}:\\d{2})$",
    "date": "^\\d{4}-\\d{2}-\\d{2}$",
    "time": "^\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?(?:Z|[+-]\\d{2}:\\d{2})?$",
    "duration": "^P(?=\\d|T\\d)(\\d+Y)?(\\d+M)?(\\d+D)?(T(\\d+H)?(\\d+M)?(\\d+(?:\\.\\d+)?S)?)?$",
    "email": "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$",
    "hostname": "^(?=.{1,253}$)(?:[a-zA-Z0-9](?:[a-zA-Z0-9\\-]{0,61}[a-zA-Z0-9])?\\.)+[a-zA-Z]{2,}$",
    "ipv4": "^(25[0-5]|2[0-4]\\d|1\\d{2}|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d{2}|[1-9]?\\d)){3}$",
    "ipv6": "^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(::1)|::)$",
    "uri": "^[a-zA-Z][a-zA-Z0-9+.-]*:[^\\s]*$",
    "uri-reference": "^[^\\s]*$",
    "uri-template": "^[^\\s{}]*\\{[^\\s{}]+\\}[^\\s{}]*$",
    "url": "^[a-zA-Z][a-zA-Z0-9+.-]*://[^\\s]+$",
    "json-pointer": "^/(?:[^/~]|~[01])*$",
    "relative-json-pointer": "^(\\d+)?(?:/(?:[^/~]|~[01])*)*$",
    "regex": "^.*$",
    "byte": "^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$",
    "binary": "^[01]*$",
    "uuid": "^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
    "ipvfuture": "^v[0-9A-Fa-f]+\\.[A-Za-z0-9\\-._~!$&'()*+,;=:]+$"
}

export interface RangeValidationOptions {
    minimum?: number
    maximum?: number
    exclusiveMinimum?: boolean
    exclusiveMaximum?: boolean
}

export interface MaximumValidation {
    kind: 'maximum-validation'
    value: number
    inclusive: boolean
    message?: string
}

export function maximum(value: number, inclusive: boolean, message?: string): MaximumValidation {
    return { kind: 'maximum-validation', value, inclusive, message }
}

export interface MinimumValidation {
    kind: 'minimum-validation'
    value: number
    inclusive: boolean
    message?: string
}

export function minimum(value: number, inclusive: boolean, message?: string): MinimumValidation {
    return { kind: 'minimum-validation', value, inclusive, message }
}

type AllValidations =
    PatternValidation | FormatValidation | MinLengthValidation | MaxLengthValidation | MaximumValidation | MinimumValidation

export function normalizeValidations<T extends AllValidations>(validations?: Array<T>): Array<T> | undefined {

    if (validations == null) return

    let minLength: MinLengthValidation | undefined

    let maxLength: MaxLengthValidation | undefined

    let maximum: MaximumValidation | undefined

    let minimum: MinimumValidation | undefined

    const rets: Array<T> = []

    for (const validation of validations) {
        if (validation.kind === 'min-length-validation') {
            if (minLength && minLength.value > validation.value) continue
            minLength = validation
        }

        else if (validation.kind === 'max-length-validation') {
            if (maxLength && maxLength.value < validation.value) continue
            maxLength = validation
        }

        else if (validation.kind === 'minimum-validation') {
            if (minimum == null) minimum = validation

            else if (minimum.value < validation.value) minimum = validation

            else if (minimum.value === validation.value && validation.inclusive) {
                minimum = validation
            }
        }

        else if (validation.kind === 'maximum-validation') {
            if (maximum == null) maximum = validation

            else if (maximum.value > validation.value) maximum = validation

            else if (maximum.value === validation.value && validation.inclusive === false) {
                maximum = validation
            }
        }

        else rets.push(validation)
    }

    return [minLength, maxLength, minimum, maximum, ...rets].filter(o => o != null) as Array<T>
}