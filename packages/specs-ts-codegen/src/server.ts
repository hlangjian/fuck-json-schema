import type { RouterModel, Models, RecordModel } from "@huanglangjian/specs"
import { collectOperations, collectSchemaMap, resolveNamedRoot } from "@huanglangjian/specs"
import type { OperationDescriptor, SchemaMap } from "@huanglangjian/specs"
import { groupBy } from "@huanglangjian/specs"
import { camelCase, pascalCase, snakeCase } from "text-case"

import {
  generateModels,
  toSchema,
  toSchemaEnv,
  toTs,
  toColonPath,
  contentTypeForKind,
  modelDefault,
  fieldJsdoc,
  addModelsToSchemaMap,
} from "./shared"
import { resolveLib, type ValidationLib } from "./validation-lib"

export interface TsServerOptions {
  routers: RouterModel[]
  identifier?: (id: string) => string
  namespace?: string
  configuration?: RecordModel<Record<string, Models>, string>
  models?: Models[]
  validationLib?: "zod" | "valibot"
}

export function generateTsServer(options: TsServerOptions): Record<string, string> {
  const { routers, identifier = pascalCase, namespace, configuration, models, validationLib } = options

  const lib = resolveLib(validationLib ?? "zod")

  const operations = collectOperations(routers)

  const schemaMap = collectSchemaMap(operations)

  if (models) {
    addModelsToSchemaMap(models, schemaMap)
  }

  if (configuration) {
    addModelsToSchemaMap([configuration as Models], schemaMap)
  }

  const files: Record<string, string> = {}

  files["models.ts"] = generateModels(schemaMap, identifier, lib, namespace)

  for (const operation of operations) {
    files[`${camelCase(operation.group)}/${camelCase(operation.id)}.ts`] = generateOpFile(
      operation,
      schemaMap,
      identifier,
      lib,
      namespace,
    )
  }

  files["index.ts"] = generateIndex(operations)

  if (configuration) {
    files["config.ts"] = generateConfig(configuration, identifier, lib)
  }

  return files
}

function opJsdoc(op: { summary?: string; description?: string; deprecated?: boolean }): string | null {
  const tags: string[] = []

  if (op.summary) tags.push(`@summary ${op.summary}`)

  if (op.description) tags.push(`@description ${op.description}`)

  if (op.deprecated) tags.push("@deprecated")

  return tags.length > 0 ? `/**\n * ${tags.join("\n * ")}\n */` : null
}

