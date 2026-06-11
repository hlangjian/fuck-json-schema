import { camelCase, pascalCase } from "text-case"

import type { RouterModel } from "../api"
import type { Models } from "../types"

import { collectOperations, collectSchemaMap, resolveNamedRoot } from "./collect"
import type { OperationDescriptor, SchemaMap } from "./descriptors"

export interface TsClientOptions {
  routers: RouterModel[]
  identifier?: (id: string) => string
  namespace?: string
}

export function generateTsClient(options: TsClientOptions): Record<string, string> {
  const { routers, identifier = pascalCase, namespace } = options
  const operations = collectOperations(routers)
  const schemaMap = collectSchemaMap(operations)
  const files: Record<string, string> = {}

  files["models.ts"] = generateModels(schemaMap, identifier, namespace)

  for (const operation of operations) {
    files[`${camelCase(operation.id)}.ts`] = generateClientFn(operation, schemaMap, identifier, namespace)
  }

  files["index.ts"] = generateClientIndex(operations, identifier)

  return files
}

// ---- models.ts ----

function generateModels(schemaMap: SchemaMap, identifier: (s: string) => string, namespace?: string): string {
  const lines: string[] = []
  lines.push(`import { z } from "zod"`)
  lines.push("")

  for (const [id, schemaInfo] of schemaMap) {
    const schemaName = camelCase(id) + "Schema"
    const tsName = identifier(id)

    switch (schemaInfo.kind) {
      case "record": {
        lines.push(`export const ${schemaName} = z.object({`)
        for (const f of schemaInfo.fields!) {
          lines.push(`  ${f.name}: ${toZod(f.model, schemaMap)}${f.required ? "" : ".optional()"},`)
        }
        lines.push(`})`)
        lines.push("")

        lines.push(`export interface ${tsName} {`)
        for (const f of schemaInfo.fields!) {
          lines.push(`  ${f.name}${f.required ? "" : "?"}: ${toTs(f.model, schemaMap, identifier, namespace)};`)
        }
        lines.push(`}`)
        lines.push("")
        break
      }
      case "enums": {
        lines.push(`export const ${schemaName} = z.enum(${JSON.stringify(Object.values(schemaInfo.variants!))})`)
        lines.push(`export type ${tsName} = z.infer<typeof ${schemaName}>`)
        lines.push("")
        break
      }
      case "union": {
        const variants = Object.entries(schemaInfo.unionVariants!)
        const items = variants.map(([, v]) => toZod(v as Models, schemaMap)).join(", ")
        lines.push(`export const ${schemaName} = z.union([${items}])`)
        lines.push(`export type ${tsName} = z.infer<typeof ${schemaName}>`)
        lines.push("")
        break
      }
      case "taggedUnion": {
        const vk = schemaInfo.variantKey!
        const pk = schemaInfo.payloadKey!
        const items = Object.entries(schemaInfo.unionVariants!).map(([key, v]) =>
          `z.object({ ${JSON.stringify(vk)}: z.literal(${JSON.stringify(key)}), ${JSON.stringify(pk)}: ${toZod(v as Models, schemaMap)} })`)
        lines.push(`export const ${schemaName} = z.discriminatedUnion(${JSON.stringify(vk)}, [${items.join(", ")}])`)
        lines.push(`export type ${tsName} = z.infer<typeof ${schemaName}>`)
        lines.push("")
        break
      }
    }
  }

  return lines.join("\n")
}

// ---- per-operation file ----

function generateClientFn(
  operation: OperationDescriptor,
  schemaMap: SchemaMap,
  identifier: (s: string) => string,
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
  const okKind = okStatus ? operation.responseKinds[Number(okStatus)] ?? "json-response" : "json-response"
  const isStreamLike = okKind === "stream-response" || okKind === "sse-response" || okKind === "binary"
  const okSchema = okModel ? resolveZodSchema(okModel, schemaMap) : null

  const allModelImports = [...typeImports]
  if (okSchema && !isStreamLike) {
    const schemaRefs = collectSchemaRefs(okModel!, schemaMap)
    for (const ref of schemaRefs) {
      if (!allModelImports.includes(ref)) allModelImports.push(ref)
    }
  }
  if (allModelImports.length > 0) {
    lines.push(`import { ${allModelImports.join(", ")} } from "./models"`)
    lines.push("")
  }

  // Request type
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
      .map(([key, header]) => `"${key}"${header.required ? "" : "?"}: ${toTs(header.model, schemaMap, identifier, namespace)}`).join("; ")
    requestFields.push(`headers?: { ${field} } & Record<string, string>`)
  } else {
    requestFields.push("headers?: Record<string, string>")
  }
  requestFields.push("baseUrl?: string")

  lines.push(`export interface ${OperationName}Request {`)
  for (const field of requestFields) lines.push(`  ${field}`)
  lines.push(`}`)
  lines.push("")

  // Response type
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
      lines.push(`export type ${OperationName}Response = { status: ${status}; ${bodyField} }`)
    } else {
      lines.push(`export type ${OperationName}Response = { status: ${status} }`)
    }
  } else {
    lines.push(`export type ${OperationName}Response =`)
    for (const [status, responseModel] of responseEntries) {
      const kind = responseKind(status)
      const bodyField = responseBodyField(kind, responseModel)
      if (bodyField != null) lines.push(`  | { status: ${status}; ${bodyField} }`)
      else lines.push(`  | { status: ${status} }`)
    }
  }
  lines.push("")

  // Function params
  const hasRequired = hasParams || hasBody
  const reqParam = hasRequired ? `req: ${OperationName}Request` : `req?: ${OperationName}Request`

  // Return type
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
      lines.push(`  return ${okSchema}.parse(await res.json())`)
    } else {
      lines.push(`  return res.json()`)
    }
  } else {
    lines.push(`  return res`)
  }
  lines.push(`}`)

  return lines.join("\n")
}

