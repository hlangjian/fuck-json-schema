import watcher from '@parcel/watcher'
import micromatch from 'micromatch'
import { outputFile } from '../../utils/dist'
import path, { normalize, posix, join, relative, resolve, dirname, sep } from 'pathe'
import { glob } from 'tinyglobby'
import { log } from '@clack/prompts'
import type { Plugin as VitePlugin } from 'vite'

export interface FileBaseSchemaWatcherOptions {
    specsRoot?: string
    excludes?: string[]
    cwd?: string
    generateFile?: string
    keepExtension?: boolean
}

export async function createFileBaseSchemaWatcher(options?: FileBaseSchemaWatcherOptions) {

    const {
        specsRoot = 'src/specs',
        excludes = [],
        cwd = process.cwd().replaceAll(path.sep, posix.sep),
        generateFile = 'src/models.gen.ts',
        keepExtension = false,
    } = options ?? {}

    const includes = join(specsRoot, '/**/*.ts')

    const ignore = [generateFile, ...excludes].map(normalize)

    let relativePaths = await initRelativePaths(cwd, includes, ignore)

    log.info(`watching specs root ${resolve(cwd, specsRoot)}`)

    await generate({ relativePaths, cwd, generateFile, keepExtension, specsRoot })

    const subscription = await watcher.subscribe(cwd, async (err, events) => {

        if (err) throw err

        const temp = new Set(relativePaths)

        for (const event of events) {

            const relativePath = relative(cwd, event.path)

            if (!micromatch.isMatch(relativePath, includes, { ignore: ignore })) continue

            log.info(`detect file change at ${event.path}`)

            if (event.type === 'create' || event.type === 'update') temp.add(relativePath)

            if (event.type === 'delete') temp.delete(relativePath)
        }

        if (temp.size !== relativePaths.size || temp.values().some(o => !relativePaths.has(o))) {

            relativePaths = temp

            await generate({ relativePaths, cwd, generateFile, keepExtension, specsRoot })
        }
    })

    return subscription
}

async function generate(options: { relativePaths: Set<string>, cwd: string, generateFile: string, keepExtension: boolean, specsRoot: string }) {

    const { relativePaths, cwd, generateFile, keepExtension, specsRoot } = options

    const genFile = resolve(cwd, generateFile)

    const moduleLines: string[] = []

    for (const path of relativePaths) {
        const importPath = normalizeImportPath(keepExtension
            ? relative(dirname(generateFile), path)
            : removeExtension(relative(dirname(generateFile), path))
        )

        const moduleId = removeExtension(relative(specsRoot, path)).replaceAll(sep, '.')

        moduleLines.push(`"${moduleId}": await import('${importPath}')`)
    }

    await outputFile(genFile, `
import { isModel, isRoutesModel } from '@huanglangjian/schema'
import type { Model, RoutesModel } from '@huanglangjian/schema'

const modules: Record<string, object> = {
${moduleLines.map(o => `    ${o},\n`)}}

const models = new Map<string, Model | RoutesModel>()

for(const [moduleId, module] of Object.entries(modules)) for(const [name, obj] of Object.entries(module)) {
    if(isModel(obj) || isRoutesModel(obj)){
        const id = [moduleId, name].join('.')
        models.set(id, obj)
    }
}

export { models }`)
}

function removeExtension(path: string) {
    const index = path.lastIndexOf('.')
    return index === -1 ? path : path.substring(0, index)
}

async function initRelativePaths(cwd: string, includes: string, ignore: string[]) {

    const relativePaths = new Set<string>()

    for (const path of await glob(includes, { cwd, ignore })) {
        const relativePath = relative(cwd, path)
        relativePaths.add(relativePath)
    }

    return relativePaths
}

function normalizeImportPath(path: string) {
    return path.startsWith('.') ? path : './' + path
}

export function SpecsVite(options?: FileBaseSchemaWatcherOptions): VitePlugin {

    return {
        name: '@huanglangjian/specs',
        async configureServer(server) {

            const subscription = await createFileBaseSchemaWatcher(options)

            log.info('File base specs watcher started')

            const cleanup = async () => {
                await subscription.unsubscribe()
                log.info('File base specs watcher closed')
            }

            server.httpServer?.on('close', cleanup)
        }
    }
}