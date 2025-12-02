import { isAbsolute, resolve } from "path";

export function resolvePathFromCwd(path: string) {
    if (isAbsolute(path)) return path
    return resolve(process.cwd(), path)
}