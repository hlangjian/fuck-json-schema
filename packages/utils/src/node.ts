import { mkdir, writeFile } from "fs/promises"
import { dirname, normalize } from "path"

export async function outputFile(path: string, text: string) {
    const normalizePath = normalize(path)
    await mkdir(dirname(normalizePath), { recursive: true })
    await writeFile(normalizePath, text)
}