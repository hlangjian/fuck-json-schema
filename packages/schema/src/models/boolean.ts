export interface BooleanModelOptions {
    title?: string

    description?: string

    deprecated?: boolean
}

export interface BooleanModel extends BooleanModelOptions {
    kind: 'boolean'
}

export function boolean(options?: BooleanModelOptions): BooleanModel {
    return { kind: 'boolean', ...options }
}

