import type { Simplify } from "type-fest"

import type { JsonSchema } from "@/schemas/json-schema-draft-2020-12"
import type {
  HeaderObject,
  MediaTypeObject,
  OpenAPIObject,
  OperationObject,
  ParameterObjectAsSchema,
  PathItemObject,
  PathsObject,
  RequestBodyObject,
  ResponseObject,
} from "@/schemas/openapi-schema"
import { type ExtractPathParams } from "@/utils"

import {
  generateJsonSchema,
  type BooleanModel,
  type Int32Model,
  type Int64Model,
  type LiteralModel,
  type Optionalize,
  type OptionalModel,
  type RecordModel,
  type StringModel,
  type TypeModels,
} from "./basic"

export type AllowedHttpValue =
  | StringModel
  | Int32Model
  | Int64Model
  | BooleanModel
  | LiteralModel<string | number | boolean>
  | Optionalize<StringModel | Int32Model | Int64Model | BooleanModel | LiteralModel<string | number | boolean>>

export type PartialOf<T extends { [key: string]: any }, K extends keyof T> = Simplify<
  { [key in Exclude<keyof T, K>]: T[key] } & { [key in K]?: T[key] }
>

export interface GenerateOpenapiOptions {
  info: OpenAPIObject["info"]
  routes: HttpRouteModel[]
  securitySchemes?: NonNullable<OpenAPIObject["components"]>["securitySchemes"]
  tags?: OpenAPIObject["tags"]
  servers?: OpenAPIObject["servers"]
}

export function generateOpenapi(options: GenerateOpenapiOptions): OpenAPIObject {
  const { info, routes, securitySchemes, tags, servers } = options

  const models = collectModelFromRoutes(routes)

  return {
    openapi: "3.2.0",
    info,
    paths: generatePathsObject(routes),
    components: {
      schemas: Object.fromEntries(generateComponentSchemasFromModels(models)),
      securitySchemes,
    },
    tags,
    servers,
  }
}

export function collectModelFromRoutes(routes: HttpRouteModel[]): Map<string, TypeModels> {
  const models = new Map<string, TypeModels>()

  for (const route of routes)
    for (const [id, model] of collectModelsFromRoute(route)) {
      models.set(id, model)
    }

  return models
}

export function collectModelDeep(model: TypeModels): Map<string, TypeModels> {
  const ret = new Map<string, TypeModels>()

  if (model.id != null) ret.set(model.id, model)

  switch (model.kind) {
    case "optional":
    case "array":
    case "set":
    case "map": {
      for (const [id, nestModel] of collectModelDeep(model.base)) {
        ret.set(id, nestModel)
      }

      return ret
    }

    case "record": {
      for (const property of Object.values(model.properties))
        for (const [id, nestedModel] of collectModelDeep(property)) {
          ret.set(id, nestedModel)
        }

      return ret
    }

    case "union": {
      for (const variant of Object.values(model.variants))
        for (const [id, nestedModel] of collectModelDeep(variant)) {
          ret.set(id, nestedModel)
        }

      return ret
    }

    case "error": {
      if (model.context)
        for (const detail of Object.values(model.context)) {
          for (const [id, nestedModel] of collectModelDeep(detail)) ret.set(id, nestedModel)
        }

      return ret
    }

    default:
      return ret
  }
}

function collectModelsFromRoute(route: HttpRouteModel): Map<string, TypeModels> {
  const models = new Map<string, TypeModels>()

  for (const model of [route.variables, route.queries, route.headers, route.cookies]
    .filter((o) => !!o)
    .flatMap(Object.values)) {
    for (const [id, subModel] of collectModelDeep(model)) {
      models.set(id, subModel)
    }
  }

  if (route.content)
    for (const [id, subModel] of collectModelsFromContent(route.content)) {
      models.set(id, subModel)
    }

  if (route.responses)
    for (const response of Object.values(route.responses)) {
      for (const [id, subModel] of collectModelsFromResponse(response)) {
        models.set(id, subModel)
      }
    }

  return models
}

function collectModelsFromContent(content: HttpContentModel): Map<string, TypeModels> {
  const models = new Map<string, TypeModels>()

  if (content.kind !== "binary-stream-content") {
    if (content.model)
      for (const [id, subModel] of collectModelDeep(content.model)) {
        models.set(id, subModel)
      }
  }

  return models
}

function collectModelsFromResponse(response: HttpResponseModel): Map<string, TypeModels> {
  const models = new Map<string, TypeModels>()

  for (const model of [response.cookies, response.headers].filter((o) => !!o).flatMap(Object.values)) {
    for (const [id, subModel] of collectModelDeep(model)) {
      models.set(id, subModel)
    }
  }

  if (response.content)
    for (const [id, subModel] of collectModelsFromContent(response.content)) {
      models.set(id, subModel)
    }

  return models
}

