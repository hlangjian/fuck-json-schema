import { pascalCase } from "text-case"

import type { RouterModel } from "../api"
import type {
  AnyNamedDescriptor,
  CollectOptions,
  EnumsDescriptor,
  FieldDescriptor,
  OperationDescriptor,
  RecordDescriptor,
  SchemaMap,
  TaggedUnionDescriptor,
  UnionDescriptor,
} from "./descriptors"
import type { Models, RecordModel as RecordModelType } from "../types"

export function collectNamedModels(
  models: Models[],
  options?: CollectOptions,
): AnyNamedDescriptor[] {
  const identifier = options?.identifier ?? pascalCase

  const namespace = options?.namespace

  return models.reduce<AnyNamedDescriptor[]>((acc, model) => {
    if (model.kind === "record") {
      return [...acc, toRecordDescriptor(model, identifier, namespace)]
    }

    if (model.kind === "enums") {
      return [...acc, toEnumsDescriptor(model, identifier, namespace)]
    }

    if (model.kind === "union") {
      return [...acc, {
        kind: "union",
        originalId: model.id,
        identifier: identifier(model.id),
        namespace,
        title: model.title,
        description: model.description,
        deprecated: (model as any).deprecated,
        examples: model.examples,
        variants: model.variants as Record<string, Models>,
      } as UnionDescriptor]
    }

    if (model.kind === "taggedUnion") {
      return [...acc, {
        kind: "taggedUnion",
        originalId: model.id,
        identifier: identifier(model.id),
        namespace,
        title: model.title,
        description: model.description,
        deprecated: (model as any).deprecated,
        examples: model.examples,
        variants: model.variants as Record<string, Models>,
        discriminator: model.discriminator as string,
      } as TaggedUnionDescriptor]
    }

    return acc
  }, [] as AnyNamedDescriptor[])
}

function toRecordDescriptor(
  model: RecordModelType<Record<string, Models>, string>,
  identifier: (id: string) => string,
  namespace: string | undefined,
): RecordDescriptor {
  return {
    kind: "record",
    originalId: model.id,
    identifier: identifier(model.id),
    namespace,
    title: model.title,
    description: model.description,
    deprecated: "deprecated" in model ? (model as any).deprecated : undefined,
    examples: model.examples,
    fields: Object.entries(model.properties).map<FieldDescriptor>(([name, propModel]) => ({
      name,
      model: propModel as Models,
      required: model.required.includes(name as any),
      title: (propModel as any).title,
      description: (propModel as any).description,
      deprecated: (propModel as any).deprecated,
    })),
  }
}

function toEnumsDescriptor(
  model: { kind: "enums"; id: string; variants: Record<string, string>; title?: string; description?: string },
  identifier: (id: string) => string,
  namespace: string | undefined,
): EnumsDescriptor {
  return {
    kind: "enums",
    originalId: model.id,
    identifier: identifier(model.id),
    namespace,
    title: model.title,
    description: model.description,
    values: model.variants,
  }
}

function joinPath(basePath: string, routePath: string): string {
  if (!basePath) return routePath

  const base = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath

  const route = routePath.startsWith("/") ? routePath : `/${routePath}`

  return `${base}${route}`
}

export function collectOperations(routers: RouterModel[]): OperationDescriptor[] {
  return routers.flatMap((router) => {
    const basePath = router.basePath ?? ""

    return Object.entries(router.routes).map(([id, route]) => {
      const queries: Record<string, { model: Models; name: string; required: boolean }> = {}

      if (route.queries) {
        for (const [name, propModel] of Object.entries(route.queries.properties)) {
          queries[name] = {
            model: propModel as Models,
            name,
            required: route.queries.required.includes(name as any),
          }
        }
      }

      const headers: Record<string, { model: Models; name: string; required: boolean }> = {}

      if (route.headers) {
        for (const [name, propModel] of Object.entries(route.headers.properties)) {
          headers[name] = {
            model: propModel as Models,
            name,
            required: route.headers.required.includes(name as any),
          }
        }
      }

      const pathVariables: Record<string, { model: Models; name: string }> = {}

      if (route.variables) {
        for (const [name, model] of Object.entries(route.variables)) {
          pathVariables[name] = { model: model as Models, name }
        }
      }

      const responses: Record<number, Models | null> = {}

      const responseKinds: Record<number, string> = {}

      for (const [status, resp] of Object.entries(route.responses)) {
        responses[Number(status)] =
          "body" in resp && resp.body != null ? (resp.body as Models) : null

        responseKinds[Number(status)] = resp.kind
      }

      return {
        id,
        group: router.id,
        groupDescription: router.description,
        method: route.method,
        path: joinPath(basePath, route.path),
        summary: route.summary,
        description: route.description,
        tags: route.tags,
        deprecated: route.deprecated,
        requestModel: route.body ?? null,
        responses,
        responseKinds,
        pathVariables,
        queries,
        headers,
      }
    })
  })
}

