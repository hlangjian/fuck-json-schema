import { resolve } from "pathe"
import { format } from "prettier"
import PrettierJavaPlugin from "prettier-plugin-java"

import { literal, type LiteralModel, type NamedModel, type TypeModels } from "@/type-system/basic"
import { collectModelDeep, collectModelFromRoutes, type HttpRouteModel } from "@/type-system/http"

export interface GenerateJavaClassOptions {
  package: string
  model: NamedModel
}

export function generateJavaClass(options: GenerateJavaClassOptions): string {
  const { model, package: packageName } = options

  switch (model.kind) {
    case "record":
      return `
            package ${packageName};

            import org.jspecify.annotations.NullMarked;

            @NullMarked
            public record ${model.id}(
                ${Object.entries(model.properties)
                  .filter(([_, v]) => v.kind !== "literal")
                  .map(([k, v]) => generatePropertyCode(packageName, k, v))}
            ){
                ${Object.entries(model.properties)
                  .filter(([__dirname, v]) => v.kind === "literal")
                  .map(([k, v]) =>
                    generateStaticPropertyCode(packageName, k, v as LiteralModel<string | number | boolean>),
                  )
                  .join(";")}
            }
        `

    case "union":
      return `
            package ${packageName};

            import org.jspecify.annotations.NullMarked;
            
            @NullMarked
            public sealed interface ${model.id}{
                ${Object.entries(model.variants)
                  .map(([k, v]) => generateUnionVariantCode(packageName, model.id, k, v))
                  .join("\n")}
            }
        `

    case "error":
      return `
            package ${packageName};

            import org.jspecify.annotations.NullMarked;

            @NullMarked
            public record ${model.id}(Context context){
                ${generateStaticPropertyCode(packageName, "code", literal({ value: model.code }))}

                public ${model.id}(
                    ${Object.entries(model.context ?? {})
                      .filter(([_, v]) => v.kind !== "literal")
                      .map(([k, v]) => generatePropertyCode(packageName, k, v))}
                ){
                    this(new Context(${getPropertyNames(model.context)}));
                }

                public record Context(
                    ${Object.entries(model.context ?? {})
                      .filter(([_, v]) => v.kind !== "literal")
                      .map(([k, v]) => generatePropertyCode(packageName, k, v))}
                ){
                    ${Object.entries(model.context ?? {})
                      .filter(([_, v]) => v.kind === "literal")
                      .map(([k, v]) =>
                        generateStaticPropertyCode(packageName, k, v as LiteralModel<string | number | boolean>),
                      )
                      .join(";")}
                }
            }
        `

    case "enums":
      return `
                    
            package ${packageName};

            import org.jspecify.annotations.NullMarked;

            public enum ${model.id} {

                ${Object.entries(model.variants).map(([k, v]) => `${k}("${v}")`)};
                
                private final String value;

                public ${model.id}(String value){
                    this.value = value;
                }

                @com.fasterxml.jackson.annotation.JsonValue
                public String getValue() { 
                    return value;
                }
            }
        `
  }
}

function getPropertyNames(properties?: { [key: string]: TypeModels }): string {
  if (properties == null) return ""
  return Object.keys(properties).join(",")
}

function generateUnionVariantCode(
  packageName: string,
  unionId: string,
  variantName: string,
  variant: TypeModels,
): string {
  switch (variant.kind) {
    case "literal":
      return `
            record ${variantName}() implements ${unionId} {
                @com.fasterxml.jackson.annotation.JsonValue
                ${generateStaticPropertyCode(packageName, "value", variant)}
            }
        `

    default:
      return `
            record ${variantName}(
                @com.fasterxml.jackson.annotation.JsonCreator
                @com.fasterxml.jackson.annotation.JsonValue
                ${generateModelSignature(packageName, variant)} value
            ) implements ${unionId} {}
        `
  }
}

function generatePropertyCode(packageName: string, name: string, property: TypeModels): string {
  return `${generateModelSignature(packageName, property)} ${name}`
}

function generateStaticPropertyCode(
  packageName: string,
  name: string,
  property: LiteralModel<string | number | boolean>,
): string {
  return `public ${generateModelSignature(packageName, property)} ${name} = ${generateStaticValue(property.value)}`
}

function generateStaticValue(value: string | number | boolean): string {
  switch (typeof value) {
    case "string":
      return `"${value}"`
    case "boolean":
      return String(value)
    case "number":
      return Number.isInteger(value) ? String(value) : value + "d"
    default:
      throw Error("Unsupported literal value")
  }
}

function generateModelSignature(packageName: string, model: TypeModels): string {
  switch (model.kind) {
    case "string":
      return "String"
    case "int32":
      return "int"
    case "int64":
      return "long"
    case "float32":
      return "float"
    case "float64":
      return "double"
    case "boolean":
      return "boolean"
    case "date":
      return "java.time.LocalDate"
    case "datetime":
      return "java.time.LocalDateTime"
    case "duration":
      return "java.time.Duration"
    case "array":
      return `Array<${generateModelSignature(packageName, model.base)}>`
    case "set":
      return `Set<${generateModelSignature(packageName, model.base)}>`
    case "map":
      return `Map<String, ${generateModelSignature(packageName, model.base)}>`
    case "optional":
      switch (model.base.kind) {
        case "int32":
          return "@Nullable Integer"
        case "int64":
          return "@Nullable Long"
        case "float32":
          return "@Nullable Float"
        case "float64":
          return "@Nullable Double"
        case "boolean":
          return "@Nullable Boolean"
        case "optional":
          return generateModelSignature(packageName, model.base)
        default:
          return `@Nullable ${generateModelSignature(packageName, model.base)}`
      }
    case "literal":
      switch (typeof model.value) {
        case "string":
          return "String"
        case "boolean":
          return "boolean"
        case "number":
          return Number.isInteger(model.value) ? "int" : "double"
        default:
          throw Error("Unsupported literal value")
      }
    default:
      return packageName + "." + model.id
  }
}

export async function formatJava(code: string): Promise<string> {
  try {
    return await format(code, {
      parser: "java",
      plugins: [PrettierJavaPlugin],
    })
  } catch (error) {
    console.error(error)
    return code
  }
}

export interface GenerateJavaOptions {
  package: string
  srcDir: string
  routes?: HttpRouteModel[]
  models?: TypeModels[]
}

export async function generateJavaCodes(options: GenerateJavaOptions): Promise<{ path: string; code: string }[]> {
  const { package: packageName, srcDir, routes = [], models = [] } = options

  const codes = new Map<string, string>()

  const namedModels = collectModelFromRoutes(routes)

  for (const model of models)
    for (const [id, subModel] of collectModelDeep(model)) {
      namedModels.set(id, subModel)
    }

  for (const [id, model] of namedModels) {
    if (model.kind !== "union" && model.kind !== "record" && model.kind !== "enums" && model.kind !== "error") continue

    const fullname = packageName + "." + id

    const path = resolve(srcDir, ...fullname.split("."), ".java")

    const code = await formatJava(generateJavaClass({ package: packageName, model }))

    codes.set(path, code)
  }

  return codes
    .entries()
    .map(([path, code]) => ({ path, code }))
    .toArray()
}
