import type { RouterModel, Models } from "@huanglangjian/specs"
import { collectOperations, collectSchemaMap, resolveNamedRoot } from "@huanglangjian/specs"
import type { OperationDescriptor, SchemaMap } from "@huanglangjian/specs"
import { groupBy } from "@huanglangjian/specs"
import { camelCase, pascalCase } from "text-case"

import { resolveLib, type ValidationLib } from "./validation-lib"
import { generateModels, toTs, resolveSchemaExpr, collectSchemaRefs } from "./shared"

export interface TsClientOptions {
  routers: RouterModel[]
  identifier?: (id: string) => string
  namespace?: string
  validationLib?: "zod" | "valibot"
}

export function generateTsClient(options: TsClientOptions): Record<string, string> {
  const { routers, identifier = pascalCase, namespace, validationLib } = options
  const lib = resolveLib(validationLib ?? "zod")
  const operations = collectOperations(routers)
  const schemaMap = collectSchemaMap(operations)
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
  for (const responseModel of Object.values(operation.responses)) {
    if (responseModel != null) addNamedRef(responseModel)
  }

  const okStatus = Object.keys(operation.responses).find((s) => Number(s) >= 200 && Number(s) < 300)
  const okModel: Models | null = okStatus ? operation.responses[Number(okStatus)] : null
  const okKind = okStatus ? (operation.responseKinds[Number(okStatus)] ?? "json-response") : "json-response"
  const isStreamLike = okKind === "stream-response" || okKind === "sse-response" || okKind === "binary"
  const okSchema = okModel ? resolveSchemaExpr(okModel, schemaMap, lib) : null

  const allModelImports = [...typeImports]
  if (okSchema && !isStreamLike) {
    const schemaRefs = collectSchemaRefs(okModel!, schemaMap)
    for (const ref of schemaRefs) {
      if (!allModelImports.includes(ref)) allModelImports.push(ref)
    }
  }
  if (allModelImports.length > 0) {
    lines.push(`import { ${allModelImports.join(", ")} } from "../models"`)
  }

  lines.push("")
  lines.push(`export namespace ${OperationName}Operation {`)
  lines.push("")

  const requestFields: string[] = []
  for (const [n, v] of Object.entries(operation.pathVariables)) {
    requestFields.push(`${n}: ${toTs(v.model, schemaMap, identifier, namespace)}`)
  }
  for (const [n, q] of Object.entries(operation.queries)) {
    const required = q.required ? "" : "?"
    requestFields.push(`${n}${required}: ${toTs(q.model, schemaMap, identifier, namespace)}`)
  }
  if (hasBody) {
    requestFields.push(`body: ${toTs(operation.requestModel!, schemaMap, identifier, namespace)}`)
  }
  if (hasHeaders) {
    const field = Object.entries(operation.headers)
      .map(
        ([key, header]) =>
          `"${key}"${header.required ? "" : "?"}: ${toTs(header.model, schemaMap, identifier, namespace)}`,
      )
      .join("; ")
    requestFields.push(`headers?: { ${field} } & Record<string, string>`)
  } else {
    requestFields.push("headers?: Record<string, string>")
  }
  requestFields.push("baseUrl?: string")

  lines.push(`  export interface Request {`)
  for (const field of requestFields) lines.push(`    ${field}`)
  lines.push(`  }`)
  lines.push("")

  const responseEntries = Object.entries(operation.responses)
  const responseKind = (status: string) => operation.responseKinds[Number(status)] ?? "json-response"
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
    const [status, responseModel] = responseEntries[0]
    const kind = responseKind(status)
    const bodyField = responseBodyField(kind, responseModel)
    if (bodyField != null) {
      lines.push(`  export type Response = { status: ${status}; ${bodyField} }`)
    } else {
      lines.push(`  export type Response = { status: ${status} }`)
    }
  } else {
    lines.push(`  export type Response =`)
    for (const [status, responseModel] of responseEntries) {
      const kind = responseKind(status)
      const bodyField = responseBodyField(kind, responseModel)
      if (bodyField != null) lines.push(`    | { status: ${status}; ${bodyField} }`)
      else lines.push(`    | { status: ${status} }`)
    }
  }
  lines.push("")
  lines.push(`}`)
  lines.push("")

  const hasRequired = hasParams || hasBody
  const reqParam = hasRequired ? `req: ${OperationName}Operation.Request` : `req?: ${OperationName}Operation.Request`

  const retType = okModel && !isStreamLike ? toTs(okModel, schemaMap, identifier, namespace) : "Response"

  const pathExpr = operation.path.replace(/\{(\w+)\}/g, (_, name) => `\${encodeURIComponent(req.${name})}`)

  lines.push(`export async function ${functionName}(${reqParam}): Promise<${retType}> {`)
  lines.push(`  const baseUrl = req?.baseUrl ?? ""`)

  if (hasQuery) {
    lines.push(`  const parts: string[] = []`)
    for (const [n, q] of Object.entries(operation.queries)) {
      if (q.required) {
        lines.push(`  parts.push("${n}=" + encodeURIComponent(req.${n}))`)
      } else {
        lines.push(`  if (req?.${n} != null) parts.push("${n}=" + encodeURIComponent(req.${n}))`)
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
  lines.push(`  if (!res.ok) throw new Error(\`${operation.method} ${operation.path} failed: \${res.status}\`)`)

  if (okModel && !isStreamLike) {
    if (okSchema) {
      lines.push(`  return ${lib.parse(okSchema, "await res.json()")}`)
    } else {
      lines.push(`  return res.json()`)
    }
  } else {
    lines.push(`  return res`)
  }
  lines.push(`}`)

  return lines.join("\n")
}

function generateClientIndex(operations: OperationDescriptor[]): string {
  const lines: string[] = []

  const groups = groupBy(operations, (operation) => operation.group)
  for (const [group, groupOps] of Object.entries(groups)) {
    lines.push(`// ── ${group} ──`)
    for (const operation of groupOps) {
      const n = camelCase(operation.id)
      const OperationName = pascalCase(operation.id)
      lines.push(`export { ${n}, ${OperationName}Operation } from "./${camelCase(operation.group)}/${n}"`)
    }
    lines.push("")
  }

  return lines.join("\n")
}
