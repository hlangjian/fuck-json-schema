import type { RouterModel } from "./api"
import type {
  AnyNamedDescriptor,
  OperationDescriptor,
  RecordDescriptor,
} from "./codegen/descriptors"
import { collectNamedModels, collectOperations } from "./codegen/collect"
import { buildJsonSchema, createJsonSchemaRegistry } from "./generate-jsonschema"
import type { Models } from "./types"
import { camelCase } from "text-case"

export interface ManifestOptions {
  info: { title: string; version: string; description?: string }
  routers: RouterModel[]
  brokers?: BrokerModel[]
  models?: Models[]
}

interface ManifestResult {
  server: string
  client: string
  subscriber: string
  schemas: Record<string, string>
}

export function generateManifests(options: ManifestOptions): ManifestResult {
  const { info, routers, brokers, models: _extraModels } = options

  const operations = collectOperations(routers)

  const schemaMap = collectSchemaMapFromOps(operations)

  const namedModels = collectNamedModels([...schemaMap.values()], {})

  const registry = createJsonSchemaRegistry()

  const schemas: Record<string, string> = {}

  for (const m of schemaMap.values()) {
    const name = camelCase(m.id)

    if (!schemas[name]) {
      schemas[`${name}.schema.json`] = JSON.stringify(
        buildJsonSchema({ model: m, registry }).jsonSchema,
        null,
        2,
      )
    }
  }

  const httpModelIds = new Set<string>()

  for (const op of operations) collectOpModelIds(op, httpModelIds)

  const pubsubModelIds = new Set<string>()

  for (const broker of brokers ?? []) {
    for (const ch of Object.values(broker.channels)) {
      addModelId(ch.payload, pubsubModelIds)
    }
  }

  const httpModels = namedModels.filter((m) => httpModelIds.has(m.originalId))

  const pubsubModels = namedModels.filter((m) => pubsubModelIds.has(m.originalId))

  const server = generateServerDoc(info, operations, httpModels, schemas)

  const client = generateClientDoc(info, operations, httpModels, schemas)

  const subscriber = generateSubscriberDoc(info, brokers ?? [], pubsubModels, schemas)

  return { server, client, subscriber, schemas }
}

function collectSchemaMapFromOps(
  ops: OperationDescriptor[],
): Map<string, Models> {
  const seen = new Set<Models>()

  const map = new Map<string, Models>()

  const add = (m: Models | null) => {
    if (m == null || seen.has(m)) return

    seen.add(m)

    if ("id" in m && !map.has(m.id)) map.set(m.id, m)

    if (m.kind === "array" || m.kind === "set" || m.kind === "map") add(m.base)

    if (m.kind === "record") {
      for (const v of Object.values(m.properties)) add(v as Models)
    }

    if (m.kind === "union") {
      for (const v of Object.values(m.variants)) add(v as Models)
    }
  }

  for (const op of ops) {
    add(op.requestModel)

    for (const r of op.responses) add(r.model)

    for (const v of Object.values(op.pathVariables)) add(v.model)

    for (const v of Object.values(op.queries)) add(v.model)

    for (const v of Object.values(op.headers)) add(v.model)
  }

  return map
}

function collectOpModelIds(op: OperationDescriptor, ids: Set<string>) {
  addModelId(op.requestModel, ids)

  for (const r of op.responses) addModelId(r.model, ids)

  for (const v of Object.values(op.pathVariables)) addModelId(v.model, ids)

  for (const v of Object.values(op.queries)) addModelId(v.model, ids)

  for (const v of Object.values(op.headers)) addModelId(v.model, ids)
}

function addModelId(m: Models | null, ids: Set<string>) {
  if (m == null) return

  if ("id" in m) {
    ids.add(m.id)

    return
  }

  if ((m.kind === "array" || m.kind === "set" || m.kind === "map") && m.base) {
    addModelId(m.base, ids)
  }
}

// ── Markdown generators ──

function h1(text: string) {
  return `# ${text}\n`
}

function h2(text: string) {
  return `## ${text}\n`
}

function h3(text: string) {
  return `### ${text}\n`
}

function h4(text: string) {
  return `#### ${text}\n`
}

