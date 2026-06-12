import { camelCase, pascalCase, snakeCase } from "text-case"

import type { RouterModel } from "../api"
import type { Models, RecordModel } from "../types"

import { collectOperations, collectSchemaMap, resolveNamedRoot } from "./collect"
import type { OperationDescriptor, SchemaMap } from "./descriptors"

export interface HonoServerOptions {
  routers: RouterModel[]
  identifier?: (id: string) => string
  namespace?: string
  configuration?: RecordModel<Record<string, Models>, string>
}

export function generateHonoServer(options: HonoServerOptions): Record<string, string> {
  const { routers, identifier = pascalCase, namespace, configuration } = options
  const operations = collectOperations(routers)
  const schemaMap = collectSchemaMap(operations)

  const files: Record<string, string> = {}

  files["models.ts"] = generateModels(schemaMap, identifier, namespace)

  for (const operation of operations) {
    files[`${camelCase(operation.group)}/${camelCase(operation.id)}.ts`] = generateOpFile(operation, schemaMap, identifier, namespace)
  }

  files["index.ts"] = generateIndex(operations, identifier)

  if (configuration) {
    files["config.ts"] = generateConfig(configuration)
  }

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
        for (const field of schemaInfo.fields!) {
          lines.push(`  ${field.name}: ${toZod(field.model, schemaMap)}${field.required ? "" : optionalDefault(field.model)},`)
        }
        lines.push(`})`)
        lines.push("")

        lines.push(`export interface ${tsName} {`)
        for (const field of schemaInfo.fields!) {
          lines.push(`  ${field.name}${field.required ? "" : "?"}: ${toTs(field.model, schemaMap, identifier, namespace)};`)
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
        const unionItems = variants.map(([, v]) => toZod(v as Models, schemaMap)).join(", ")
        lines.push(`export const ${schemaName} = z.union([${unionItems}])`)
        lines.push(`export type ${tsName} = z.infer<typeof ${schemaName}>`)
        lines.push("")
        break
      }
      case "taggedUnion": {
        const discriminator = schemaInfo.discriminator!
        const unionItems = Object.entries(schemaInfo.unionVariants!).map(([, v]) =>
          `${toZod(v as Models, schemaMap)}`)
        lines.push(`export const ${schemaName} = z.discriminatedUnion(${JSON.stringify(discriminator)}, [${unionItems.join(", ")}])`)
        lines.push(`export type ${tsName} = z.infer<typeof ${schemaName}>`)
        lines.push("")
        break
      }
    }
  }

  return lines.join("\n")
}

// ---- per-operation file ----

