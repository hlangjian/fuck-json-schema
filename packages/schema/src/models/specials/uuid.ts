
export interface UUIDModel {
    kind: 'uuid'
    schema?: UUIDModelSchema
}

export interface UUIDModelOptions extends UUIDModelSchema {

}

export function uuid(options?: UUIDModelOptions): UUIDModel {
    return { kind: 'uuid', schema: options }
}

export interface UUIDModelSchema {
    title?: string
    description?: string
    deprecated?: boolean
    default?: string
}