function quote(text: string) {
  return `> ${text}\n`
}

function code(text: string) {
  return `\`${text}\``
}

function bold(text: string) {
  return `**${text}**`
}

function empty() {
  return "\n"
}

function schemaLink(name: string) {
  return `📄 [schemas/${name}.schema.json](./schemas/${name}.schema.json)\n`
}

function tableHeader(cols: string[]) {
  return `| ${cols.join(" | ")} |\n| ${cols.map(() => "------").join(" | ")} |\n`
}

function tableRow(cols: string[]) {
  return `| ${cols.join(" | ")} |\n`
}

const TYPE_DISPLAY: Record<string, string> = {
  int32: "int32",
  float32: "float32",
  float64: "float64",
  boolean: "boolean",
  string: "string",
  datetime: "datetime",
  date: "date",
  duration: "duration",
  uuid: "uuid",
  array: "array",
  set: "set",
  map: "map",
  literal: "literal",
  null: "null",
  unknown: "unknown",
}

function displayType(m: Models): string {
  if (m.kind === "literal") return JSON.stringify(m.value)

  if (m.kind === "array") return `${displayType(m.base)}[]`

  if (m.kind === "set") return `Set<${displayType(m.base)}>`

  if (m.kind === "map") return `Map<string, ${displayType(m.base)}>`

  if (m.kind === "enums") return `[${m.id}](#${m.id.toLowerCase()})`

  if (m.kind === "record") return `[${m.id}](#${m.id.toLowerCase()})`

  if (m.kind === "union") return `[${m.id}](#${m.id.toLowerCase()})`

  return TYPE_DISPLAY[m.kind] ?? m.kind
}

function recordFields(rec: RecordDescriptor): string {
  let md = ""

  md += tableHeader(["Field", "Type", "Required", "Default", "Description"])

  for (const f of rec.fields) {
    const type = displayType(f.model)

    const required = f.required ? "✅" : "—"

    const defval = fieldDefault(f.model)

    const desc = f.description ?? ""

    md += tableRow(["`" + f.name + "`", code(type), required, code(defval), desc])
  }

  return md
}

function fieldDefault(m: Models): string {
  if ("default" in m && m.default !== undefined) return String(m.default)

  return "—"
}

function responseBadge(status: number, model: Models | null, models: AnyNamedDescriptor[]) {
  if (model == null) return bold(`${status}`)

  if (model.kind === "array" || model.kind === "set") {
    const innerDisplay = displayType(model.base)

    if (isNamedModel(model.base, models)) {
      return bold(`${status}`) + ` ▶ [${innerDisplay}](#${modelId(model.base).toLowerCase()})[]`
    }

    return bold(`${status}`) + ` ▶ ${innerDisplay}[]`
  }

  const d = displayType(model)

  if (isNamedModel(model, models)) {
    return bold(`${status}`) + ` ▶ [${d}](#${modelId(model).toLowerCase()})`
  }

  return bold(`${status}`) + ` ▶ ${d}`
}

function modelId(m: Models): string {
  if ("id" in m) return m.id

  return ""
}

function isNamedModel(m: Models, models: AnyNamedDescriptor[]) {
  if (!("id" in m)) return false

  return models.some((d) => d.originalId === m.id)
}

function modelLink(id: string) {
  return `[${id}](#${id.toLowerCase()})`
}

function modelRow(m: AnyNamedDescriptor, schemas: Record<string, string>) {
  const name = camelCase(m.originalId)

  const hasSchema = schemas[`${name}.schema.json`]

  let md = `### ${m.originalId}\n`

  md += empty()

  if (m.description) md += quote(m.description) + empty()

  if (hasSchema) md += schemaLink(name)

  switch (m.kind) {
    case "record":
      if (m.deprecated) md += `> ⚠️ **Deprecated**\n\n`

      if (m.examples && m.examples.length > 0) {
        md += bold("Example:") + empty()

        md += "```json\n" + JSON.stringify(m.examples[0], null, 2) + "\n```\n\n"
      }

      md += recordFields(m as RecordDescriptor)

      break

    case "enums": {
      md += quote(`Enum — `)

      md += Object.values(m.values)
        .map((v) => code(v))
        .join(" ")

      md += empty()

      md += tableHeader(["Value", "Label"])

      for (const [label, value] of Object.entries(m.values)) {
        md += tableRow([code(value), label])
      }

      break
    }

    case "union": {
      md += quote(`Discriminator: ${code(m.discriminator)}`) + empty()

      md += tableHeader(["Variant", "Type"])

      for (const [key, variantModel] of Object.entries(m.variants)) {
        md += tableRow([code(key), displayType(variantModel)])
      }

      break
    }
  }

  md += empty()

  return md
}

