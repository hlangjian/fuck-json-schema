import { resolve } from "pathe"
import { format } from "prettier"
import PrettierRustPlugin from "prettier-plugin-rust"

import {
  type EnumsModel,
  type ErrorModel,
  type LiteralModel,
  type RecordModel,
  type TypeModels,
  type UnionModel,
} from "@/type-system/basic"
import type { HttpRouteModel } from "@/type-system/http"
import { collectModelDeep, collectModelFromRoutes } from "@/type-system/http"

export interface GenerateRustCodeOptions {
  module_name: string
  model:
    | RecordModel<{ [key: string]: TypeModels }>
    | UnionModel<{ [key: string]: TypeModels }>
    | EnumsModel<{ [key: string]: string }>
    | ErrorModel<string, { [key: string]: TypeModels }>
}

export function generateRustCode(options: GenerateRustCodeOptions): string {
  const { model } = options

  switch (model.kind) {
    case "record":
      return generateRecordCode(model)
    case "union":
      return generateUnionCode(model)
    case "error":
      return generateErrorCode(model)
    case "enums":
      return generateEnumCode(model)
  }
}

function generateRecordCode(model: RecordModel<{ [key: string]: TypeModels }>): string {
  const structName = toPascalCase(model.id || "Unknown")
  const structFields = Object.entries(model.properties)
    .filter(([_, v]) => v.kind !== "literal")
    .map(([k, v]) => generateStructField(k, v))

  const constFields = Object.entries(model.properties)
    .filter(([_, v]) => v.kind === "literal")
    .map(([k, v]) => generateConstField(k, v as LiteralModel<string | number | boolean>))

  const hasConstants = constFields.length > 0
  const hasFields = structFields.length > 0

  let code = `use serde::Serialize;\n\n`

  if (hasConstants && hasFields) {
    code += `#[derive(Serialize)]\npub struct ${structName} {\n`
    structFields.forEach((f) => {
      code += `    ${f};\n`
    })
    code += `}\n\n`
    code += `impl ${structName} {\n`
    code += `    pub const CODE: &'static str = "${model.id}";\n`
    constFields.forEach((f) => {
      code += `    pub ${f};\n`
    })
    code += `}\n`
  } else if (hasFields) {
    code += `#[derive(Serialize)]\npub struct ${structName} {\n`
    structFields.forEach((f) => {
      code += `    ${f},\n`
    })
    code += `}\n`
  } else if (hasConstants) {
    code += `#[derive(Serialize)]\npub struct ${structName};\n\n`
    code += `impl ${structName} {\n`
    code += `    pub const CODE: &'static str = "${model.id}";\n`
    constFields.forEach((f) => {
      code += `    pub ${f};\n`
    })
    code += `}\n`
  }

  return code
}

function generateUnionCode(model: UnionModel<{ [key: string]: TypeModels }>): string {
  const enumName = toPascalCase(model.id || "Unknown")

  let code = `use serde::Serialize;\n\n`
  code += `#[derive(Serialize)]\n#[serde(tag = "type", content = "value")]\npub enum ${enumName} {\n`

  Object.entries(model.variants).forEach(([k, v]) => {
    const variantName = toPascalCase(k)
    if (v.kind === "literal") {
      code += `    ${variantName},\n`
    } else {
      const variantType = generateModelSignature(v)
      code += `    ${variantName}(${variantType}),\n`
    }
  })

  code += `}\n`
  return code
}

function generateErrorCode(model: ErrorModel<string, { [key: string]: TypeModels }>): string {
  const structName = toPascalCase(model.id || "Unknown")
  const contextFields = Object.entries(model.context ?? {})
    .filter(([_, v]) => v.kind !== "literal")
    .map(([k, v]) => generateStructField(k, v))

  const constFields = Object.entries(model.context ?? {})
    .filter(([_, v]) => v.kind === "literal")
    .map(([k, v]) => generateConstField(k, v as LiteralModel<string | number | boolean>))

  let code = `use serde::Serialize;\n\n`

  if (contextFields.length > 0 || constFields.length > 0) {
    code += `#[derive(Serialize)]\npub struct ${structName} {\n`
    code += `    pub code: &'static str,\n`
    if (contextFields.length > 0) {
      code += `    pub context: ${structName}Context,\n`
    }
    code += `}\n\n`

    if (contextFields.length > 0) {
      code += `#[derive(Serialize)]\npub struct ${structName}Context {\n`
      contextFields.forEach((f) => {
        code += `    ${f};\n`
      })
      code += `}\n\n`
    }

    code += `impl ${structName} {\n`
    code += `    pub const CODE: &'static str = "${model.code}";\n`
    constFields.forEach((f) => {
      code += `    pub ${f};\n`
    })
    code += `}\n`
  } else {
    code += `#[derive(Serialize)]\npub struct ${structName} {\n`
    code += `    pub code: &'static str,\n`
    code += `}\n\n`
    code += `impl ${structName} {\n`
    code += `    pub const CODE: &'static str = "${model.code}";\n`
    code += `}\n`
  }

  return code
}

