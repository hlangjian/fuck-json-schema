import { createGeneratorContext, type GeneratorContextOptions } from "./generic-generator";
import { format } from "prettier"

export async function generateTypescriptFetchClient(options: GeneratorContextOptions) {

    const context = createGeneratorContext(options)

    const files = new Map<string, string>()

    await context.travel(async model => {

    })

    const formattedFiles = new Map<string, string>()

    for (const [path, code] of files) {
        formattedFiles.set(path, await formatTypescript(code))
    }

    return formattedFiles
}

async function formatTypescript(code: string): Promise<string> {
    return format(code, {
        parser: 'typescript',
        tabWidth: 4,
        printWidth: 100,
    }).catch(_ => code)
}