function generateOpFile(
  operation: OperationDescriptor,
  schemaMap: SchemaMap,
  identifier: (s: string) => string,
  lib: ValidationLib,
  namespace: string | undefined,
): string {
  const lines: string[] = []

  const OperationName = pascalCase(operation.id)

  const operationName = camelCase(operation.id)

  const hasBody = operation.requestModel != null && operation.requestModel.kind !== "null"

  const hasParams = Object.keys(operation.pathVariables).length > 0

  const hasQuery = Object.keys(operation.queries).length > 0

  const hasHeaders = Object.keys(operation.headers).length > 0

  const schemaImports: string[] = []

  if (hasBody && "id" in operation.requestModel!) {
    const root = resolveNamedRoot(operation.requestModel!)

    if (root && schemaMap.has(root.id)) {
      schemaImports.push(camelCase(root.id) + "Schema")
    }
  }

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

  if (typeImports.length > 0) {
    lines.push(`import type { ${typeImports.join(", ")} } from "../models"`)
  }

  if (schemaImports.length > 0) {
    lines.push(`import { ${schemaImports.join(", ")} } from "../models"`)
  }

  if (typeImports.length > 0 || schemaImports.length > 0) {
    lines.push("")
  }

  if (hasParams) {
    const fields = Object.entries(operation.pathVariables).map(
      ([key, value]) => `  ${key}: ${toSchema(value.model, schemaMap, lib)},`,
    )

    lines.push(`const ${operationName}Params = ${lib.ns}.object({`)

    lines.push(...fields)

    lines.push(`})`)

    lines.push("")
  }

  if (hasQuery) {
    const fields = Object.entries(operation.queries).map(([key, query]) => {
      const expr = toSchema(query.model, schemaMap, lib)

      const finalExpr = lib.field(expr, { optional: !query.required, defaultValue: modelDefault(query.model) })

      return `  ${key}: ${finalExpr},`
    })

    lines.push(`const ${operationName}Query = ${lib.ns}.object({`)

    lines.push(...fields)

    lines.push(`})`)

    lines.push("")
  }

  if (hasHeaders) {
    const fields = Object.entries(operation.headers).map(([key, header]) => {
      const expr = toSchema(header.model, schemaMap, lib)

      const finalExpr = lib.field(expr, { optional: !header.required, defaultValue: modelDefault(header.model) })

      return `  "${key}": ${finalExpr},`
    })

    lines.push(`const ${operationName}Headers = ${lib.ns}.object({`)

    lines.push(...fields)

    lines.push(`})`)

    lines.push("")
  }

  const opDoc = opJsdoc(operation)

  if (opDoc) lines.push(opDoc)

  lines.push(`export namespace ${OperationName}Operation {`)

  lines.push("")

  lines.push(`  export interface Request {`)

  if (hasParams) {
    lines.push(`    params: {`)

    for (const [key, value] of Object.entries(operation.pathVariables)) {
      const doc = fieldJsdoc(value.model, "      ")

      if (doc) lines.push(doc)

      lines.push(`      ${key}: ${toTs(value.model, schemaMap, identifier, namespace)};`)
    }

    lines.push(`    };`)
  }

  if (hasQuery) {
    lines.push(`    query: {`)

    for (const [key, query] of Object.entries(operation.queries)) {
      const doc = fieldJsdoc(query.model, "      ")

      if (doc) lines.push(doc)

      lines.push(`      ${key}${query.required ? "" : "?"}: ${toTs(query.model, schemaMap, identifier, namespace)};`)
    }

    lines.push(`    };`)
  }

  if (hasHeaders) {
    lines.push(`    headers: {`)

    for (const [key, header] of Object.entries(operation.headers)) {
      const doc = fieldJsdoc(header.model, "      ")

      if (doc) lines.push(doc)

      lines.push(
        `      "${key}"${header.required ? "" : "?"}: ${toTs(header.model, schemaMap, identifier, namespace)};`,
      )
    }

    lines.push(`    };`)
  }

  if (hasBody) {
    const bodyModel = operation.requestModel!

    const bodyDoc = fieldJsdoc(bodyModel, "    ")

    if (bodyDoc) lines.push(bodyDoc)

    lines.push(`    body: ${toTs(bodyModel, schemaMap, identifier, namespace)};`)
  }

  lines.push(`  }`)

  lines.push("")

  const responseEntries = operation.responses

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
    const r = responseEntries[0]

    const bodyField = responseBodyField(r.kind, r.model)

    if (bodyField != null) {
      lines.push(`  export type Response = { status: ${r.status}; ${bodyField} }`)
    } else {
      lines.push(`  export type Response = { status: ${r.status} }`)
    }
  } else {
    lines.push(`  export type Response =`)

    const parts = responseEntries.map((r) => {
      const bodyField = responseBodyField(r.kind, r.model)

      if (bodyField != null) return `    | { status: ${r.status}; ${bodyField} }`

      return `    | { status: ${r.status} }`
    })

    lines.push(parts.join("\n"))
  }

  lines.push("")

  if (hasParams || hasQuery || hasBody || hasHeaders) {
    lines.push(`  export type Handler = (req: Request) => Promise<Response>`)
  } else {
    lines.push(`  export type Handler = () => Promise<Response>`)
  }

  lines.push(`}`)

  lines.push("")

  if (hasParams) {
    lines.push(
      `export const ${operationName}Pattern = new URLPattern({ pathname: "*/${toColonPath(operation.path).replace(/^\//, "")}" })`,
    )

    lines.push("")
  }

  if (opDoc) lines.push(opDoc)

  const requestParamName = hasBody || hasParams || hasQuery || hasHeaders ? "request" : "_request"

  const paramsParamName = hasParams ? "params" : "_params"

  lines.push(`export function ${operationName}(handler: ${OperationName}Operation.Handler) {`)

  lines.push(`  return {`)

  lines.push(`    method: "${operation.method.toUpperCase()}",`)

  lines.push(`    path: "${toColonPath(operation.path)}",`)

  lines.push(
    `    handler: async (${requestParamName}: Request, ${paramsParamName}?: Record<string, string>): Promise<Response> => {`,
  )

  const requestArgs: string[] = []

  if (hasQuery) {
    lines.push(`      const requestUrl = new URL(request.url)`)
  }

  if (hasParams) {
    lines.push(`      const match = ${operationName}Pattern.exec(request.url)`)

    lines.push(`      if (!params && !match) return new Response(null, { status: 404 })`)

    lines.push(`      const p = ${lib.parse(`${operationName}Params`, `params ?? match!.pathname.groups`)}`)

    requestArgs.push("params: p")
  }

  if (hasQuery) {
    lines.push(
      `      const query = ${lib.parse(`${operationName}Query`, "Object.fromEntries(requestUrl.searchParams)")}`,
    )

    requestArgs.push("query")
  }

  if (hasHeaders) {
    const joinedHeaders = Object.keys(operation.headers)
      .map((key) => `"${key}": request.headers.get("${key}")`)
      .join(", ")

    lines.push(`      const headers = ${lib.parse(`${operationName}Headers`, `{ ${joinedHeaders} }`)}`)

    requestArgs.push("headers")
  }

  if (hasBody) {
    const schemaName = camelCase((operation.requestModel as any).id) + "Schema"

    lines.push(`      const body = ${lib.parse(schemaName, "await request.json()")}`)

    requestArgs.push("body")
  }

  if (requestArgs.length > 0) {
    lines.push(`      const result = await handler({ ${requestArgs.join(", ")} })`)
  } else {
    lines.push(`      const result = await handler()`)
  }

  lines.push(`      switch (result.status) {`)

  for (const r of operation.responses) {
    if (r.model != null) {
      if (r.kind === "json-response") {
        lines.push(
          `        case ${r.status}: return new Response(JSON.stringify(result.body), { status: ${r.status}, headers: { "Content-Type": "application/json" } })`,
        )
      } else if (r.kind === "binary") {
        lines.push(
          `        case ${r.status}: return new Response(result.body, { status: ${r.status}, headers: { "Content-Type": "${contentTypeForKind(r.kind)}" } })`,
        )
      } else {
        lines.push(
          `        case ${r.status}: return new Response(result.stream, { status: ${r.status}, headers: { "Content-Type": "${contentTypeForKind(r.kind)}" } })`,
        )
      }
    } else if (r.kind === "binary") {
      lines.push(
        `        case ${r.status}: return new Response(result.body, { status: ${r.status}, headers: { "Content-Type": "${contentTypeForKind(r.kind)}" } })`,
      )
    } else {
      lines.push(`        case ${r.status}: return new Response(null, { status: ${r.status} })`)
    }
  }

  lines.push(
    `        default: return new Response(JSON.stringify({ message: \`Unexpected response status \${(result as { status: number }).status}\` }), { status: 500, headers: { "Content-Type": "application/json" } })`,
  )

  lines.push(`      }`)

  lines.push(`    },`)

  lines.push(`  }`)

  lines.push(`}`)

  const body = lines.join("\n")

  const usesNs = new RegExp(`(^|[^A-Za-z0-9_])${lib.ns}\\.`).test(body)

  if (!usesNs) return body

  const sep = body.startsWith("import ") ? "\n" : "\n\n"

  return lib.importStmt + sep + body
}

