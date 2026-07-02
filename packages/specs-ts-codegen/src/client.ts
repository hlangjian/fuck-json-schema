import type { RouterModel, Models } from "@huanglangjian/specs"
import { collectOperations, collectSchemaMap, resolveNamedRoot } from "@huanglangjian/specs"
import type { OperationDescriptor, SchemaMap } from "@huanglangjian/specs"
import { groupBy } from "@huanglangjian/specs"
import { camelCase, pascalCase } from "text-case"

import { generateModels, toTs, resolveSchemaExpr, collectSchemaRefs, fieldJsdoc, addModelsToSchemaMap } from "./shared"
import { resolveLib, type ValidationLib } from "./validation-lib"

export interface TsClientOptions {
  routers: RouterModel[]
  identifier?: (id: string) => string
  namespace?: string
  models?: Models[]
  validationLib?: "zod" | "valibot"
}

export function generateTsClient(options: TsClientOptions): Record<string, string> {
  const { routers, identifier = pascalCase, namespace, models, validationLib } = options

  const lib = resolveLib(validationLib ?? "zod")

  const operations = collectOperations(routers)

  const schemaMap = collectSchemaMap(operations)

  if (models) {
    addModelsToSchemaMap(models, schemaMap)
  }

  const files: Record<string, string> = {}

  files["models.ts"] = generateModels(schemaMap, identifier, lib, namespace)

  for (const operation of operations) {
    files[`${camelCase(operation.group)}/${camelCase(operation.id)}.ts`] = generateClientFn(
      operation,
      schemaMap,
      identifier,
      lib,
      namespace,
    )
  }

  files["index.ts"] = generateClientIndex(operations)

  return files
}

function opJsdoc(op: { summary?: string; description?: string; deprecated?: boolean }): string | null {
  const tags: string[] = []

  if (op.summary) tags.push(`@summary ${op.summary}`)

  if (op.description) tags.push(`@description ${op.description}`)

  if (op.deprecated) tags.push("@deprecated")

  return tags.length > 0 ? `/**\n * ${tags.join("\n * ")}\n */` : null
}