function generateOpFile(
  operation: OperationDescriptor,
  schemaMap: SchemaMap,
  identifier: (s: string) => string,
  namespace: string | undefined,
): string {
  const lines: string[] = []
  const OperationName = pascalCase(operation.id)
  const operationName = camelCase(operation.id)

  const hasBody = operation.requestModel != null && operation.requestModel.kind !== "null"
  const hasParams = Object.keys(operation.pathVariables).length > 0
  const hasQuery = Object.keys(operation.queries).length > 0
  const hasHeaders = Object.keys(operation.headers).length > 0

  // ---- precise imports ----
  const needsZod = hasParams || hasQuery || hasHeaders
  if (needsZod) {
    lines.push(`import { z } from "zod"`)
  }

  const schemaImports: string[] = []
  if (hasBody && "id" in operation.requestModel!) {
    const root = resolveNamedRoot(operation.requestModel!)
    if (root && schemaMap.has(root.id)) {
      schemaImports.push(camelCase(root.id) + "Schema")
    }
  }

  const typeImports: string[] = []
  if (hasBody && "id" in operation.requestModel!) {
    const root = resolveNamedRoot(operation.requestModel!)
    if (root) {
      const typeName = identifier(root.id)
      if (schemaMap.has(root.id) && !typeImports.includes(typeName)) {
        typeImports.push(typeName)
      }
    }
  }
  for (const responseModel of Object.values(operation.responses)) {
    if (responseModel == null) continue
    const root = resolveNamedRoot(responseModel)
    if (root) {
      const typeName = identifier(root.id)
      if (schemaMap.has(root.id) && !typeImports.includes(typeName)) {
        typeImports.push(typeName)
      }
    }
  }

  const allImports = [...new Set([...schemaImports, ...typeImports])]
  lines.push(`import type { Context } from "hono"`)
  if (allImports.length > 0 || schemaImports.length > 0) {
    const parts: string[] = []
    if (typeImports.length > 0) parts.push(typeImports.join(", "))
    if (schemaImports.length > 0) parts.push(schemaImports.join(", "))
    lines.push(`import { ${parts.join(", ")} } from "../models"`)
  }
  lines.push("")

  // ---- request params/query/headers schemaMap (Zod) ----
  if (hasParams) {
    const fields = Object.entries(operation.pathVariables)
      .map(([key, value]) => `  ${key}: ${toZod(value.model, schemaMap)},`)
    lines.push(`const ${operationName}Params = z.object({`)
    lines.push(...fields)
    lines.push(`})`)
    lines.push("")
  }
  if (hasQuery) {
    const fields = Object.entries(operation.queries)
      .map(([key, query]) => `  ${key}: ${toZod(query.model, schemaMap)}${query.required ? "" : optionalDefault(query.model)},`)
    lines.push(`const ${operationName}Query = z.object({`)
    lines.push(...fields)
    lines.push(`})`)
    lines.push("")
  }
  if (hasHeaders) {
    const fields = Object.entries(operation.headers)
      .map(([key, header]) => `  "${key}": ${toZod(header.model, schemaMap)}${header.required ? "" : optionalDefault(header.model)},`)
    lines.push(`const ${operationName}Headers = z.object({`)
    lines.push(...fields)
    lines.push(`})`)
    lines.push("")
  }

  // ---- Request interface ----
  const requestFields: string[] = []
  if (hasParams) {
    const field = Object.entries(operation.pathVariables)
      .map(([key, value]) => `${key}: ${toTs(value.model, schemaMap, identifier, namespace)}`).join("; ")
    requestFields.push(`params: { ${field} }`)
  }
  if (hasQuery) {
    const field = Object.entries(operation.queries)
      .map(([key, query]) => `${key}${query.required ? "" : "?"}: ${toTs(query.model, schemaMap, identifier, namespace)}`).join("; ")
    requestFields.push(`query: { ${field} }`)
  }
  if (hasHeaders) {
    const field = Object.entries(operation.headers)
      .map(([key, header]) => `"${key}"${header.required ? "" : "?"}: ${toTs(header.model, schemaMap, identifier, namespace)}`).join("; ")
    requestFields.push(`headers: { ${field} }`)
  }
  if (hasBody) {
    requestFields.push(`body: ${toTs(operation.requestModel!, schemaMap, identifier, namespace)}`)
  }
  lines.push(`export interface ${OperationName}Request {`)
  for (const field of requestFields) lines.push(`  ${field}`)
  lines.push(`}`)
  lines.push("")

  // ---- Response discriminated union ----
  const responseEntries = Object.entries(operation.responses)
  const responseKind = (status: string) => operation.responseKinds[Number(status)] ?? "json-response"
  const responseBodyField = (kind: string, model: Models | null) => {
    if (model == null) {
      if (kind === "binary") return "body: Blob"
      return null
    }
    if (kind === "stream-response" || kind === "sse-response") {
      return `stream: ReadableStream<${toTs(model, schemaMap, identifier, namespace)}>`
    }
    if (kind === "binary") return "body: Blob"
    return `body: ${toTs(model, schemaMap, identifier, namespace)}`
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
    const parts = responseEntries.map(([status, responseModel]) => {
      const kind = responseKind(status)
      const bodyField = responseBodyField(kind, responseModel)
      if (bodyField != null) return `  | { status: ${status}; ${bodyField} }`
      return `  | { status: ${status} }`
    })
    lines.push(parts.join("\n"))
  }
  lines.push("")

  // ---- Handler type ----
  if (requestFields.length > 0) {
    lines.push(`export type ${OperationName}Handler = (req: ${OperationName}Request) => Promise<${OperationName}Response>`)
  } else {
    lines.push(`export type ${OperationName}Handler = () => Promise<${OperationName}Response>`)
  }
  lines.push("")

  // ---- Wrapper function ----
  lines.push(`export function ${operationName}(handler: ${OperationName}Handler) {`)
  lines.push(`  return {`)
  lines.push(`    method: "${operation.method.toUpperCase()}",`)
  lines.push(`    path: "${toHonoPath(operation.path)}",`)
  lines.push(`    async handler(context: Context): Promise<Response> {`)

  const requestArgs: string[] = []

  if (hasParams) {
    lines.push(`      const params = ${operationName}Params.parse(context.req.param())`)
    requestArgs.push("params")
  }
  if (hasQuery) {
    lines.push(`      const query = ${operationName}Query.parse(context.req.query())`)
    requestArgs.push("query")
  }
  if (hasHeaders) {
    const headerParts = Object.keys(operation.headers)
      .map((key) => `        "${key}": context.req.header("${key}"),`)
    lines.push(`      const headers = ${operationName}Headers.parse({`)
    lines.push(...headerParts)
    lines.push(`      })`)
    requestArgs.push("headers")
  }
  if (hasBody) {
    const schemaName = camelCase((operation.requestModel as any).id) + "Schema"
    lines.push(`      const body = ${schemaName}.parse(await context.req.json())`)
    requestArgs.push("body")
  }

  if (requestArgs.length > 0) {
    lines.push(`      const result = await handler({ ${requestArgs.join(", ")} })`)
  } else {
    lines.push(`      const result = await handler()`)
  }

  // response dispatch
  lines.push(`      switch (result.status) {`)
  for (const [status, responseModel] of Object.entries(operation.responses)) {
    const kind = operation.responseKinds[Number(status)] ?? "json-response"
    if (responseModel != null) {
      if (kind === "json-response") {
        lines.push(`        case ${status}: return new Response(JSON.stringify(result.body), { status: ${status}, headers: { "Content-Type": "application/json" } })`)
      } else if (kind === "binary") {
        lines.push(`        case ${status}: return new Response(result.body, { status: ${status}, headers: { "Content-Type": "${contentTypeForKind(kind)}" } })`)
      } else {
        lines.push(`        case ${status}: return new Response(result.stream, { status: ${status}, headers: { "Content-Type": "${contentTypeForKind(kind)}" } })`)
      }
    } else if (kind === "binary") {
      lines.push(`        case ${status}: return new Response(result.body, { status: ${status}, headers: { "Content-Type": "${contentTypeForKind(kind)}" } })`)
    } else {
      lines.push(`        case ${status}: return new Response(null, { status: ${status} })`)
    }
  }
  lines.push(`        default: return new Response(JSON.stringify({ message: \`Unexpected response status \${(result as { status: number }).status}\` }), { status: 500, headers: { "Content-Type": "application/json" } })`)
  lines.push(`      }`)

  lines.push(`    },`)
  lines.push(`  }`)
  lines.push(`}`)

  return lines.join("\n")
}

