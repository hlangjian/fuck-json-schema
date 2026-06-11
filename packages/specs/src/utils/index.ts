import type { UnionToTuple } from "type-fest"

export type ExtractPathParams<Path extends string> = string extends Path
  ? string
  : Path extends `${infer _Start}/{${infer Param}}/${infer Rest}`
    ? Param | ExtractPathParams<`/${Rest}`>
    : Path extends `${infer _Start}/{${infer Param}}`
      ? Param
      : never

export function normalizePath(path: string): string {
  return ("/" + path).replace(/\/+/g, "/")
}

export function deepMergeAll<T extends object>(objs: T[]): T {
  const merge = (a: any, b: any, path: string[] = []): any => {
    for (const k in b) {
      const np = [...path, k]
      const av = a[k],
        bv = b[k]
      if (k in a) {
        if (Array.isArray(av) && Array.isArray(bv)) {
          a[k] = [...new Set([...av, ...bv])]
        } else if (
          av &&
          bv &&
          typeof av === "object" &&
          typeof bv === "object" &&
          Object.getPrototypeOf(av) === Object.prototype &&
          Object.getPrototypeOf(bv) === Object.prototype
        ) {
          merge(av, bv, np)
        } else {
          throw new Error(
            `字段冲突: ${JSON.stringify({
              property: np.join("."),
              av,
              bv,
            })}`,
          )
        }
      } else {
        a[k] = bv
      }
    }
    return a
  }
  return objs.reduce((acc, o) => merge(acc, o, []), {} as T)
}

export function extractPathParams<T extends string>(path: T): UnionToTuple<ExtractPathParams<T>> {
  const regex = /\{([^}]+)\}/g
  const params: string[] = []
  let match: RegExpExecArray | null

  while ((match = regex.exec(path)) !== null) {
    params.push(match[1])
  }

  return [...new Set(params)] as unknown as UnionToTuple<ExtractPathParams<T>>
}

export function arraylify<T>(value?: T | T[]): T[] {
  return value ? (Array.isArray(value) ? value : [value]) : []
}

export function upperFirst(text: string): string {
  if (text.length === 0) return text

  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function trimMargin(strings: TemplateStringsArray, ...values: any[]) {
  const full = strings.map((s, i) => s + (i < values.length ? values[i] : "")).join("")

  return full
    .split("\n")
    .map((o) => o.trimStart())
    .join("\n")
}

export function lowercase<T extends string>(text: T): Lowercase<T> {
  return text.toLowerCase() as Lowercase<T>
}
