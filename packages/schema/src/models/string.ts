import { normalizeValidations, type FormatValidation, type MaxLengthValidation, type MinLengthValidation, type PatternValidation } from "./validations"

export interface StringModelOptions {

    title?: string

    description?: string

    deprecated?: boolean

    exmaples?: string[]

    validations?: Array<PatternValidation | MaxLengthValidation | MinLengthValidation | FormatValidation>
}

export interface StringModel extends StringModelOptions {
    kind: 'string'
}

export function string(options?: StringModelOptions): StringModel {
    const { validations, ...rest } = options ?? {}
    return { kind: 'string', validations: normalizeValidations(validations), ...rest }
}