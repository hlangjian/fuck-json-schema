import { string, type BasicModel } from "./model";

export type ExtractPathParams<Path extends string>
    = Path extends `${infer _Start}/{${infer Param}}/${infer Rest}`
    ? Param | ExtractPathParams<`/${Rest}`>
    : Path extends `${infer _Start}/{${infer Param}}`
    ? Param : never

export function normalizePath(path: string): string {
    return '/' + path.split('/').filter(o => o.length > 0).join('/')
}

export function deepMergeAll<T extends object>(objs: T[]): T {
    const merge = (a: any, b: any, path: string[] = []): any => {
        for (const k in b) {
            const np = [...path, k];
            const av = a[k], bv = b[k];
            if (k in a) {
                if (Array.isArray(av) && Array.isArray(bv)) {
                    a[k] = [...new Set([...av, ...bv])];
                } else if (
                    av && bv &&
                    typeof av === "object" && typeof bv === "object" &&
                    Object.getPrototypeOf(av) === Object.prototype &&
                    Object.getPrototypeOf(bv) === Object.prototype
                ) {
                    merge(av, bv, np);
                } else {
                    throw new Error(`字段冲突: ${np.join(".")}`);
                }
            } else {
                a[k] = bv;
            }
        }
        return a;
    };
    return objs.reduce((acc, o) => merge(acc, o, []), {} as T);
}

export function extractPathParams(path: string): string[] {
    const regex = /\{([^}]+)\}/g
    const params: string[] = []
    let match: RegExpExecArray | null

    while ((match = regex.exec(path)) !== null) {
        params.push(match[1])
    }

    return [...new Set(params)]
}

export function arraylify<T>(value?: T | T[]): T[] {
    return value ? Array.isArray(value) ? value : [value] : []
}

export function completePathParameters<T extends string>(path: T, parameters: { [key: string]: BasicModel | undefined }): { [key in ExtractPathParams<T>]: BasicModel } {

    const map = new Map<string, BasicModel>()

    for (const name of extractPathParams(path)) {
        if (name in parameters && parameters[name] != null) map.set(name, parameters[name])
        else map.set(name, string())
    }

    return Object.fromEntries(map) as { [key in ExtractPathParams<T>]: BasicModel }
}