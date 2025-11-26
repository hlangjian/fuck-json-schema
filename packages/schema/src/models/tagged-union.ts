import type { ConstantModel } from "./constant"
import { type RecordModel } from "./record"
import type { InferModel } from "./types"

export type VariantModel = RecordModel | TaggedUnionModel

export interface TaggedUnionModelOptions<T extends { [key: string]: VariantModel }> {

    id: string

    variants: T

    title?: string

    description?: string

    deprecated?: boolean

    exmaples?: InferVariants<T>[]
}

export interface TaggedUnionModel<T extends { [key: string]: VariantModel } = { [key: string]: VariantModel }> extends TaggedUnionModelOptions<T> {
    kind: 'tagged-union'

    discriminator: string
}

export type InferVariants<T extends { [key: string]: VariantModel }> = InferModel<T[keyof T]>

export function taggedUnion<T extends { [key: string]: VariantModel }>(options: TaggedUnionModelOptions<T>): TaggedUnionModel<T> {
    const discriminator = findDiscriminator(options.variants)
    return { kind: 'tagged-union', discriminator, ...options }
}

function findDiscriminator(variants: { [key: string]: VariantModel }): string {

    const records = flatten(Object.values(variants))

    if (records.length === 0) throw Error('there has no record')

    const set = new Set(Object.entries(records[0].properties)
        .filter(([_, value]) => value.kind === 'constant')
        .map(([key]) => key))

    for (const record of records) {
        for (const key of set) {
            if (key in record.properties
                && record.properties[key].kind === 'constant'
                && ['string', 'number', 'boolean'].includes(record.properties[key].base.kind)
            ) continue
            set.delete(key)
        }
    }

    if (set.size === 0) throw Error('must provide discriminator key')

    for (const key of set) {

        const values = new Set()

        for (const record of records) {
            const constant = record.properties[key] as ConstantModel
            if (values.has(constant.value)) break
            else values.add(constant.value)
        }

        if (values.size === records.length) return key
    }

    throw Error('Discriminator key cannot duplicate')
}

function flatten(variants: VariantModel[]): RecordModel[] {
    const ret: RecordModel[] = []

    for (const variant of variants) {
        if (variant.kind === 'record') ret.push(variant)
        else ret.push(...flatten([variant]))
    }

    return ret
}