function generateClientFn(
  operation: OperationDescriptor,
  schemaMap: SchemaMap,
  identifier: (s: string) => string,
  lib: ValidationLib,
  namespace: string | undefined,
): string {
  const lines: string[] = []

  const functionName = camelCase(operation.id)

  const OperationName = pascalCase(operation.id)

  const hasBody = operation.requestModel != null && operation.requestModel.kind !== "null"

  const hasParams = Object.keys(operation.pathVariables).length > 0

  const hasQuery = Object.keys(operation.queries).length > 0

  const hasHeaders = Object.keys(operation.headers).length > 0

  const typeImports: string[] = []

  const addNamedRef = (model: Models) => {
    const root = resolveNamedRoot(model)

    if (root) {
      const typeName = identifier(root.id)

      if (schemaMap.has(root.id) && !typeImports.includes(typeName)) {
        typeImports.push(typeName)
      }
    }
  }

  if (hasBody) addNamedRef(operation.requestModel!)

  for (const r of operation.responses) {
    if (r.model != null) addNamedRef(r.model)
  }

  for (const v of Object.values(operation.pathVariables)) addNamedRef(v.model)

  for (const v of Object.values(operation.queries)) addNamedRef(v.model)

  for (const v of Object.values(operation.headers)) addNamedRef(v.model)

  const responseEntries = operation.responses

  const respInfo: { status: number; model: Models | null; kind: string; isStreamLike: boolean; schemaExpr: string | null }[] = []

  for (const r of responseEntries) {
    const isStreamLike = r.kind === "stream-response" || r.kind === "sse-response" || r.kind === "binary"

    const schemaExpr = r.model && !isStreamLike ? resolveSchemaExpr(r.model, schemaMap, lib) : null

    respInfo.push({ status: r.status, model: r.model, kind: r.kind, isStreamLike, schemaExpr })
  }

  const schemaImports: string[] = []

  for (const ri of respInfo) {
    if (ri.model && !ri.isStreamLike) {
      for (const r of collectSchemaRefs(ri.model, schemaMap)) {
        if (!schemaImports.includes(r)) schemaImports.push(r)
      }
    }
  }

  if (typeImports.length > 0) {
    lines.push(`import type { ${typeImports.join(", ")} } from "../models"`)
  }

  if (schemaImports.length > 0) {
    lines.push(`import { ${schemaImports.join(", ")} } from "../models"`)
  }

  if (typeImports.length > 0 || schemaImports.length > 0) {
    lines.push("")
  }

  const opDoc = opJsdoc(operation)

  if (opDoc) lines.push(opDoc)

  lines.push(`export namespace ${OperationName}Operation {`)

  lines.push("")

  lines.push(`  export interface Request {`)

  if (hasParams) {
    lines.push(`    params: {`)

    for (const [n, v] of Object.entries(operation.pathVariables)) {
      const doc = fieldJsdoc(v.model, "      ")

      if (doc) lines.push(doc)

      lines.push(`      ${n}: ${toTs(v.model, schemaMap, identifier, namespace)};`)
    }

    lines.push(`    };`)
  }

  if (hasQuery) {
    lines.push(`    query: {`)

    for (const [n, q] of Object.entries(operation.queries)) {
      const doc = fieldJsdoc(q.model, "      ")

      if (doc) lines.push(doc)

      const opt = q.required ? "" : "?"

      lines.push(`      ${n}${opt}: ${toTs(q.model, schemaMap, identifier, namespace)};`)
    }

    lines.push(`    };`)
  }

  if (hasHeaders) {
    lines.push(`    headers?: {`)

    for (const [key, header] of Object.entries(operation.headers)) {
      const doc = fieldJsdoc(header.model, "      ")

      if (doc) lines.push(doc)

      lines.push(
        `      "${key}"${header.required ? "" : "?"}: ${toTs(header.model, schemaMap, identifier, namespace)};`,
      )
    }

    lines.push(`    } & Record<string, string>;`)
  } else {
    lines.push(`    headers?: Record<string, string>;`)
  }

  if (hasBody) {
    const bodyDoc = fieldJsdoc(operation.requestModel!, "    ")

    if (bodyDoc) lines.push(bodyDoc)

    lines.push(`    body: ${toTs(operation.requestModel!, schemaMap, identifier, namespace)};`)
  }

  lines.push(`    baseUrl?: string;`)

  lines.push(`  }`)

  lines.push("")

  const responseBodyField = (kind: string, responseModel: Models | null) => {
    if (responseModel == null) {
      if (kind === "binary") return "body: Blob"

      return null
    }

    if (kind === "stream-response" || kind === "sse-response") {
      return `stream: ReadableStream<${toTs(responseModel, schemaMap, identifier, namespace)}>`
    }

    if (kind === "binary") return "body: Blob"

    return `body: ${toTs(responseModel, schemaMap, identifier, namespace)}`
  }

  if (responseEntries.length === 1) {
    const r = responseEntries[0]

    const bodyField = responseBodyField(r.kind, r.model)

    if (bodyField != null) {
      lines.push(`  export type Response = { status: ${r.status}; ${bodyField} }`)
    } else {
      lines.push(`  export type Response = { status: ${r.status} }`)
    }
  } else {
    lines.push(`  export type Response =`)

    for (const r of responseEntries) {
      const bodyField = responseBodyField(r.kind, r.model)

      if (bodyField != null) lines.push(`    | { status: ${r.status}; ${bodyField} }`)
      else lines.push(`    | { status: ${r.status} }`)
    }
  }

  lines.push("")

  lines.push(`}`)

  lines.push("")

  const hasRequired = hasParams || hasBody

  const reqParam = hasRequired ? `req: ${OperationName}Operation.Request` : `req?: ${OperationName}Operation.Request`

  const retType = `${OperationName}Operation.Response`

  const pathExpr = operation.path.replace(/\{(\w+)\}/g, (_, name) => `\${encodeURIComponent(req.params.${name})}`)

  if (opDoc) lines.push(opDoc)

  lines.push(`export async function ${functionName}(${reqParam}): Promise<${retType}> {`)

  lines.push(`  const baseUrl = req?.baseUrl ?? ""`)

  if (hasQuery) {
    lines.push(`  const parts: string[] = []`)

    lines.push(`  const query = ${hasRequired ? "req.query" : "req?.query"}`)

    for (const [n, q] of Object.entries(operation.queries)) {
      if (q.model.kind === "array" || q.model.kind === "set") {
        lines.push(
          `  if (query?.${n} != null) for (const item of query.${n}) parts.push("${n}=" + encodeURIComponent(item))`,
        )
      } else {
        lines.push(`  if (query?.${n} != null) parts.push("${n}=" + encodeURIComponent(query.${n}))`)
      }
    }

    lines.push(`  const qs = parts.length > 0 ? "?" + parts.join("&") : ""`)

    lines.push(`  const url = \`\${baseUrl}${pathExpr}\${qs}\``)
  } else {
    lines.push(`  const url = \`\${baseUrl}${pathExpr}\``)
  }

  lines.push("")

  lines.push(`  const res = await fetch(url, {`)

  lines.push(`    method: "${operation.method}",`)

  if (hasBody) {
    lines.push(`    headers: { "Content-Type": "application/json", ...req.headers },`)

    lines.push(`    body: JSON.stringify(req.body),`)
  } else {
    lines.push(`    headers: req?.headers,`)
  }

  lines.push(`  })`)

  lines.push(`  switch (res.status) {`)

  for (const ri of respInfo) {
    lines.push(`    case ${ri.status}: {`)

    if (ri.isStreamLike) {
      if (ri.kind === "binary") {
        lines.push(`      return { status: ${ri.status} as const, body: await res.blob() }`)
      } else if (ri.model) {
        lines.push(`      return { status: ${ri.status} as const, stream: res.body! }`)
      } else {
        lines.push(`      return { status: ${ri.status} as const }`)
      }
    } else if (ri.model && ri.schemaExpr) {
      lines.push(`      const body = ${lib.parse(ri.schemaExpr, "await res.json()")}`)

      lines.push(`      return { status: ${ri.status} as const, body }`)
    } else if (ri.model) {
      lines.push(`      return { status: ${ri.status} as const, body: await res.json() }`)
    } else {
      lines.push(`      return { status: ${ri.status} as const }`)
    }

    lines.push(`    }`)
  }

  lines.push(`    default: { throw new Error(\`${operation.method} ${operation.path} failed: \${res.status}\`) }`)

  lines.push(`  }`)

  lines.push(`}`)

  const body = lines.join("\n")

  const usesNs = new RegExp(`(^|[^A-Za-z0-9_])${lib.ns}\\.`).test(body)

  if (!usesNs) return body

  const sep = body.startsWith("import ") ? "\n" : "\n\n"

  return lib.importStmt + sep + body
}

function generateClientIndex(operations: OperationDescriptor[]): string {
  const lines: string[] = []

  const groups = groupBy(operations, (operation) => operation.group)

  for (const [group, groupOps] of Object.entries(groups)) {
    const groupDesc = groupOps[0]?.groupDescription

    if (groupDesc) {
      lines.push(`/** @description ${groupDesc} */`)
    }

    lines.push(`// ── ${group} ──`)

    for (const operation of groupOps) {
      const n = camelCase(operation.id)

      const OperationName = pascalCase(operation.id)

      lines.push(`export { ${n} } from "./${camelCase(operation.group)}/${n}"`)

      lines.push(`export type { ${OperationName}Operation } from "./${camelCase(operation.group)}/${n}"`)
    }

    lines.push("")
  }

  return lines.join("\n")
}