// ---- index.ts ----

function generateIndex(operations: OperationDescriptor[], _identifier: (s: string) => string): string {
  const lines: string[] = []
  lines.push(`import { Hono } from "hono"`)
  lines.push("")

  for (const operation of operations) {
    const operationName = camelCase(operation.id)
    const OperationName = pascalCase(operation.id)
    lines.push(`import { ${operationName}, type ${OperationName}Handler, type ${OperationName}Request, type ${OperationName}Response } from "./${camelCase(operation.group)}/${operationName}"`)
    lines.push(`export type { ${OperationName}Handler, ${OperationName}Request, ${OperationName}Response }`)
  }

  lines.push("")

  const groups = groupBy(operations, (operation) => operation.group)

  lines.push(`export function mountRoutes(`)
  lines.push(`  app: Hono,`)
  lines.push(`  handlers: {`)

  for (const [group, groupOps] of Object.entries(groups)) {
    lines.push(`    ${camelCase(group)}: {`)
    for (const operation of groupOps) {
      const operationName = camelCase(operation.id)
      lines.push(`      ${operationName}: ${pascalCase(operation.id)}Handler,`)
    }
    lines.push(`    },`)
  }

  lines.push(`  },`)
  lines.push(`) {`)

  for (const [group, groupOps] of Object.entries(groups)) {
    lines.push(`  // ── ${group} ──`)
    for (const operation of groupOps) {
      const operationName = camelCase(operation.id)
      lines.push(`  const ${operationName}Def = ${operationName}(handlers.${camelCase(group)}.${operationName})`)
      lines.push(`  app.on(${operationName}Def.method, ${operationName}Def.path, ${operationName}Def.handler)`)
    }
    lines.push("")
  }

  lines.push(`}`)
  lines.push("")

  return lines.join("\n")
}

