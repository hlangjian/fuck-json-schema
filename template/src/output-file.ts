import { mkdir, writeFile } from "fs/promises"
import { dirname } from "path"

export async function outputFile(path: string, text: string) {
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, text)
}

export function outputFileSync(path: string, text: string) {
    mkdir(dirname(path), { recursive: true })
        .then(() => writeFile(path, text))
}