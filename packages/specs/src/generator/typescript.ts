import { resolve } from "pathe"
import { format } from "prettier"

import type { EnumsModel, ErrorModel, NamedModel, RecordModel, TypeModels, UnionModel } from "@/type-system/basic"
import { collectModelDeep, collectModelFromRoutes, type HttpRouteModel } from "@/type-system/http"

export interface GenerateTypescriptInterfaceOptions {
  model: NamedModel
}

export function generateTypescriptInterface(options: GenerateTypescriptInterfaceOptions): string {
  const { model } = options

  switch (model.kind) {
    case "enums":
      return generateTypescriptEnums(model)
    case "error":
      return generateTypescriptError(model)
    case "record":
      return generateTypescriptRecord(model)
    case "union":
      return generateTypescriptUnion(model)
  }
}

function generateTypescriptRecord(model: RecordModel<{ [key: string]: TypeModels }>): string {
  const properties: string[] = []

  for (const [key, property] of Object.entries(model.properties)) {
    properties.push(`${key}: ${property.kind === "optional" ? "?" : ""} ${generateSignature(property)}`)
  }

  return `
        export interface ${model.id} {
            ${properties.join("\n")}
        }
    `
}

function generateTypescriptUnion(model: UnionModel<{ [key: string]: TypeModels }>): string {
  const variants: string[] = []

  for (const [key, variant] of Object.entries(model.variants)) {
    variants.push(`| { [${key}]: ${generateSignature(variant)} }`)
  }

  return `export type ${model.id} = ${variants}`
}

function generateTypescriptEnums(model: EnumsModel<{ [key: string]: string }>): string {
  const variants: string[] = []

  for (const variant of Object.values(model.variants)) {
    variants.push(`| ${variant}`)
  }

  return `
        export type ${model.id} = ${variants}
    `
}

function generateTypescriptError(model: ErrorModel<string, { [key: string]: TypeModels }>): string {
  const properties: string[] = []

  for (const [key, property] of Object.entries(model.context ?? {})) {
    properties.push(`${key}:${property.kind === "optional" ? "?" : ""} ${generateSignature(property)}`)
  }

  return `
        export interface ${model.id} {
            code: ${model.code}
            context: {
                ${properties.join("\n")}
            }
        }
    `
}

// prettier-ignore
function generateSignature(model: TypeModels): string {
    switch(model.kind){
        case 'string': return 'string'
        case 'boolean': return 'boolean'
        case 'int32': return 'number'
        case 'int64': return 'string'
        case 'float32': return 'number'
        case 'float64': return 'number'
        case 'optional': return `${generateSignature(model.base)} | undefined | null` 
        case 'array': return `Array<${generateSignature(model.base)}>`
        case 'set': return `Set<${generateSignature(model.base)}>`
        case 'map': return `Map<string, ${generateSignature(model.base)}>`
        case 'date': return 'Temporal.Instant'
        case 'datetime': return 'Temporal.Instant'
        case 'duration': return 'Temporal.Duration'
        case 'literal': return typeof model.value === 'string'
            ? `"${model.value}"`
            : String(model)
        default: return model.id 
    }
}

export async function formatTypescript(code: string): Promise<string> {
  try {
    return await format(code, {
      parser: "typescript",
      semi: false,
    })
  } catch (error) {
    console.error(error)
    return code
  }
}

export interface GenerateTypescriptOptions {
  outputPath: string
  routes?: HttpRouteModel[]
  models?: TypeModels[]
}

export async function generateTypescriptCodes(
  options: GenerateTypescriptOptions,
): Promise<{ path: string; code: string }[]> {
  const { outputPath, routes = [], models = [] } = options

  const codes = new Map<string, string>()

  const namedModels = collectModelFromRoutes(routes)

  for (const model of models)
    for (const [id, subModel] of collectModelDeep(model)) {
      namedModels.set(id, subModel)
    }

  const interfaces: string[] = []

  for (const [, model] of namedModels) {
    if (model.kind !== "union" && model.kind !== "record" && model.kind !== "enums" && model.kind !== "error") continue
    const code = generateTypescriptInterface({ model })
    interfaces.push(code)
  }

  codes.set(resolve(outputPath), await formatTypescript(interfaces.join("\n")))

  return codes
    .entries()
    .map(([path, code]) => ({ path, code }))
    .toArray()
}