// ---- config.ts ----

interface EnvVar {
  envName: string
  zodExpr: string
}

interface FieldNode {
  name: string
  kind: "env" | "record" | "switch"
  envName?: string
  childFields?: FieldNode[]
  switchFnName?: string
}

interface VariantNode {
  varName: string
  resolveFnName: string
  envVars: EnvVar[]
  fields: FieldNode[]
  switches: SwitchNode[]
}

interface SwitchNode {
  resolveFnName: string
  dvEnvName: string
  dvZodExpr: string
  discriminator: string | null
  variants: VariantNode[]
}

interface CollectResult {
  envVars: EnvVar[]
  fields: FieldNode[]
  switches: SwitchNode[]
}

let _switchIdCounter = 0

function generateConfig(config: RecordModel<Record<string, Models>, string>): string {
  _switchIdCounter = 0
  const root = collectLevel(config.properties as Record<string, Models>, config.required as string[], "")

  const out: string[] = []

  out.push(`import { createEnv } from "@t3-oss/env-core"`)
  out.push(`import { z } from "zod"`)
  out.push("")

  out.push(`const _env = createEnv({`)
  out.push(`  server: {`)
  for (const v of root.envVars) {
    out.push(`    ${v.envName}: ${v.zodExpr},`)
  }
  out.push(`  },`)
  out.push(`  runtimeEnv: process.env,`)
  out.push(`  emptyStringAsUndefined: true,`)
  out.push(`})`)
  out.push("")

  for (const sw of root.switches) {
    emitSwitch(sw, out)
  }

  out.push(`export function get${pascalCase(config.id)}() {`)
  out.push(`  return {`)
  for (const f of root.fields) {
    out.push(`    ${f.name}: ${emitFieldExpr(f, "_env")},`)
  }
  out.push(`  }`)
  out.push(`}`)
  out.push("")

  return out.join("\n")
}

