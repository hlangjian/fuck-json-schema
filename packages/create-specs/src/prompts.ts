import { log as clackLog, text as clackText, confirm as clackConfirm, select as clackSelect, isCancel, multiselect as clackMulti } from '@clack/prompts'

export interface TextPromptOptions {
    message: string
    defaultValue?: string
}

export async function text(options: TextPromptOptions) {
    const { message, defaultValue } = options

    const ret = await clackText({
        message,
        defaultValue,
        placeholder: defaultValue,
    })

    if (isCancel(ret)) return process.exit()

    return ret
}

export interface SelectPromptOptions<TOptions extends { [key: string]: string }> {
    message: string
    options: TOptions
    defaultValue?: keyof TOptions
}

export async function select<TOptions extends { [key: string]: string }>(options: SelectPromptOptions<TOptions>) {

    const { message, options: selectOptions, defaultValue } = options

    const ret = await clackSelect({
        message,
        options: Object.entries(selectOptions).map(([label, hint]) => ({
            label, value: label, hint,
        })),
        initialValue: defaultValue as string
    })

    if (isCancel(ret)) return process.exit()

    return ret as keyof TOptions
}

export interface MultiSelectPromptOptions<TOptions extends { [key: string]: string }> {
    message: string
    options: TOptions
    defaultValue?: Array<keyof TOptions>
}

export async function multiSelect<TOptions extends { [key: string]: string }>(options: MultiSelectPromptOptions<TOptions>) {

    const { message, options: selectOptions, defaultValue } = options

    const ret = await clackMulti({
        message,
        required: false,
        options: Object.entries(selectOptions).map(([label, hint]) => ({
            label, value: label, hint
        })),
        initialValues: defaultValue as string[]
    })

    if (isCancel(ret)) return process.exit()

    return ret as Array<keyof TOptions>
}

export interface ConfirmOptions {
    message: string
    defaultValue?: boolean
}

export async function confirm(options: ConfirmOptions) {
    const { message, defaultValue } = options

    const ret = await clackConfirm({
        message,
        initialValue: defaultValue,
    })

    if (isCancel(ret)) return process.exit()

    return ret
}

export const log = clackLog