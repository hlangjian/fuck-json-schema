import { confirm, isCancel, log, select, text } from "@clack/prompts"
import { buildCommand, type CommandContext } from "@stricli/core"
import { cp } from "fs/promises"
import { dirname, isAbsolute, join, resolve } from "path"
import { fileURLToPath } from "url"

export const TemplateNames = ['basic'] as const

export type Templates = typeof TemplateNames[number]

export interface Flags {
    name?: string
    output?: string
    template?: Templates
}

export async function handle(this: CommandContext, flags: Flags) {

    const projectName = await getProjectName(flags.name, 'example')

    const template = await getTemplate(flags.template)

    const outputPath = await getOutputPath(flags.output, './' + projectName)

    const templatePath = getTemplatePath(template)

    confirmContinue()

    await cp(templatePath, outputPath)
}

export const rootCommand = buildCommand({
    func: handle,
    parameters: {
        flags: {
            name: {
                kind: 'parsed',
                optional: true,
                placeholder: 'project-name',
                parse: String,
                brief: 'project name'
            },
            output: {
                kind: 'parsed',
                optional: true,
                placeholder: 'output-directory',
                parse: String,
                brief: 'output directory'
            },
            template: {
                kind: 'enum',
                optional: true,
                placeholder: 'template name',
                values: TemplateNames,
                brief: 'template name'
            }
        }
    },
    docs: {
        brief: 'Create an API specification project with generators.'
    }
})

async function getProjectName(name?: string, defaultValue?: string) {
    if (name) return name

    const ret = await text({
        message: 'Please input output directory',
        placeholder: defaultValue,
        defaultValue: defaultValue,
    })

    if (isCancel(ret)) return process.exit()

    return ret
}

async function getTemplate(name?: Templates): Promise<Templates> {
    if (name) return name

    const ret = await select({
        message: 'Please select template',
        options: [
            { value: 'basic', label: 'basic', hint: 'Basic template with scalar' },
        ],
        initialValue: 'basic'
    })

    if (isCancel(ret)) return process.exit()

    if (TemplateNames.some(o => o === ret)) return ret as Templates

    log.error(`cannot recognize template ${ret}`)

    return process.exit()
}

async function getOutputPath(path?: string, defaultValue?: string) {

    if (path) return path

    const ret = await text({
        message: 'Please input output directory',
        placeholder: defaultValue,
        defaultValue: defaultValue,
    })

    if (isCancel(ret)) return process.exit()

    if (isAbsolute(ret)) return ret

    return resolve(process.cwd(), ret)
}

async function confirmContinue() {
    const ret = await confirm({
        message: 'Continue?'
    })

    if (isCancel(ret) || !ret) return process.exit()
}

export function getTemplatePath(template: Templates) {
    const __dirname = dirname(fileURLToPath(import.meta.url))
    return join(__dirname, 'templates', template)
}