// ── Server document ──

function generateServerDoc(
  info: ManifestOptions["info"],
  operations: OperationDescriptor[],
  models: AnyNamedDescriptor[],
  schemas: Record<string, string>,
): string {
  let md = ""

  md += h1(`${info.title} — Server`)

  md += empty()

  md += bold("Version") + `: ${info.version}` + empty()

  md += empty()

  if (info.description) {
    md += info.description + empty()

    md += empty()
  }

  md += "以下是所有 HTTP 路由及其请求/响应形状。" + empty()

  md += empty()

  const groups = new Map<string, OperationDescriptor[]>()

  for (const op of operations) {
    const list = groups.get(op.group) ?? []

    list.push(op)

    groups.set(op.group, list)
  }

  for (const [group, groupOps] of groups) {
    md += h2(`${group} — ${groupOps[0]?.groupDescription ?? ""}`)

    md += empty()

    for (const op of groupOps) {
      md += h3(`${op.method} ${op.path} — ${op.summary ?? ""}`)

      md += empty()

      if (op.description && op.description !== op.summary) {
        md += op.description + empty()

        md += empty()
      }

      if (op.deprecated) {
        md += `> ⚠️ **Deprecated**` + empty()

        md += empty()
      }

      const hasParams = Object.keys(op.pathVariables).length > 0

      const hasQuery = Object.keys(op.queries).length > 0

      const hasHeaders = Object.keys(op.headers).length > 0

      const hasBody = op.requestModel != null && op.requestModel.kind !== "null"

      if (hasParams) {
        md += h4("Params") + empty()

        md += tableHeader(["Name", "Type", "Required", "Description"])

        for (const [name, v] of Object.entries(op.pathVariables)) {
          md += tableRow([
            code(name),
            code(displayType(v.model)),
            "✅",
            v.model.description ?? "",
          ])
        }

        md += empty()
      }

      if (hasQuery) {
        md += h4("Query") + empty()

        md += tableHeader(["Name", "Type", "Required", "Description"])

        for (const [name, q] of Object.entries(op.queries)) {
          md += tableRow([
            code(name),
            code(displayType(q.model)),
            q.required ? "✅" : "—",
            q.model.description ?? "",
          ])
        }

        md += empty()
      }

      if (hasHeaders) {
        md += h4("Headers") + empty()

        md += tableHeader(["Name", "Type", "Required", "Description"])

        for (const [name, h] of Object.entries(op.headers)) {
          md += tableRow([
            code(name),
            code(displayType(h.model)),
            h.required ? "✅" : "—",
            h.model.description ?? "",
          ])
        }

        md += empty()
      }

      if (hasBody) {
        md += h4("Body") + empty()

        md += displayType(op.requestModel!) + empty()

        md += empty()
      }

      md += h4("Responses") + empty()

      for (const r of op.responses) {
        md += `- ${responseBadge(r.status, r.model, models)}` + empty()
      }

      md += empty()
    }
  }

  md += h2("Models") + empty()

  for (const m of models) {
    md += modelRow(m, schemas)
  }

  return md
}

// ── Client document ──