function generateEnumCode(model: EnumsModel<{ [key: string]: string }>): string {
  const enumName = toPascalCase(model.id || "Unknown")

  let code = `use serde::Serialize;\n\n`
  code += `#[derive(Serialize, Debug, Clone, Copy, PartialEq, Eq)]\npub enum ${enumName} {\n`

  Object.entries(model.variants).forEach(([k, v]) => {
    const variantName = toUpperSnakeCase(k)
    code += `    #[serde(rename = "${v}")]\n`
    code += `    ${variantName},\n`
  })

  code += `}\n`
  return code
}

function generateStructField(name: string, property: TypeModels): string {
  const fieldName = toSnakeCase(name)
  const fieldType = generateModelSignature(property)
  return `pub ${fieldName}: ${fieldType}`
}

function generateConstField(name: string, property: LiteralModel<string | number | boolean>): string {
  const constName = toUpperSnakeCase(name)
  const constType = generateModelSignature(property)
  const constValue = generateStaticValue(property.value)
  return `const ${constName}: ${constType} = ${constValue}`
}

function generateStaticValue(value: string | number | boolean): string {
  switch (typeof value) {
    case "string":
      return `"${value}"`
    case "boolean":
      return String(value)
    case "number":
      return Number.isInteger(value) ? String(value) : `${value}.0`
    default:
      throw Error("Unsupported literal value")
  }
}

function generateModelSignature(model: TypeModels): string {
  switch (model.kind) {
    case "string":
      return "String"
    case "int32":
      return "i32"
    case "int64":
      return "i64"
    case "float32":
      return "f32"
    case "float64":
      return "f64"
    case "boolean":
      return "bool"
    case "date":
      return "chrono::NaiveDate"
    case "datetime":
      return "chrono::DateTime<chrono::Utc>"
    case "duration":
      return "serde_json::Value"
    case "array":
      return `Vec<${generateModelSignature(model.base)}>`
    case "set":
      return `Vec<${generateModelSignature(model.base)}>`
    case "map":
      return `std::collections::HashMap<String, ${generateModelSignature(model.base)}>`
    case "optional":
      return `Option<${generateModelSignature(model.base)}>`
    case "literal":
      switch (typeof model.value) {
        case "string":
          return "&str"
        case "boolean":
          return "bool"
        case "number":
          return Number.isInteger(model.value) ? "i64" : "f64"
        default:
          throw Error("Unsupported literal value")
      }
    default:
      return model.id ? toPascalCase(model.id) : "()"
  }
}

function toPascalCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ""))
    .replace(/^(.)/, (_, c) => (c ? c.toUpperCase() : ""))
}

function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, "_$1")
    .replace(/[-\s]+/g, "_")
    .replace(/^_/, "")
    .toLowerCase()
}

function toUpperSnakeCase(str: string): string {
  return toSnakeCase(str).toUpperCase()
}

export async function formatRust(code: string): Promise<string> {
  try {
    return await format(code, {
      parser: "jinx-rust",
      plugins: [PrettierRustPlugin],
    })
  } catch (error) {
    console.error(error)
    return code
  }
}

export interface GenerateRustOptions {
  module_name: string
  srcDir: string
  routes?: HttpRouteModel[]
  models?: TypeModels[]
}

export async function generateRustCodes(options: GenerateRustOptions): Promise<{ path: string; code: string }[]> {
  const { module_name, srcDir, routes = [], models = [] } = options

  const codes = new Map<string, string>()

  const namedModels = collectModelFromRoutes(routes)

  for (const model of models)
    for (const [id, subModel] of collectModelDeep(model)) {
      namedModels.set(id, subModel)
    }

  for (const [id, model] of namedModels) {
    if (model.kind !== "union" && model.kind !== "record" && model.kind !== "enums" && model.kind !== "error") continue

    const fullname = module_name + "::" + toSnakeCase(id)

    const path = resolve(srcDir, ...fullname.split("::"), ".rs")

    const code = await formatRust(generateRustCode({ module_name: fullname, model }))

    codes.set(path, code)
  }

  return codes
    .entries()
    .map(([path, code]) => ({ path, code }))
    .toArray()
}
