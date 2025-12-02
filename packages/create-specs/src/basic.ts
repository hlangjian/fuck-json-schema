import { buildCommand, type CommandContext } from "@stricli/core"
import { cp } from "fs/promises"
import { confirm, text } from "./prompts"
import { resolvePathFromPackage } from "./utils/resolve-path-from-package"
import { executeCommand } from "./utils/execute-command"
import packageJson from './package-template.json'
import { resolve } from "path"
import { outputFile } from 'utils'
import { getInstallCommand } from "./utils/install"

export interface Flags {
    output?: string
    useGit?: boolean
}

export async function handle(this: CommandContext, flags: Flags, name?: string) {

    const projectName = name ?? await text({
        message: 'project name',
        defaultValue: 'example',
    })

    const outputPath = flags.output ?? await text({
        message: 'output directory',
        defaultValue: './' + projectName,
    })

    await outputFile(
        resolve(outputPath, 'package.json'),
        JSON.stringify({
            name: projectName,
            ...packageJson
        }, null, 4)
    )

    const templatePath = resolvePathFromPackage('./template')

    await cp(templatePath, outputPath, { recursive: true })

    const installDependencies = getInstallCommand({
        packages: [
            '@huanglangjian/schema@latest',
            '@huanglangjian/json-schema-generator@latest',
            '@huanglangjian/openapi-generator@latest',
            '@scalar/api-reference@latest',
        ]
    })

    await executeCommand({ cwd: outputPath, ...installDependencies, shell: true })

    const installDevDependencies = getInstallCommand({
        dev: true,
        packages: [
            '@types/node@latest',
            'typescript@latest',
            'vite-tsconfig-pths@latest',
            'vite@latest',
        ]
    })

    await executeCommand({ cwd: outputPath, ...installDevDependencies, shell: true })

    const shouldInstall = await confirm({
        message: 'Install dependencies?',
        defaultValue: true,
    })

    if (shouldInstall) {
        const command = getInstallCommand()
        await executeCommand({ cwd: outputPath, ...command, shell: true })
    }

    const useGit = flags.useGit ?? await confirm({
        message: 'Use git?',
        defaultValue: true,
    })

    if (useGit) {
        await executeCommand({ cwd: outputPath, command: 'git', args: ['--init'], shell: true })
    }
}

export const rootCommand = buildCommand({
    func: handle,
    parameters: {
        positional: {
            kind: 'tuple',
            parameters: [
                {
                    parse: String,
                    brief: 'Project name',
                    optional: true,
                    placeholder: 'project name'
                }
            ]
        },
        flags: {
            output: {
                kind: 'parsed',
                optional: true,
                placeholder: 'output-directory',
                parse: String,
                brief: 'output directory'
            },
            useGit: {
                kind: 'boolean',
                optional: true,
                placeholder: 'use git?',
                brief: 'use git'
            }
        },
        aliases: {
            o: 'output',
            g: 'useGit',
        }
    },
    docs: {
        brief: 'Create an API specification project'
    }
})