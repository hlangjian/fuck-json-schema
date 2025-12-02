import { buildApplication, buildCommand, type CommandContext } from '@stricli/core'
import { isCancel, log, multiselect, text, confirm } from '@clack/prompts'
import { cp, writeFile } from 'fs/promises'
import { fileURLToPath } from 'url'
import { dirname, isAbsolute, join, resolve } from 'path'
import packageJson from 'public/template/basic/package.json'

const wellKnownPlugins: Record<string, { label: string, version: string, hint?: string }> = {
    '@huanglangjian/openapi-generator': {
        label: 'openapi', version: '^0.0.1', hint: ''
    },
    '@huanglangjian/json-schema-generator': {
        label: 'json-schema', version: '^0.0.1', hint: ''
    },
    '@huanglangjian/java-generator': {
        label: 'java', version: '^0.0.1', hint: ''
    },
    '@huanglangjian/java-springboot-generator': {
        label: 'springboot', version: '^0.0.1', hint: ''
    }
}

export const root = buildCommand({
    func: runner,
    parameters: {
        positional: {
            kind: 'tuple',
            parameters: [
                {
                    parse: String,
                    brief: 'project name',
                    optional: true,
                    placeholder: 'project-name'
                }
            ]
        },
        flags: {
            outputDir: {
                optional: true,
                kind: 'parsed',
                parse: String,
                brief: 'Output directory'
            },
            generators: {
                optional: true,
                kind: 'parsed',
                parse: String,
                variadic: Object.values(wellKnownPlugins).map(o => o.label).join(','),
                brief: 'Code generators'
            }
        },
        aliases: {
            o: 'outputDir'
        }
    },
    docs: {
        brief: 'Create an API specification project with generators.'
    }
})

interface Flags {
    outputDir?: string
    generators?: string[]
}

async function runner(this: CommandContext, flags: Flags, projectName?: string) {

    const { outputDir, generators } = flags

    const realProjectName = projectName ?? await text({
        message: 'Please input project name',
        placeholder: 'example',
        defaultValue: 'example',
    })

    if (isCancel(realProjectName)) return process.exit()

    const defaultOutputDir = './' + realProjectName

    const realOutputDir = outputDir ?? await text({
        message: 'Please input output directory',
        placeholder: defaultOutputDir,
        defaultValue: defaultOutputDir,
    })

    if (isCancel(realOutputDir)) return process.exit()

    if (realOutputDir.trim().length === 0) {
        log.error('output directory cannot be empty')
        return process.exit()
    }

    const templatePath = getTemplatePath()

    const realOutputDirAbs = getOutputPath(realOutputDir)

    const realGenerators = generators ?? await multiselect({
        message: 'Do you want to choose generators?',
        options: Object.entries(wellKnownPlugins).map(([value, { label, hint }]) => ({
            label, value, hint
        }))
    })

    if (isCancel(realGenerators)) return process.exit()

    const dependencies = new Map<string, string>(Object.entries(packageJson.dependencies))

    for (const generator of realGenerators) {
        const detail = wellKnownPlugins[generator]
        if (detail) dependencies.set(generator, detail.version)
    }

    const shouldContinue = await confirm({
        message: 'Do you want to continue?',
    })

    if (isCancel(shouldContinue) || !shouldContinue) return process.exit()

    await cp(templatePath, realOutputDirAbs, { recursive: true })

    const outputPackageJsonPath = getOutputPackageJsonPath(realOutputDirAbs)

    const realPackageJson = { ...packageJson, dependencies: Object.fromEntries(dependencies) }

    await writeFile(outputPackageJsonPath, JSON.stringify(realPackageJson, null, 4))
}

export const app = buildApplication(root, {
    name: 'create specs'
})

export function getTemplatePath() {
    const __dirname = dirname(fileURLToPath(import.meta.url))
    return join(__dirname, 'template')
}

export function getOutputPackageJsonPath(outputDir: string) {
    return join(outputDir, 'package.json')
}

export function getOutputPath(path: string) {

    if (isAbsolute(path)) return path

    return resolve(process.cwd(), path)
}