function generateComponentSchemasFromModels(models: Map<string, TypeModels>): Map<string, JsonSchema> {
  const ret = new Map<string, JsonSchema>()

  for (const [id, model] of models) {
    const schema = generateJsonSchema({ model, reference: "openapi" })
    ret.set(id, schema)
  }

  return ret
}

function generatePathsObject(routes: HttpRouteModel[]): PathsObject {
  const pathItems = new Map<string, PathItemObject>()

  for (const route of routes) {
    const item = pathItems.get(route.path) ?? {}

    pathItems.set(route.path, { ...item, ...generatePathItemObject(route) })
  }

  return Object.fromEntries(pathItems)
}

function generatePathItemObject(route: HttpRouteModel): PathItemObject {
  return { [route.method as "get"]: generateOperationObject(route) }
}

function getSchemaReference(model: TypeModels) {
  return model.id != null
    ? { $ref: "#/components/schemas/" + model.id }
    : generateJsonSchema({ model, reference: "openapi" })
}

function generateOperationObject(route: HttpRouteModel): OperationObject {
  const { id, summary, description, variables, queries, headers, cookies, content, responses } = route

  const parameterObjects: ParameterObjectAsSchema[] = []

  for (const [name, model] of Object.entries(variables)) {
    parameterObjects.push({ in: "path", name, required: true, schema: getSchemaReference(model) })
  }

  if (queries)
    for (const [name, model] of Object.entries(queries)) {
      parameterObjects.push({
        in: "query",
        name,
        required: model.kind !== "optional",
        schema: getSchemaReference(model),
      })
    }

  if (headers)
    for (const [name, model] of Object.entries(headers)) {
      parameterObjects.push({
        in: "header",
        name,
        required: model.kind !== "optional",
        schema: getSchemaReference(model),
      })
    }

  if (cookies)
    for (const [name, model] of Object.entries(cookies)) {
      parameterObjects.push({
        in: "cookie",
        name,
        required: model.kind !== "optional",
        schema: getSchemaReference(model),
      })
    }

  const responseObjects = new Map<string, ResponseObject>()

  if (responses)
    for (const [name, response] of Object.entries(responses)) {
      responseObjects.set(response.status.toString(), generateResponseObjectFromResponse(name, response))
    }

  return {
    operationId: id,
    summary: summary ?? route.id,
    description,
    parameters: parameterObjects,
    responses: Object.fromEntries(responseObjects),
    requestBody: content == null ? undefined : generateRequestBodyObject(content),
  }
}

function generateRequestBodyObject(content: HttpContentModel): RequestBodyObject {
  switch (content.kind) {
    case "plain-text-content":
    case "json-content":
    case "form-content":
      return {
        content: { [content.type]: generateMeidaTypeObject(content) },
      }

    default:
      return {
        description: content.description,
        content: { [content.type]: generateMeidaTypeObject(content) },
      }
  }
}

function generateMeidaTypeObject(content: HttpContentModel): MediaTypeObject {
  switch (content.kind) {
    case "plain-text-content":
      return {
        schema: content.model ? getSchemaReference(content.model) : { type: "string" },
      }

    case "plain-text-stream-content":
      return {
        schema: { type: "string", format: "binary" },
        itemSchema: content.model ? getSchemaReference(content.model) : { type: "string" },
      }

    case "json-content":
      return {
        schema: getSchemaReference(content.model),
      }

    case "json-stream-content":
      return {
        schema: { type: "string", format: "binary" },
        itemSchema: getSchemaReference(content.model),
      }

    case "binary-stream-content":
      return {
        schema: { type: "string", format: "binary" },
        itemSchema: { type: "string", format: "binary" },
      }

    case "form-content":
      return {
        schema: getSchemaReference(content.model),
      }
  }
}

function generateResponseObjectFromResponse(name: string, response: HttpResponseModel): ResponseObject {
  const headerObjects = new Map<string, HeaderObject>()

  if (response.headers)
    for (const [name, model] of Object.entries(response.headers)) {
      headerObjects.set(name, { schema: getSchemaReference(model), required: model.kind !== "optional" })
    }

  return {
    description: response.description ?? name,
    headers: headerObjects.size > 0 ? Object.fromEntries(headerObjects) : undefined,
    content:
      response.content == null ? undefined : { [response.content.type]: generateMeidaTypeObject(response.content) },
  }
}

export interface HttpResponseModel {
  status: number
  description?: string
  content?: HttpContentModel
  headers?: { [key: string]: AllowedHttpValue | OptionalModel<AllowedHttpValue> }
  cookies?: { [key: string]: AllowedHttpValue | OptionalModel<AllowedHttpValue> }
}