function generateClientDoc(
  info: ManifestOptions["info"],
  operations: OperationDescriptor[],
  models: AnyNamedDescriptor[],
  schemas: Record<string, string>,
): string {
  let md = ""

  md += h1(`${info.title} — Client`)

  md += empty()

  md += bold("Version") + `: ${info.version}` + empty()

  md += empty()

  if (info.description) {
    md += info.description + empty()

    md += empty()
  }

  md += "客户端所需的请求/响应类型和 URL 模式。" + empty()

  md += empty()

  const groups = new Map<string, OperationDescriptor[]>()

  for (const op of operations) {
    const list = groups.get(op.group) ?? []

    list.push(op)

    groups.set(op.group, list)
  }

  for (const [group, groupOps] of groups) {
    md += h2(group) + empty()

    for (const op of groupOps) {
      const fnName = camelCase(op.id)

      const hasParams = Object.keys(op.pathVariables).length > 0

      const hasQuery = Object.keys(op.queries).length > 0

      const hasBody = op.requestModel != null && op.requestModel.kind !== "null"

      let sig = `${fnName}(`

      const args: string[] = []

      if (hasParams) args.push(`params: { ${Object.keys(op.pathVariables).join(", ")} }`)

      if (hasQuery) args.push(`query?: { ${Object.keys(op.queries).join(", ")} }`)

      if (hasBody) args.push(`body: ${displayType(op.requestModel!)}`)

      sig += args.join(", ") + ")"

      md += h3(sig)

      md += empty()

      md += bold("URL") + `: ${code(op.path)}　|　` + bold("Method") + `: ${code(op.method)}` + empty()

      md += empty()

      if (op.summary || op.description) {
        md += (op.description && op.description !== op.summary ? op.description : op.summary) ?? ""

        md += empty()

        md += empty()
      }

      if (hasParams) {
        md += tableHeader(["Param", "Type", "Description"])

        for (const [name, v] of Object.entries(op.pathVariables)) {
          md += tableRow([code(name), code(displayType(v.model)), v.model.description ?? ""])
        }

        md += empty()
      }

      if (hasQuery) {
        md += tableHeader(["Query", "Type", "Required", "Description"])

        for (const [name, q] of Object.entries(op.queries)) {
          md += tableRow([
            code(name),
            code(displayType(q.model)),
            q.required ? "✅" : "—",
            q.model.description ?? "",
          ])
        }

        md += empty()
      }

      md += bold("Returns") + `: `

      const parts = op.responses.map((r) => responseBadge(r.status, r.model, models))

      md += parts.join(" | ") + empty()

      md += empty()
    }
  }

  md += h2("Models") + empty()

  for (const m of models) {
    md += modelRow(m, schemas)
  }

  return md
}

// ── Subscriber document ──

function generateSubscriberDoc(
  info: ManifestOptions["info"],
  brokers: BrokerModel[],
  models: AnyNamedDescriptor[],
  schemas: Record<string, string>,
): string {
  let md = ""

  md += h1(`${info.title} — Subscriber`)

  md += empty()

  md += bold("Version") + `: ${info.version}` + empty()

  md += empty()

  if (info.description) {
    md += info.description + empty()

    md += empty()
  }

  if (brokers.length === 0) {
    md += "No Pub/Sub brokers defined." + empty()

    md += empty()

    return md
  }

  md += "Pub/Sub 事件订阅者文档。每个 Broker 列出必须支持的协议和事件通道。" + empty()

  md += empty()

  for (const broker of brokers) {
    md += h2(broker.id) + empty()

    if (broker.description) {
      md += broker.description + empty()

      md += empty()
    }

    md += quote(
      `**必须同时实现 ${broker.protocols.map((p) => code(p)).join(" 和 ")} 协议适配**。运行时由部署者选择使用的协议。`,
    )

    md += empty()

    md += tableHeader(["Protocol", "Required"])

    for (const p of broker.protocols) {
      md += tableRow([code(p), "✅ 必须实现"])
    }

    md += empty()

    for (const [chName, ch] of Object.entries(broker.channels)) {
      md += h3(`${chName} — ${ch.description ?? ""}`)

      md += empty()

      if (ch.deprecated) {
        md += `> ⚠️ **Deprecated**` + empty()

        md += empty()
      }

      md += bold("Payload") + `: ${modelLink(modelId(ch.payload))}` + empty()

      md += empty()

      const schemaName = camelCase(modelId(ch.payload))

      if (schemaName && schemas[`${schemaName}.schema.json`]) {
        md += schemaLink(schemaName)
      }
    }
  }

  if (models.length > 0) {
    md += h2("Models") + empty()

    for (const m of models) {
      md += modelRow(m, schemas)
    }
  }

  return md
}
