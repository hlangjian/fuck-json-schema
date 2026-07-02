import type { Models } from "@huanglangjian/specs"
import { topologicalSortSchemaMap } from "@huanglangjian/specs"
import type { SchemaMap } from "@huanglangjian/specs"
import { pascalCase } from "text-case"

export function addModelsToSchemaMap(models: Models[], schemaMap: SchemaMap): void {
  const seen = new Set<Models>()

  const walk = (m: Models) => {
    if (seen.has(m)) return

    seen.add(m)

    if ("id" in m && !schemaMap.has(m.id)) {
      schemaMap.set(m.id, m)
    }

    if (m.kind === "record") {
      Object.values(m.properties).forEach((v) => walk(v))
    } else if (m.kind === "union") {
      Object.values(m.variants).forEach((v) => walk(v))
    } else if (m.kind === "array" || m.kind === "set" || m.kind === "map") {
      walk(m.base)
    }
  }

  for (const model of models) walk(model)
}

export function toDotnetType(
  model: Models,
  schemaMap: SchemaMap,
  identifier: (s: string) => string,
): string {
  switch (model.kind) {
    case "int32":
      return "int"

    case "float32":
      return "float"

    case "float64":
      return "double"

    case "boolean":
      return "bool"

    case "string":

    case "datetime":

    case "date":

    case "duration":

    case "uuid":
      return "string"

    case "literal":
      if (typeof model.value === "string") return "string"

      if (typeof model.value === "boolean") return "bool"

      if (typeof model.value === "number") {
        if (model.value === Math.floor(model.value)) return "int"

        return "double"
      }

      return "string"

    case "null":
      return "null"

    case "array":

    case "set":
      return `List<${toDotnetType(model.base, schemaMap, identifier)}>`

    case "map":
      return `Dictionary<string, ${toDotnetType(model.base, schemaMap, identifier)}>`

    case "enums": {
      if (schemaMap.has(model.id)) return identifier(model.id)

      return "string"
    }

    case "record": {
      return schemaMap.has(model.id) ? identifier(model.id) : "object"
    }

    case "union": {
      return schemaMap.has(model.id) ? identifier(model.id) : "object"
    }

    case "unknown":
      return "JsonElement"

    default:
      return "object"
  }
}

export function toDotnetPropertyName(rawName: string): string {
  return pascalCase(rawName)
}

export function isDiscriminatorField(
  model: Models,
  fieldName: string,
): boolean {
  if (model.kind !== "union") return false

  const discriminator = (model as { discriminator: string }).discriminator

  return fieldName === discriminator
}

export function modelDefault(model: Models): unknown {
  if (typeof model === "object" && model !== null && "default" in model && model.default != null) return model.default

  return undefined
}

function xmlDocTags(model: {
  description?: string
  deprecated?: boolean
  examples?: unknown[]
  default?: unknown
}): string[] {
  const tags: string[] = []

  if (model.description) {
    tags.push(`<summary>${xmlEscape(model.description)}</summary>`)
  }

  if (model.examples && model.examples.length > 0) {
    tags.push(`<example>${xmlEscape(JSON.stringify(model.examples[0]))}</example>`)
  }

  if (model.deprecated) {
    tags.push(`<remarks>This member is deprecated.</remarks>`)
  }

  return tags
}