// ---- index.ts ----

function generateClientIndex(operations: OperationDescriptor[], _identifier: (s: string) => string): string {
  const lines: string[] = []

  const groups = groupBy(operations, (operation) => operation.group)
  for (const [group, groupOps] of Object.entries(groups)) {
    lines.push(`// ── ${group} ──`)
    for (const operation of groupOps) {
      const n = camelCase(operation.id)
      const OperationName = pascalCase(operation.id)
      lines.push(`export { ${n}, type ${OperationName}Request, type ${OperationName}Response } from "./${n}"`)
    }
    lines.push("")
  }

  return lines.join("\n")
}

function groupBy<T>(items: T[], keyFn: (item: T) => string): Record<string, T[]> {
  const map: Record<string, T[]> = {}
  for (const item of items) {
    const key = keyFn(item)
    if (!map[key]) map[key] = []
    map[key].push(item)
  }
  return map
}

// ---- helpers ----

function toTs(model: Models, schemaMap: SchemaMap, identifier: (s: string) => string, namespace?: string): string {
  void namespace
  switch (model.kind) {
    case "int32": case "float32": case "float64": return "number"
    case "boolean": return "boolean"
    case "string": case "datetime": case "date": case "duration": return "string"
    case "literal": return JSON.stringify(model.value)
    case "null": return "null"
    case "array": case "set": return `${toTs(model.base, schemaMap, identifier, namespace)}[]`
    case "map": return `Record<string, ${toTs(model.base, schemaMap, identifier, namespace)}>`
    case "enums": {
      const schemaInfo = schemaMap.get(model.id)
      if (schemaInfo?.variants) return identifier(model.id)
      return Object.values(model.variants).map((v) => JSON.stringify(v)).join(" | ")
    }
    case "record": {
      const schemaInfo = schemaMap.get(model.id)
      return schemaInfo?.fields ? identifier(model.id) : "unknown"
    }
    case "union":
    case "taggedUnion": {
      const schemaInfo = schemaMap.get(model.id)
      if (schemaInfo?.unionVariants) return identifier(model.id)
      return Object.values(model.variants).map((v) => toTs(v as Models, schemaMap, identifier, namespace)).join(" | ")
    }
    default: return "unknown"
  }
}

function toZod(model: Models, schemaMap: SchemaMap): string {
  switch (model.kind) {
    case "int32":    return "z.coerce.number().int()"
    case "float32":
    case "float64":  return "z.coerce.number()"
    case "boolean":  return "z.coerce.boolean()"
    case "string":   return "z.string()"
    case "datetime": return "z.string().datetime()"
    case "date":     return "z.string().date()"
    case "duration": return "z.string()"
    case "literal":  return `z.literal(${JSON.stringify(model.value)})`
    case "null":     return "z.null()"
    case "array":    return `${toZod(model.base, schemaMap)}.array()`
    case "set":      return `${toZod(model.base, schemaMap)}.array()`
    case "map":      return `z.record(z.string(), ${toZod(model.base, schemaMap)})`
    case "enums":    return `z.enum(${JSON.stringify(Object.values(model.variants))})`
    case "record": {
      const schemaInfo = schemaMap.get(model.id)
      return schemaInfo?.fields ? camelCase(model.id) + "Schema" : "z.unknown()"
    }
    case "union": {
      const schemaInfo = schemaMap.get(model.id)
      if (schemaInfo?.unionVariants) return camelCase(model.id) + "Schema"
      const items = Object.values(model.variants).map((v) => toZod(v as Models, schemaMap))
      return `z.union([${items.join(", ")}])`
    }
    case "taggedUnion": {
      const schemaInfo = schemaMap.get(model.id)
      if (schemaInfo?.unionVariants) return camelCase(model.id) + "Schema"
      const items = Object.entries(model.variants).map(([key, v]) =>
        `z.object({ ${JSON.stringify(model.variantKey)}: z.literal(${JSON.stringify(key)}), ${JSON.stringify(model.payloadKey)}: ${toZod(v as Models, schemaMap)} })`)
      return `z.discriminatedUnion(${JSON.stringify(model.variantKey)}, [${items.join(", ")}])`
    }
    default: return "z.unknown()"
  }
}

function resolveZodSchema(model: Models, schemaMap: SchemaMap): string | null {
  switch (model.kind) {
    case "record":
    case "union":
    case "taggedUnion":
    case "enums": {
      const schemaInfo = schemaMap.get(model.id)
      return schemaInfo ? camelCase(model.id) + "Schema" : null
    }
    case "array":
    case "set": {
      const inner = resolveZodSchema(model.base, schemaMap)
      return inner ? `${inner}.array()` : null
    }
    case "map": {
      const inner = resolveZodSchema(model.base, schemaMap)
      return inner ? `z.record(z.string(), ${inner})` : null
    }
    default:
      return null
  }
}

function collectSchemaRefs(model: Models, schemaMap: SchemaMap): string[] {
  switch (model.kind) {
    case "record":
    case "union":
    case "taggedUnion":
    case "enums": {
      const schemaInfo = schemaMap.get(model.id)
      return schemaInfo ? [camelCase(model.id) + "Schema"] : []
    }
    case "array":
    case "set":
      return collectSchemaRefs(model.base, schemaMap)
    case "map":
      return collectSchemaRefs(model.base, schemaMap)
    default:
      return []
  }
}
