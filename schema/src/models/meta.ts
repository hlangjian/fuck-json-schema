export interface Model<T> {
    readonly type: string
    readonly title?: string
    readonly description?: string
    readonly examples?: T[]
    readonly default?: T
    readonly deprecated?: boolean
}