function xmlEscape(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

export function typeXmlDoc(model: {
  description?: string
  deprecated?: boolean
  examples?: unknown[]
  default?: unknown
}): string | null {
  const tags = xmlDocTags(model)

  if (tags.length === 0) return null

  return `/// ${tags.join("\n/// ")}`
}

export function fieldXmlDoc(
  field: { title?: string; description?: string; deprecated?: boolean; default?: unknown },
  indent = "",
): string | null {
  const desc = field.description || field.title

  const parts: string[] = []

  if (desc) parts.push(`<summary>${xmlEscape(desc)}</summary>`)

  if (field.deprecated) parts.push(`<remarks>This field is deprecated.</remarks>`)

  if (parts.length === 0) return null

  return `${indent}/// ${parts.join(`\n${indent}/// `)}`
}

export function generateModels(
  schemaMap: SchemaMap,
  identifier: (s: string) => string,
  namespace: string,
): string {
  const lines: string[] = []

  lines.push(`namespace ${namespace};`)

  lines.push("")

  const usings = new Set<string>()

  for (const [, m] of schemaMap) {
    const all = collectAllModels(m)

    for (const inner of all) {
      if (inner.kind === "unknown") usings.add("System.Text.Json")
    }
  }

  if (usings.size > 0) {
    for (const u of [...usings].sort()) {
      lines.push(`using ${u};`)
    }

    lines.push("")
  }

  for (const [id, m] of topologicalSortSchemaMap(schemaMap)) {
    const typeName = identifier(id)

    const doc = typeXmlDoc(m)

    switch (m.kind) {
      case "record": {
        const required = m.required as string[]

        if (doc) lines.push(doc)

        lines.push(`public sealed record ${typeName}`)

        lines.push(`{`)

        emitRecordProps(m.properties, required, schemaMap, identifier, lines)

        lines.push(`}`)

        lines.push("")

        break
      }

      case "enums": {
        if (doc) lines.push(doc)

        lines.push(`public enum ${typeName}`)

        lines.push(`{`)

        for (const [key] of Object.entries(m.variants)) {
          const enumMember = pascalCase(key)

          lines.push(`    ${enumMember},`)
        }

        lines.push(`}`)

        lines.push("")

        break
      }

      case "union": {
        const rawVariants = Object.entries(m.variants) as [string, Models][]

        const discriminator = (m as { discriminator: string }).discriminator

        const variants = rawVariants.map(([key, model]) => {
          if (model.kind === "record") {
            const rec = model as { properties: Record<string, Models>; required: string[] }

            const filteredProps: Record<string, Models> = {}

            for (const [k, v] of Object.entries(rec.properties)) {
              if (k !== discriminator) filteredProps[k] = v
            }

            const filteredRequired = rec.required.filter((r) => r !== discriminator)

            const filteredModel = { ...model, properties: filteredProps, required: filteredRequired }

            return [key, filteredModel as Models] as [string, Models]
          }

          return [key, model] as [string, Models]
        })

        emitClosedHierarchy(typeName, variants, schemaMap, identifier, doc, lines, m)

        break
      }

      default:
        break
    }
  }

  if (lines.length > 0 && lines[0] === "") lines.shift()

  return lines.join("\n")
}

function emitClosedHierarchy(
  typeName: string,
  variants: [string, Models][],
  schemaMap: SchemaMap,
  identifier: (s: string) => string,
  doc: string | null,
  lines: string[],
  _sourceModel: Models,
): void {
  if (doc) lines.push(doc)

  lines.push(`[Closed]`)

  for (const [vKey] of variants) {
    const variantTypeName = identifier(vKey)

    lines.push(`[JsonDerivedType(typeof(${variantTypeName}), "${xmlEscape(vKey)}")]`)
  }

  lines.push(`public abstract record ${typeName};`)

  lines.push("")

  for (const [, variantModel] of variants) {
    if (variantModel.kind === "record") {
      const rec = variantModel as { id: string; properties: Record<string, Models>; required: string[]; title?: string; description?: string; deprecated?: boolean; examples?: unknown[] }

      const variantDoc = typeXmlDoc(rec)

      const variantName = identifier(rec.id)

      if (variantDoc) lines.push(variantDoc)

      lines.push(`public sealed record ${variantName} : ${typeName}`)

      lines.push(`{`)

      emitRecordProps(rec.properties, rec.required, schemaMap, identifier, lines)

      lines.push(`}`)

      lines.push("")
    }
  }
}

function emitRecordProps(
  properties: Record<string, Models>,
  required: string[],
  schemaMap: SchemaMap,
  identifier: (s: string) => string,
  lines: string[],
): void {
  for (const [propName, propModel] of Object.entries(properties)) {
    const fieldDoc = fieldXmlDoc(propModel, "    ")

    if (fieldDoc) lines.push(fieldDoc)

    const dotnetName = toDotnetPropertyName(propName)

    const dotnetType = toDotnetType(propModel, schemaMap, identifier)

    const isRequired = Array.isArray(required) ? required.includes(propName as any) : true

    const defaultValue = modelDefault(propModel)

    lines.push(`    [JsonPropertyName("${xmlEscape(propName)}")]`)

    if (defaultValue !== undefined) {
      const dvLiteral = toDotnetLiteral(defaultValue, propModel)

      lines.push(`    public ${dotnetType} ${dotnetName} { get; init; } = ${dvLiteral};`)
    } else if (isRequired) {
      lines.push(`    public required ${dotnetType} ${dotnetName} { get; init; }`)
    } else {
      lines.push(`    public ${dotnetType}? ${dotnetName} { get; init; }`)
    }

    lines.push("")
  }

  if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop()
}

function collectAllModels(model: Models): Models[] {
  const seen = new Set<Models>()

  const out: Models[] = []

  const walk = (m: Models) => {
    if (seen.has(m)) return

    seen.add(m)

    out.push(m)

    if (m.kind === "record") {
      Object.values(m.properties).forEach((v) => walk(v))
    } else if (m.kind === "union") {
      Object.values(m.variants).forEach((v) => walk(v))
    } else if (m.kind === "array" || m.kind === "set" || m.kind === "map") {
      walk(m.base)
    }
  }

  walk(model)

  return out
}

export function toDotnetLiteral(value: unknown, model?: Models): string {
  if (value === null) return "null"

  if (typeof value === "string") {
    if (model?.kind === "enums") {
      for (const [k, v] of Object.entries((model as { variants: Record<string, string> }).variants)) {
        if (v === value) return `${identifierFromModel(model)}.${pascalCase(k)}`
      }
    }

    return `"${value}"`
  }

  function identifierFromModel(m: Models): string {
    if ("id" in m && m.id != null) return pascalCase(m.id as string)

    return ""
  }

  if (typeof value === "boolean") return value ? "true" : "false"

  if (typeof value === "number") {
    if (model?.kind === "float32") return `${value}f`

    if (model?.kind === "float64") return `${value}d`

    if (Number.isInteger(value)) return String(value)

    return String(value)
  }

  return JSON.stringify(value)
}

export function generateClosedAttribute(): string {
  return `namespace System.Runtime.CompilerServices;

[AttributeUsage(AttributeTargets.Class, AllowMultiple = false, Inherited = false)]
public sealed class ClosedAttribute : Attribute { }`
}

export function statusCodeToMethod(status: number): string {
  const map: Record<number, string> = {
    200: "Ok",
    201: "Created",
    204: "NoContent",
    301: "Moved",
    302: "Found",
    400: "BadRequest",
    401: "Unauthorized",
    403: "Forbidden",
    404: "NotFound",
    409: "Conflict",
    500: "InternalServerError",
    501: "NotImplemented",
    503: "ServiceUnavailable",
  }

  return map[status] ?? `StatusCode(${status})`
}

export function contentTypeForKind(kind: string): string {
  switch (kind) {
    case "binary":
      return "application/octet-stream"

    case "stream-response":
      return "application/x-ndjson"

    case "sse-response":
      return "text/event-stream"

    default:
      return "application/json"
  }
}

export function opXmlDoc(op: {
  summary?: string
  description?: string
  deprecated?: boolean
}): string | null {
  const parts: string[] = []

  if (op.summary) parts.push(`<summary>${xmlEscape(op.summary)}</summary>`)

  if (op.description && op.description !== op.summary) {
    parts.push(`<remarks>${xmlEscape(op.description)}</remarks>`)
  }

  if (op.deprecated) parts.push(`<remarks>This endpoint is deprecated.</remarks>`)

  if (parts.length === 0) return null

  return `/// ${parts.join("\n/// ")}`
}

export function resolveNamedRef(
  model: Models,
  schemaMap: SchemaMap,
  identifier: (s: string) => string,
): string | null {
  switch (model.kind) {
    case "record":

    case "enums":

    case "union":
      return schemaMap.has(model.id) ? identifier(model.id) : null

    case "array":

    case "set":

    case "map":
      return resolveNamedRef(model.base, schemaMap, identifier)

    default:
      return null
  }
}

export interface DotnetProjectOptions {
  targetFramework?: string
  version?: string
  langVersion?: string
  description?: string
  authors?: string
  nullable?: boolean
  implicitUsings?: boolean
}

export function generateCsproj(
  opts: DotnetProjectOptions,
  kind: "server" | "client",
  rootNamespace: string,
  additionalRefs: string[] = [],
): string {
  const tfm = opts.targetFramework ?? "net11.0"

  const version = opts.version ?? "1.0.0"

  const lang = opts.langVersion ?? "preview"

  const nullable = opts.nullable !== false

  const implicit = opts.implicitUsings === true

  const lines: string[] = []

  lines.push(`<Project Sdk="Microsoft.NET.Sdk">`)

  lines.push("")

  lines.push(`  <PropertyGroup>`)

  lines.push(`    <TargetFramework>${tfm}</TargetFramework>`)

  if (nullable) lines.push(`    <Nullable>enable</Nullable>`)

  if (!implicit) lines.push(`    <ImplicitUsings>disable</ImplicitUsings>`)

  lines.push(`    <LangVersion>${lang}</LangVersion>`)

  lines.push(`    <Version>${version}</Version>`)

  lines.push(`    <RootNamespace>${rootNamespace}</RootNamespace>`)

  if (opts.description) lines.push(`    <Description>${xmlEscape(opts.description)}</Description>`)

  if (opts.authors) lines.push(`    <Authors>${xmlEscape(opts.authors)}</Authors>`)

  lines.push(`  </PropertyGroup>`)

  lines.push("")

  if (kind === "server") {
    lines.push(`  <ItemGroup>`)

    lines.push(`    <FrameworkReference Include="Microsoft.AspNetCore.App" />`)

    lines.push(`  </ItemGroup>`)
  } else {
    lines.push(`  <ItemGroup>`)

    lines.push(`    <PackageReference Include="Microsoft.Extensions.Http" Version="*" />`)

    lines.push(`  </ItemGroup>`)
  }

  if (additionalRefs.length > 0) {
    lines.push("")

    lines.push(`  <ItemGroup>`)

    for (const ref of additionalRefs) {
      lines.push(`    <ProjectReference Include="${ref}" />`)
    }

    lines.push(`  </ItemGroup>`)
  }

  lines.push(`</Project>`)

  lines.push("")

  return lines.join("\n")
}

export function filePrologue(namespace: string): string {
  return `namespace ${namespace};`
}
