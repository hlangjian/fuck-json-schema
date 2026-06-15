import type { RouterModel, Models, RecordModel } from "@huanglangjian/specs"
import { collectOperations, collectSchemaMap, resolveNamedRoot } from "@huanglangjian/specs"
import type { OperationDescriptor, SchemaMap } from "@huanglangjian/specs"
import { groupBy } from "@huanglangjian/specs"
import { camelCase, pascalCase, snakeCase } from "text-case"

import { generateModels, toZod, toTs, optionalDefault, toHonoPath, contentTypeForKind } from "./shared"

export interface TsServerOptions {
  routers: RouterModel[]
  identifier?: (id: string) => string
  namespace?: string
  configuration?: RecordModel<Record<string, Models>, string>
}

export function generateTsServer(options: TsServerOptions): Record<string, string> {
  const { routers, identifier = pascalCase, namespace, configuration } = options
  const operations = collectOperations(routers)
  const schemaMap = collectSchemaMap(operations)

  if (configuration) {
    addConfigToSchemaMap(configuration, schemaMap)
  }

  const files: Record<string, string> = {}

  files["models.ts"] = generateModels(schemaMap, identifier, namespace)

  for (const operation of operations) {
    files[`${camelCase(operation.group)}/${camelCase(operation.id)}.ts`] = generateOpFile(
      operation,
      schemaMap,
      identifier,
      namespace,
    )
  }

  files["index.ts"] = generateIndex(operations, identifier)

  if (configuration) {
    files["config.ts"] = generateConfig(configuration, identifier)
  }

  return files
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
  if (allImports.length > 0 || schemaImports.length > 0) {
    const parts: string[] = []
    if (typeImports.length > 0) parts.push(typeImports.join(", "))
    if (schemaImports.length > 0) parts.push(schemaImports.join(", "))
    lines.push(`import { ${parts.join(", ")} } from "../models"`)
  }
  lines.push("")

  if (hasParams) {
    const fields = Object.entries(operation.pathVariables).map(
      ([key, value]) => `  ${key}: ${toZod(value.model, schemaMap)},`,
    )
    lines.push(`const ${operationName}Params = z.object({`)
    lines.push(...fields)
    lines.push(`})`)
    lines.push("")
  }
  if (hasQuery) {
    const fields = Object.entries(operation.queries).map(
      ([key, query]) =>
        `  ${key}: ${toZod(query.model, schemaMap)}${query.required ? "" : optionalDefault(query.model)},`,
    )
    lines.push(`const ${operationName}Query = z.object({`)
    lines.push(...fields)
    lines.push(`})`)
    lines.push("")
  }
  if (hasHeaders) {
    const fields = Object.entries(operation.headers).map(
      ([key, header]) =>
        `  "${key}": ${toZod(header.model, schemaMap)}${header.required ? "" : optionalDefault(header.model)},`,
    )
    lines.push(`const ${operationName}Headers = z.object({`)
    lines.push(...fields)
    lines.push(`})`)
    lines.push("")
  }

  lines.push(`export namespace ${OperationName}Operation {`)
  lines.push("")

  const requestFields: string[] = []
  if (hasParams) {
    const field = Object.entries(operation.pathVariables)
      .map(([key, value]) => `${key}: ${toTs(value.model, schemaMap, identifier, namespace)}`)
      .join("; ")
    requestFields.push(`params: { ${field} }`)
  }
  if (hasQuery) {
    const field = Object.entries(operation.queries)
      .map(
        ([key, query]) => `${key}${query.required ? "" : "?"}: ${toTs(query.model, schemaMap, identifier, namespace)}`,
      )
      .join("; ")
    requestFields.push(`query: { ${field} }`)
  }
  if (hasHeaders) {
    const field = Object.entries(operation.headers)
      .map(
        ([key, header]) =>
          `"${key}"${header.required ? "" : "?"}: ${toTs(header.model, schemaMap, identifier, namespace)}`,
      )
      .join("; ")
    requestFields.push(`headers: { ${field} }`)
  }
  if (hasBody) {
    requestFields.push(`body: ${toTs(operation.requestModel!, schemaMap, identifier, namespace)}`)
  }
  lines.push(`  export interface Request {`)
  for (const field of requestFields) lines.push(`    ${field}`)
  lines.push(`  }`)
  lines.push("")

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
      lines.push(`  export type Response = { status: ${status}; ${bodyField} }`)
    } else {
      lines.push(`  export type Response = { status: ${status} }`)
    }
  } else {
    lines.push(`  export type Response =`)
    const parts = responseEntries.map(([status, responseModel]) => {
      const kind = responseKind(status)
      const bodyField = responseBodyField(kind, responseModel)
      if (bodyField != null) return `    | { status: ${status}; ${bodyField} }`
      return `    | { status: ${status} }`
    })
    lines.push(parts.join("\n"))
  }
  lines.push("")

  if (requestFields.length > 0) {
    lines.push(`  export type Handler = (req: Request) => Promise<Response>`)
  } else {
    lines.push(`  export type Handler = () => Promise<Response>`)
  }
  lines.push(`}`)
  lines.push("")

  if (hasParams) {
    lines.push(
      `export const ${operationName}Pattern = new URLPattern({ pathname: "*/${toHonoPath(operation.path).replace(/^\//, "")}" })`,
    )
    lines.push("")
  }

  lines.push(`export function ${operationName}(handler: ${OperationName}Operation.Handler) {`)
  lines.push(`  return {`)
  lines.push(`    method: "${operation.method.toUpperCase()}",`)
  lines.push(`    path: "${toHonoPath(operation.path)}",`)
  lines.push(`    handler: async (request: Request, params?: Record<string, string>): Promise<Response> => {`)

  const requestArgs: string[] = []

  if (hasQuery) {
    lines.push(`      const requestUrl = new URL(request.url)`)
  }
  if (hasParams) {
    lines.push(`      const p = ${operationName}Params.parse(`)
    lines.push(`        params ?? ${operationName}Pattern.exec(request.url)!.pathname.groups`)
    lines.push(`      )`)
    requestArgs.push("params: p")
  }
  if (hasQuery) {
    lines.push(`      const query = ${operationName}Query.parse(Object.fromEntries(requestUrl.searchParams))`)
    requestArgs.push("query")
  }
  if (hasHeaders) {
    const headerParts = Object.keys(operation.headers).map((key) => `        "${key}": request.headers.get("${key}"),`)
    lines.push(`      const headers = ${operationName}Headers.parse({`)
    lines.push(...headerParts)
    lines.push(`      })`)
    requestArgs.push("headers")
  }
  if (hasBody) {
    const schemaName = camelCase((operation.requestModel as any).id) + "Schema"
    lines.push(`      const body = ${schemaName}.parse(await request.json())`)
    requestArgs.push("body")
  }

  if (requestArgs.length > 0) {
    lines.push(`      const result = await handler({ ${requestArgs.join(", ")} })`)
  } else {
    lines.push(`      const result = await handler()`)
  }

  lines.push(`      switch (result.status) {`)
  for (const [status, responseModel] of Object.entries(operation.responses)) {
    const kind = operation.responseKinds[Number(status)] ?? "json-response"
    if (responseModel != null) {
      if (kind === "json-response") {
        lines.push(
          `        case ${status}: return new Response(JSON.stringify(result.body), { status: ${status}, headers: { "Content-Type": "application/json" } })`,
        )
      } else if (kind === "binary") {
        lines.push(
          `        case ${status}: return new Response(result.body, { status: ${status}, headers: { "Content-Type": "${contentTypeForKind(kind)}" } })`,
        )
      } else {
        lines.push(
          `        case ${status}: return new Response(result.stream, { status: ${status}, headers: { "Content-Type": "${contentTypeForKind(kind)}" } })`,
        )
      }
    } else if (kind === "binary") {
      lines.push(
        `        case ${status}: return new Response(result.body, { status: ${status}, headers: { "Content-Type": "${contentTypeForKind(kind)}" } })`,
      )
    } else {
      lines.push(`        case ${status}: return new Response(null, { status: ${status} })`)
    }
  }
  lines.push(
    `        default: return new Response(JSON.stringify({ message: \`Unexpected response status \${(result as { status: number }).status}\` }), { status: 500, headers: { "Content-Type": "application/json" } })`,
  )
  lines.push(`      }`)

  lines.push(`    },`)
  lines.push(`  }`)
  lines.push(`}`)

  return lines.join("\n")
}