export function collectSchemaMap(ops: OperationDescriptor[]): SchemaMap {
  const all = collectAll(ops)

  const map: SchemaMap = new Map()

  for (const m of all) {
    if (typeof m === "object" && m !== null && "id" in m && !map.has(m.id)) map.set(m.id, m)
  }

  return map
}

function collectAll(ops: OperationDescriptor[]): Models[] {
  const seen = new Set<Models>()

  const out: Models[] = []

  const add = (m: Models | null) => {
    if (m == null || seen.has(m)) return

    seen.add(m)

    out.push(m)

    if (m.kind === "array" || m.kind === "set" || m.kind === "map") add(m.base)

    if (m.kind === "record") Object.values(m.properties).forEach((v) => add(v as Models))

    if (m.kind === "union" || m.kind === "taggedUnion") Object.values(m.variants).forEach((v) => add(v as Models))
  }

  for (const op of ops) {
    add(op.requestModel)

    for (const v of Object.values(op.responses)) add(v)

    for (const v of Object.values(op.pathVariables)) add(v.model)

    for (const v of Object.values(op.queries)) add(v.model)

    for (const v of Object.values(op.headers)) add(v.model)
  }

  return out
}

export function resolveNamedRoot(m: Models): { id: string } | null {
  switch (m.kind) {
    case "record":

    case "enums":

    case "union":

    case "taggedUnion":
      return m as unknown as { id: string }

    case "array":

    case "set":

    case "map":
      return resolveNamedRoot(m.base)

    default:
      return null
  }
}

function collectDependencies(model: Models, schemaMap: SchemaMap): string[] {
  const deps: string[] = []

  const seen = new Set<Models>()

  const walk = (m: Models) => {
    if (seen.has(m)) return

    seen.add(m)

    if (typeof m === "object" && m !== null && "id" in m && schemaMap.has(m.id)) {
      deps.push(m.id)

      return
    }

    if (m.kind === "array" || m.kind === "set" || m.kind === "map") {
      walk(m.base)
    } else if (m.kind === "record") {
      Object.values(m.properties).forEach((v) => walk(v))
    } else if (m.kind === "union" || m.kind === "taggedUnion") {
      Object.values(m.variants).forEach((v) => walk(v))
    }
  }

  walk(model)

  return deps
}

export function topologicalSortSchemaMap(schemaMap: SchemaMap): [string, Models][] {
  const entries: [string, Models][] = []

  const graph = new Map<string, string[]>()

  const inDegree = new Map<string, number>()

  for (const [id] of schemaMap) {
    graph.set(id, [])

    inDegree.set(id, 0)
  }

  for (const [id, m] of schemaMap) {
    const deps: string[] = []

    if (m.kind === "record") {
      for (const p of Object.values(m.properties)) {
        deps.push(...collectDependencies(p, schemaMap))
      }
    } else if (m.kind === "union" || m.kind === "taggedUnion") {
      for (const variant of Object.values(m.variants)) {
        deps.push(...collectDependencies(variant, schemaMap))
      }
    }

    for (const dep of deps) {
      if (dep !== id && graph.has(dep)) {
        graph.get(dep)!.push(id)

        inDegree.set(id, (inDegree.get(id) ?? 0) + 1)
      }
    }
  }

  const queue: string[] = []

  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id)
  }

  while (queue.length > 0) {
    const id = queue.shift()!

    entries.push([id, schemaMap.get(id)!])

    for (const succ of graph.get(id) ?? []) {
      const newDeg = (inDegree.get(succ) ?? 1) - 1

      inDegree.set(succ, newDeg)

      if (newDeg === 0) queue.push(succ)
    }
  }

  for (const [id, m] of schemaMap) {
    if (!entries.some(([eId]) => eId === id)) {
      entries.push([id, m])
    }
  }

  return entries
}