export interface HttpRouteModel<Path extends string = string> {
  kind: "http-route"
  id: string
  path: Path
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS" | "HEAD" | "TRACE"
  description?: string
  summary?: string
  variables: { [key in ExtractPathParams<Path>]: AllowedHttpValue }
  queries?: { [key: string]: AllowedHttpValue | OptionalModel<AllowedHttpValue> }
  cookies?: { [key: string]: AllowedHttpValue | OptionalModel<AllowedHttpValue> }
  headers?: { [key: string]: AllowedHttpValue | OptionalModel<AllowedHttpValue> }
  content?: HttpContentModel
  responses?: { [key: string]: HttpResponseModel }
  tags?: string[]
  security?: { [key: string]: string[] }
}

export interface HttpRouteModelOptions<Path extends string> extends Omit<HttpRouteModel<Path>, "kind"> {}

export function route<const Path extends string>(options: HttpRouteModelOptions<Path>): HttpRouteModel<Path> {
  return { kind: "http-route", ...options }
}

export interface PlainTextContentModel {
  kind: "plain-text-content"
  type: PlainTextLikeContentType
  model?: StringModel
}

export interface PlainTextContentOptions extends Omit<PlainTextContentModel, "kind"> {}

export function plainText(options: PlainTextContentOptions): PlainTextContentModel {
  return { kind: "plain-text-content", ...options }
}

export interface JsonContentModel {
  kind: "json-content"
  type: JsonLikeContentType
  model: TypeModels
}

export interface JsonContentOptions extends Omit<JsonContentModel, "kind"> {}

export function json(options: JsonContentOptions): JsonContentModel {
  return { kind: "json-content", ...options }
}

export interface PlainTextStreamContentModel {
  kind: "plain-text-stream-content"
  type: PlainTextLikeContentType
  model?: StringModel
  description?: string
}

export interface PlainTextStreamContentOptions extends Omit<PlainTextStreamContentModel, "kind"> {}

export function plainTextStream(options: PlainTextStreamContentOptions): PlainTextStreamContentModel {
  return { kind: "plain-text-stream-content", ...options }
}

export interface JsonStreamContentModel {
  kind: "json-stream-content"
  type: JsonStreamLikeContentType
  model: TypeModels
  description?: string
}

export interface JsonStreamContentOptions extends Omit<JsonStreamContentModel, "kind"> {}

export function jsonStream(options: JsonStreamContentOptions): JsonStreamContentModel {
  return { kind: "json-stream-content", ...options }
}

export interface BinaryStreamContentModel {
  kind: "binary-stream-content"
  type: BinaryLikeContentType
  description?: string
}

export interface BinaryStreamContentOptions extends Omit<BinaryStreamContentModel, "kind"> {}

export function binary(options: BinaryStreamContentOptions): BinaryStreamContentModel {
  return { kind: "binary-stream-content", ...options }
}

export interface FormContentModel<T extends { [key: string]: AllowedHttpValue | OptionalModel<AllowedHttpValue> }> {
  kind: "form-content"
  type: FormLikeContentType
  model: RecordModel<T>
}

export interface FormContentOptions<T extends { [key: string]: AllowedHttpValue }> extends Omit<
  FormContentModel<T>,
  "kind"
> {}

export function form<T extends { [key: string]: AllowedHttpValue }>(
  options: FormContentOptions<T>,
): FormContentModel<T> {
  return { kind: "form-content", ...options }
}

export type HttpContentModel =
  | PlainTextContentModel
  | JsonContentModel
  | PlainTextStreamContentModel
  | JsonStreamContentModel
  | BinaryStreamContentModel
  | FormContentModel<{ [key: string]: AllowedHttpValue }>

export type PlainTextLikeContentType =
  | (string & {})
  | "text/plain"
  | "text/html"
  | "text/css"
  | "text/xml"
  | "text/markdown"
  | "text/csv"

export type JsonLikeContentType =
  | (string & {})
  | "application/json"
  | "application/json; charset=utf-8"
  | "application/ld+json"
  | "application/hal+json"
  | "application/vnd.api+json"
  | "application/problem+json"
  | "application/schema+json"

export type PlainTextStreamLikeContentType = (string & {}) | "text/event-stream"

export type JsonStreamLikeContentType =
  | (string & {})
  | "application/ndjson"
  | "application/x-ndjson"
  | "application/jsonl"
  | "application/json-seq"
  | "application/stream+json"

export type BinaryLikeContentType =
  | (string & {})
  | "application/octet-stream"
  | "application/pdf"
  | "application/zip"
  | "application/gzip"
  | "image/jpeg"
  | "image/png"
  | "image/gif"
  | "image/webp"
  | "image/svg+xml"
  | "audio/mpeg"
  | "audio/wav"
  | "video/mp4"
  | "video/webm"

export type FormLikeContentType = (string & {}) | "application/x-www-form-urlencoded" | "multipart/form-data"