// ---- index.ts ----

function generateIndex(operations: OperationDescriptor[], _identifier: (s: string) => string): string {
  const lines: string[] = []
  lines.push("")

  for (const operation of operations) {
    const operationName = camelCase(operation.id)
    const OperationName = pascalCase(operation.id)
    lines.push(
      `import { ${operationName}, ${OperationName}Operation } from "./${camelCase(operation.group)}/${operationName}"`,
    )
  }

  lines.push("")

  const groups = groupBy(operations, (operation) => operation.group)

  for (const [group, groupOps] of Object.entries(groups)) {
    const groupPascal = pascalCase(group)
    lines.push(`export interface ${groupPascal}Handlers {`)
    for (const operation of groupOps) {
      const operationName = camelCase(operation.id)
      lines.push(`  ${operationName}: ${pascalCase(operation.id)}Operation.Handler`)
    }
    lines.push(`}`)
    lines.push("")
    lines.push(`export function create${groupPascal}Router(handlers: ${groupPascal}Handlers) {`)
    lines.push(`  return [`)
    for (const operation of groupOps) {
      const operationName = camelCase(operation.id)
      lines.push(`    ${operationName}(handlers.${operationName}),`)
    }
    lines.push(`  ]`)
    lines.push(`}`)
    lines.push("")
  }

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
  dvEnvName?: string
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

function addConfigToSchemaMap(config: Models, schemaMap: SchemaMap): void {
  const seen = new Set<Models>()
  const walk = (m: Models) => {
    if (seen.has(m)) return
    seen.add(m)

    if ("id" in m && !schemaMap.has(m.id)) {
      if (m.kind === "record") {
        const rec = m as RecordModel<Record<string, Models>, string>
        schemaMap.set(rec.id, {
          kind: "record",
          fields: Object.entries(rec.properties).map(([name, p]) => ({
            name,
            model: p as Models,
            required: (rec.required as string[]).includes(name),
          })),
        })
      } else if (m.kind === "enums") {
        schemaMap.set(m.id, { kind: "enums", variants: m.variants as Record<string, string> })
      } else if (m.kind === "union") {
        schemaMap.set(m.id, { kind: "union", unionVariants: m.variants as Record<string, Models> })
      } else if (m.kind === "taggedUnion") {
        schemaMap.set(m.id, {
          kind: "taggedUnion",
          unionVariants: m.variants as Record<string, Models>,
          discriminator: m.discriminator as string,
        })
      }
    }

    if (m.kind === "record") {
      Object.values((m as RecordModel<Record<string, Models>, string>).properties).forEach((v) => walk(v as Models))
    } else if (m.kind === "union" || m.kind === "taggedUnion") {
      Object.values((m as { variants: Record<string, Models> }).variants).forEach((v) => walk(v as Models))
    } else if (m.kind === "array" || m.kind === "set" || m.kind === "map") {
      walk((m as { base: Models }).base)
    }
  }
  walk(config)
}

function generateConfig(config: RecordModel<Record<string, Models>, string>, identifier: (s: string) => string): string {
  _switchIdCounter = 0
  const root = collectLevel(config.properties as Record<string, Models>, config.required as string[], "")

  const out: string[] = []
  const configTypeName = identifier(config.id)

  out.push(`import { z } from "zod"`)
  out.push(`import type { ${configTypeName} } from "../models"`)
  out.push("")

  const schemaName = camelCase(config.id) + "Schema"
  out.push(`export const ${schemaName}Env = z.object({`)
  for (const v of root.envVars) {
    out.push(`  ${v.envName}: ${v.zodExpr},`)
  }
  out.push(`})`)
  out.push("")

  for (const sw of root.switches) {
    emitSwitch(sw, out)
  }

  out.push(`export function get${pascalCase(config.id)}(env: Record<string, string | undefined> = process.env): ${configTypeName} {`)
  out.push(`  const e = ${schemaName}Env.parse(env)`)
  out.push(`  return {`)
  for (const f of root.fields) {
    out.push(`    ${f.name}: ${emitFieldExpr(f, "e", "env")},`)
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

    const schemaName = camelCase(v.resolveFnName.replace("_resolve", "")) + "ConfigSchema"
    out.push(`export const ${schemaName} = z.object({`)
    for (const ev of v.envVars) {
      out.push(`  ${ev.envName}: ${ev.zodExpr},`)
    }
    out.push(`})`)
    out.push("")
    out.push(`function ${v.resolveFnName}(env: Record<string, string | undefined>) {`)
    out.push(`  const e = ${schemaName}.parse(env)`)
    out.push("")
    out.push(`  return {`)
    for (const f of v.fields) {
      out.push(`    ${f.name}: ${emitFieldExpr(f, "e", "env")},`)
    }
    out.push(`  }`)
    out.push(`}`)
    out.push("")
  }

  out.push(`function ${sw.resolveFnName}(env: Record<string, string | undefined>, dv: string) {`)
  out.push(`  switch (dv) {`)
  for (const v of sw.variants) {
    if (sw.discriminator != null) {
      out.push(`    case "${v.varName}": return ${v.resolveFnName}(env)`)
    } else {
      out.push(`    case "${v.varName}": return { type: "${v.varName}" as const, ...${v.resolveFnName}(env) }`)
    }
  }
  out.push(`  }`)
  out.push(`}`)
  out.push("")
}

function emitFieldExpr(field: FieldNode, envRef: string, rawEnv: string): string {
  switch (field.kind) {
    case "env":
      return `${envRef}.${field.envName}`
    case "record":
      return `{ ${field.childFields!.map((f) => `${f.name}: ${emitFieldExpr(f, envRef, rawEnv)}`).join(", ")} }`
    case "switch":
      return `${field.switchFnName}(${rawEnv}, ${envRef}.${field.dvEnvName})`
  }
}

function collectLevel(properties: Record<string, Models>, required: string[], prefix: string): CollectResult {
  const envVars: EnvVar[] = []
  const fields: FieldNode[] = []
  const switches: SwitchNode[] = []

  for (const [propName, model] of Object.entries(properties)) {
    const envPrefix = prefix ? `${prefix}_${snakeCase(propName).toUpperCase()}` : snakeCase(propName).toUpperCase()

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

        switches.push({
          resolveFnName,
          dvEnvName: envPrefix,
          dvZodExpr: dvZod,
          discriminator: model.discriminator as string,
          variants,
        })
        fields.push({ name: propName, kind: "switch", switchFnName: resolveFnName, dvEnvName: envPrefix })
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
        fields.push({ name: propName, kind: "switch", switchFnName: resolveFnName, dvEnvName })
        break
      }

      case "array":
      case "set": {
        const base = (model as { base: Models }).base
        if (!isSimpleType(base)) {
          throw new Error(
            `unsupported configuration value of kind ${model.kind}<non-simple>, only simple element types are allowed`,
          )
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
  return [
    "int32",
    "float32",
    "float64",
    "boolean",
    "string",
    "datetime",
    "date",
    "duration",
    "literal",
    "enums",
  ].includes(model.kind)
}

function toZodEnv(model: Models): string {
  switch (model.kind) {
    case "int32":
      return "z.coerce.number().int()"
    case "float32":
    case "float64":
      return "z.coerce.number()"
    case "boolean":
      return "z.coerce.boolean()"
    case "string":
      return "z.string()"
    case "datetime":
      return "z.string().datetime()"
    case "date":
      return "z.string().date()"
    case "duration":
      return "z.string()"
    case "literal":
      return `z.literal(${JSON.stringify(model.value)})`
    case "null":
      return "z.null()"
    case "enums":
      return `z.enum(${JSON.stringify(Object.values(model.variants))})`
    case "array": {
      if (!isSimpleType(model.base))
        throw new Error(
          "unsupported configuration value of kind array<non-simple>, only simple element types are allowed",
        )
      return `z.coerce.string().transform(s => s.split(',').filter(Boolean)).pipe(z.array(${toZodEnv(model.base)}))`
    }
    case "set": {
      if (!isSimpleType(model.base))
        throw new Error(
          "unsupported configuration value of kind set<non-simple>, only simple element types are allowed",
        )
      return `z.coerce.string().transform(s => new Set(s.split(',').filter(Boolean))).pipe(z.set(${toZodEnv(model.base)}))`
    }
    case "map":
      throw new Error("unsupported configuration value of kind map")
    default:
      return "z.string()"
  }
}
