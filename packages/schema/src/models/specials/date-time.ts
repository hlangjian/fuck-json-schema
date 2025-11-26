
export interface DateModel {
    kind: 'date'
    schema?: DatetimeSchema
}

export function date(options?: DatetimeSchema): DateModel {
    return { kind: 'date', schema: options }
}

export interface DatetimeModel {
    kind: 'datetime'
    schema?: DatetimeSchema
}

export function datetime(options?: DatetimeSchema): DatetimeModel {
    return { kind: 'datetime', schema: options }
}

export interface TimeModel {
    kind: 'time'
    schema?: DatetimeSchema
}

export function time(options?: DatetimeSchema): TimeModel {
    return { kind: 'time', schema: options }
}

export interface DatetimeSchema {
    title?: string
    description?: string
    examples?: Date[]
    deprecated?: boolean
    default?: Date
}