function generateIndex(operations: OperationDescriptor[]): string {
  const lines: string[] = []

  lines.push("")

  for (const operation of operations) {
    const operationName = camelCase(operation.id)

    const OperationName = pascalCase(operation.id)

    lines.push(`import { ${operationName} } from "./${camelCase(operation.group)}/${operationName}"`)

    lines.push(`import type { ${OperationName}Operation } from "./${camelCase(operation.group)}/${operationName}"`)
  }

  lines.push("")

  const groups = groupBy(operations, (operation) => operation.group)

  for (const [group, groupOps] of Object.entries(groups)) {
    const groupPascal = pascalCase(group)

    const groupDesc = groupOps[0]?.groupDescription

    if (groupDesc) {
      lines.push(`/**`)

      lines.push(` * @description ${groupDesc}`)

      lines.push(` */`)
    }

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

// ---- config generation ----

interface EnvVar {
  envName: string
  schemaExpr: string
}

interface FieldNode {
  name: string
  kind: "env" | "record" | "switch"
  envName?: string
  childFields?: FieldNode[]
  switchFnName?: string
  discEnvName?: string
}

interface VariantNode {
  varName: string
  resolveFnName: string
  envVars: EnvVar[]
  fields: FieldNode[]
  unionSwitches: UnionSwitchNode[]
  discriminator: string
  discrimValue: string
}

interface UnionSwitchNode {
  resolveFnName: string
  discEnvName: string
  discSchemaExpr: string
  discriminator: string
  variants: VariantNode[]
}

interface CollectResult {
  envVars: EnvVar[]
  fields: FieldNode[]
  unionSwitches: UnionSwitchNode[]
}

function generateConfig(
  config: RecordModel<Record<string, Models>, string>,
  identifier: (s: string) => string,
  lib: ValidationLib,
): string {
  const root = collectLevel(config.properties as Record<string, Models>, config.required as string[], "", lib)

  const out: string[] = []

  const configTypeName = identifier(config.id)

  out.push(lib.importStmt)

  out.push(`import type { ${configTypeName} } from "./models"`)

  out.push("")

  const schemaName = camelCase(config.id) + "Schema"

  out.push(`export const ${schemaName}Env = ${lib.ns}.object({`)

  for (const v of root.envVars) {
    out.push(`  ${v.envName}: ${v.schemaExpr},`)
  }

  out.push(`})`)

  out.push("")

  for (const sw of root.unionSwitches) {
    emitUnionSwitch(sw, out, lib)
  }

  const configPascal = pascalCase(config.id)

  if (config.description) {
    out.push(`/**`)

    out.push(` * @description ${config.description}`)

    out.push(` */`)
  }

  out.push(
    `export function get${configPascal}(env: Record<string, string | undefined> = process.env): ${configTypeName} {`,
  )

  out.push(`  const e = ${lib.parse(`${schemaName}Env`, "env")}`)

  out.push(`  return {`)

  for (const f of root.fields) {
    out.push(`    ${f.name}: ${emitFieldExpr(f, "e", "env")},`)
  }

  out.push(`  }`)

  out.push(`}`)

  out.push("")

  return out.join("\n")
}

function emitVariantResolvers(v: VariantNode, out: string[], lib: ValidationLib): void {
  for (const nestedSw of v.unionSwitches) {
    emitUnionSwitch(nestedSw, out, lib)
  }

  const schemaName = camelCase(v.resolveFnName.replace("resolve", "")) + "ConfigSchema"

  out.push(`export const ${schemaName} = ${lib.ns}.object({`)

  for (const ev of v.envVars) {
    out.push(`  ${ev.envName}: ${ev.schemaExpr},`)
  }

  out.push(`})`)

  out.push("")

  out.push(`function ${v.resolveFnName}(env: Record<string, string | undefined>) {`)

  out.push(`  const e = ${lib.parse(schemaName, "env")}`)

  out.push("")

  out.push(`  return {`)

  out.push(`    ${v.discriminator}: ${v.discrimValue} as const,`)

  for (const f of v.fields) {
    out.push(`    ${f.name}: ${emitFieldExpr(f, "e", "env")},`)
  }

  out.push(`  }`)

  out.push(`}`)

  out.push("")
}

function emitUnionSwitch(sw: UnionSwitchNode, out: string[], lib: ValidationLib): void {
  for (const v of sw.variants) {
    emitVariantResolvers(v, out, lib)
  }

  out.push(`function ${sw.resolveFnName}(env: Record<string, string | undefined>, dv: string) {`)

  out.push(`  switch (dv) {`)

  for (const v of sw.variants) {
    out.push(`    case "${v.varName}": return ${v.resolveFnName}(env)`)
  }

  out.push(`  }`)

  out.push(`  throw new Error(\`unknown variant: \${dv}\`)`)

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
      return `${field.switchFnName}(${rawEnv}, ${envRef}.${field.discEnvName})`
  }
}

function collectLevel(
  properties: Record<string, Models>,
  required: string[],
  prefix: string,
  lib: ValidationLib,
): CollectResult {
  const envVars: EnvVar[] = []

  const fields: FieldNode[] = []

  const unionSwitches: UnionSwitchNode[] = []

  for (const [propName, model] of Object.entries(properties)) {
    const envPrefix = prefix ? `${prefix}_${snakeCase(propName).toUpperCase()}` : snakeCase(propName).toUpperCase()

    const optional = !required.includes(propName)

    switch (model.kind) {
      case "int32":

      case "float32":

      case "float64":

      case "boolean":

      case "string":

      case "datetime":

      case "date":

      case "duration":

      case "uuid":

      case "literal":

      case "null":
        envVars.push({
          envName: envPrefix,
          schemaExpr: lib.field(toSchemaEnv(model as Models, {} as SchemaMap, lib), {
            optional,
            defaultValue: modelDefault(model as Models),
          }),
        })

        fields.push({ name: propName, kind: "env", envName: envPrefix })

        break

      case "enums":
        envVars.push({
          envName: envPrefix,
          schemaExpr: lib.field(toSchemaEnv(model as Models, {} as SchemaMap, lib), {
            optional,
            defaultValue: modelDefault(model as Models),
          }),
        })

        fields.push({ name: propName, kind: "env", envName: envPrefix })

        break

      case "record": {
        const rec = model as RecordModel<Record<string, Models>, string>

        const child = collectLevel(rec.properties as Record<string, Models>, rec.required as string[], envPrefix, lib)

        envVars.push(...child.envVars)

        unionSwitches.push(...child.unionSwitches)

        fields.push({ name: propName, kind: "record", childFields: child.fields })

        break
      }

      case "union": {
        const discEnvName = `${envPrefix}_${snakeCase(model.discriminator as string).toUpperCase()}`

        const discSchema = lib.enums(Object.keys(model.variants))

        envVars.push({ envName: discEnvName, schemaExpr: discSchema })

        const resolveFnName = `resolve${pascalCase(propName)}`

        const variants: VariantNode[] = []

        for (const [vKey, vModel] of Object.entries(model.variants)) {
          const vRec = vModel as RecordModel<Record<string, Models>, string>

          const child = collectLevel(
            vRec.properties as Record<string, Models>,
            vRec.required as string[],
            envPrefix,
            lib,
          )

          variants.push({
            varName: vKey,
            resolveFnName: `${resolveFnName}${pascalCase(vKey)}`,
            envVars: child.envVars,
            fields: child.fields,
            unionSwitches: child.unionSwitches,
            discriminator: model.discriminator as string,
            discrimValue: JSON.stringify(JSON.stringify(vKey)),
          })
        }

        unionSwitches.push({
          resolveFnName,
          discEnvName,
          discSchemaExpr: discSchema,
          discriminator: model.discriminator as string,
          variants,
        })

        fields.push({ name: propName, kind: "switch", switchFnName: resolveFnName, discEnvName })

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

        envVars.push({
          envName: envPrefix,
          schemaExpr: lib.field(toSchemaEnv(model, {} as SchemaMap, lib), {
            optional,
            defaultValue: modelDefault(model),
          }),
        })

        fields.push({ name: propName, kind: "env", envName: envPrefix })

        break
      }

      case "map":
        throw new Error("unsupported configuration value of kind map")

      default:
        envVars.push({
          envName: envPrefix,
          schemaExpr: lib.field(lib.string(), { optional, defaultValue: modelDefault(model) }),
        })

        fields.push({ name: propName, kind: "env", envName: envPrefix })
    }
  }

  return { envVars, fields, unionSwitches }
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
    "uuid",
    "literal",
    "enums",
  ].includes(model.kind)
}