function emitSwitch(sw: SwitchNode, out: string[]): void {
  for (const v of sw.variants) {
    for (const nestedSw of v.switches) {
      emitSwitch(nestedSw, out)
    }

    out.push(`function ${v.resolveFnName}() {`)
    out.push(`  const env = createEnv({`)
    out.push(`    server: {`)
    for (const ev of v.envVars) {
      out.push(`      ${ev.envName}: ${ev.zodExpr},`)
    }
    out.push(`    },`)
    out.push(`    runtimeEnv: process.env,`)
    out.push(`    emptyStringAsUndefined: true,`)
    out.push(`  })`)
    out.push("")
    out.push(`  return {`)
    for (const f of v.fields) {
      out.push(`    ${f.name}: ${emitFieldExpr(f, "env")},`)
    }
    out.push(`  }`)
    out.push(`}`)
    out.push("")
  }

  out.push(`function ${sw.resolveFnName}() {`)
  out.push(`  switch (_env.${sw.dvEnvName}) {`)
  for (const v of sw.variants) {
    if (sw.discriminator != null) {
      out.push(`    case "${v.varName}": return ${v.resolveFnName}()`)
    } else {
      out.push(`    case "${v.varName}": return { type: "${v.varName}" as const, ...${v.resolveFnName}() }`)
    }
  }
  out.push(`  }`)
  out.push(`}`)
  out.push("")
}

function emitFieldExpr(field: FieldNode, envRef: string): string {
  switch (field.kind) {
    case "env":
      return `${envRef}.${field.envName}`
    case "record":
      return `{ ${field.childFields!.map((f) => `${f.name}: ${emitFieldExpr(f, envRef)}`).join(", ")} }`
    case "switch":
      return `${field.switchFnName}()`
  }
}

function collectLevel(
  properties: Record<string, Models>,
  required: string[],
  prefix: string,
): CollectResult {
  const envVars: EnvVar[] = []
  const fields: FieldNode[] = []
  const switches: SwitchNode[] = []

  for (const [propName, model] of Object.entries(properties)) {
    const envPrefix = prefix
      ? `${prefix}_${snakeCase(propName).toUpperCase()}`
      : snakeCase(propName).toUpperCase()

    switch (model.kind) {
      case "int32":
      case "float32":
      case "float64":
      case "boolean":
      case "string":
      case "datetime":
      case "date":
      case "duration":
      case "literal":
      case "null":
        envVars.push({ envName: envPrefix, zodExpr: toZodEnv(model as Models) })
        fields.push({ name: propName, kind: "env", envName: envPrefix })
        break

      case "enums":
        envVars.push({ envName: envPrefix, zodExpr: toZodEnv(model as Models) })
        fields.push({ name: propName, kind: "env", envName: envPrefix })
        break

      case "record": {
        const rec = model as RecordModel<Record<string, Models>, string>
        const child = collectLevel(rec.properties as Record<string, Models>, rec.required as string[], envPrefix)
        envVars.push(...child.envVars)
        switches.push(...child.switches)
        fields.push({ name: propName, kind: "record", childFields: child.fields })
        break
      }

      case "taggedUnion": {
        const dvZod = `z.enum(${JSON.stringify(Object.keys(model.variants))})`
        envVars.push({ envName: envPrefix, zodExpr: dvZod })

        const resolveFnName = `_resolve${pascalCase(propName)}`

        const variants: VariantNode[] = []
        for (const [vKey, vModel] of Object.entries(model.variants)) {
          const vRec = vModel as RecordModel<Record<string, Models>, string>
          const child = collectLevel(vRec.properties as Record<string, Models>, vRec.required as string[], envPrefix)
          variants.push({
            varName: vKey,
            resolveFnName: `${resolveFnName}${pascalCase(vKey)}`,
            envVars: child.envVars,
            fields: child.fields,
            switches: child.switches,
          })
        }

        switches.push({ resolveFnName, dvEnvName: envPrefix, dvZodExpr: dvZod, discriminator: model.discriminator as string, variants })
        fields.push({ name: propName, kind: "switch", switchFnName: resolveFnName })
        break
      }

      case "union": {
        const dvEnvName = `${envPrefix}_TYPE`
        const dvZod = `z.enum(${JSON.stringify(Object.keys(model.variants))})`
        envVars.push({ envName: dvEnvName, zodExpr: dvZod })

        const resolveFnName = `_resolve${pascalCase(propName)}`

        const variants: VariantNode[] = []
        for (const [vKey, vModel] of Object.entries(model.variants)) {
          const child = collectVariant(vModel as Models, envPrefix)
          variants.push({
            varName: vKey,
            resolveFnName: `${resolveFnName}${pascalCase(vKey)}`,
            envVars: child.envVars,
            fields: child.fields,
            switches: child.switches,
          })
        }

        switches.push({ resolveFnName, dvEnvName, dvZodExpr: dvZod, discriminator: null, variants })
        fields.push({ name: propName, kind: "switch", switchFnName: resolveFnName })
        break
      }

      case "array":
      case "set": {
        const base = (model as { base: Models }).base
        if (!isSimpleType(base)) {
          throw new Error(`unsupported configuration value of kind ${model.kind}<non-simple>, only simple element types are allowed`)
        }
        envVars.push({ envName: envPrefix, zodExpr: toZodEnv(model) })
        fields.push({ name: propName, kind: "env", envName: envPrefix })
        break
      }

      case "map":
        throw new Error("unsupported configuration value of kind map")

      default:
        envVars.push({ envName: envPrefix, zodExpr: "z.string()" })
        fields.push({ name: propName, kind: "env", envName: envPrefix })
    }
  }

  return { envVars, fields, switches }
}

