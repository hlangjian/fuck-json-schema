import { normalizeValidations, type MaximumValidation, type MinimumValidation } from "./validations";

export interface NumberModelOptions {

    type?: 'short' | 'int' | 'long' | 'float' | 'double' | 'decimal'

    title?: string

    description?: string

    deprecated?: boolean

    exmaples?: string[]

    validations?: Array<MinimumValidation | MaximumValidation>
}

export interface NumberModel extends NumberModelOptions {
    kind: 'number'

    type: 'short' | 'int' | 'long' | 'float' | 'double' | 'decimal'
}

export function number(options?: NumberModelOptions): NumberModel {

    const { type = 'int', validations, ...rest } = options ?? {}

    return { kind: 'number', type, validations: normalizeValidations(validations), ...rest }
}