function collectVariant(model: Models, prefix: string): CollectResult {
  if (model.kind === "record") {
    const rec = model as RecordModel<Record<string, Models>, string>
    return collectLevel(rec.properties as Record<string, Models>, rec.required as string[], prefix)
  }
  const envName = prefix
  return {
    envVars: [{ envName, zodExpr: toZodEnv(model) }],
    fields: [{ name: "value", kind: "env", envName }],
    switches: [],
  }
}

function isSimpleType(model: Models): boolean {
  return ["int32", "float32", "float64", "boolean", "string", "datetime", "date", "duration", "literal", "enums"].includes(model.kind)
}

function toZodEnv(model: Models): string {
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
    case "enums":    return `z.enum(${JSON.stringify(Object.values(model.variants))})`
    case "array": {
      if (!isSimpleType(model.base)) throw new Error("unsupported configuration value of kind array<non-simple>, only simple element types are allowed")
      return `z.coerce.string().transform(s => s.split(',').filter(Boolean)).pipe(z.array(${toZodEnv(model.base)}))`
    }
    case "set": {
      if (!isSimpleType(model.base)) throw new Error("unsupported configuration value of kind set<non-simple>, only simple element types are allowed")
      return `z.coerce.string().transform(s => new Set(s.split(',').filter(Boolean))).pipe(z.set(${toZodEnv(model.base)}))`
    }
    case "map":
      throw new Error("unsupported configuration value of kind map")
    default:
      return "z.string()"
  }
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

function toHonoPath(path: string): string {
  return path.replace(/\{(\w+)\}/g, ":$1")
}

function contentTypeForKind(kind: string): string {
  switch (kind) {
    case "binary": return "application/octet-stream"
    case "stream-response": return "application/x-ndjson"
    case "sse-response": return "text/event-stream"
    default: return "application/json"
  }
}

// ---- helpers ----

function optionalDefault(model: Models): string {
  if ("default" in model && model.default != null) {
    return `.optional().default(${JSON.stringify(model.default)})`
  }
  return ".optional()"
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
      const unionItems = Object.values(model.variants).map((v) => toZod(v as Models, schemaMap))
      return `z.union([${unionItems.join(", ")}])`
    }
    case "taggedUnion": {
      const schemaInfo = schemaMap.get(model.id)
      if (schemaInfo?.unionVariants) return camelCase(model.id) + "Schema"
      const discriminator = model.discriminator as string
      const unionItems = Object.values(model.variants).map((v) =>
        `${toZod(v as Models, schemaMap)}`)
      return `z.discriminatedUnion(${JSON.stringify(discriminator)}, [${unionItems.join(", ")}])`
    }
    default: return "z.unknown()"
  }
}

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

