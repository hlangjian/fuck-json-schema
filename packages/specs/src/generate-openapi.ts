import type { ResponseModel, RouteModel, RouterModel, SimpleType } from "./api"
import { createOpenapiSchemaRegistry, buildJsonSchema, type SchemaRegistry, type ToJsonSchema } from "./generate-jsonschema"
import type { JsonSchema } from "./schemas/json-schema-draft-2020-12"
import type {
  ComponentsObject,
  InfoObject,
  MediaTypeObject,
  OpenAPIObject,
  OperationObject,
  ParameterObject,
  PathItemObject,
  PathsObject,
  RequestBodyObject,
  ResponseObject,
  SecurityRequirementObject,
  SecuritySchemeObject,
  ServerObject,
  TagObject,
} from "./schemas/openapi-schema"
import type {
  ApikeySecurityComponent,
  OpenIdSecurityComponent,
  SecurityComponent,
  SecurityPolicyModel,
} from "./security"
import type { OpenIdDeployment, SecurityDeployment } from "./deployment"
import type { Models, RecordModel } from "./types"

type AnyRouteModel = RouteModel<
  string,
  Record<string, SimpleType>,
  Models,
  RecordModel<Record<string, Models>, string>,
  RecordModel<Record<string, Models>, string>,
  Record<number, ResponseModel<Models, RecordModel<Record<string, Models>, string>>>
>

type AnyResponseModel = ResponseModel<Models, RecordModel<Record<string, Models>, string>>

export interface GenerateOpenapiOptions {
  info: InfoObject
  servers?: ServerObject[]
  routers: RouterModel[]
  security?: {
    policy?: SecurityPolicyModel
    deployments?: Record<string, SecurityDeployment>
  }
  toJsonSchema?: ToJsonSchema
}

interface FlatRoute {
  route: AnyRouteModel
  group: string
  fullPath: string
}

export interface GenerateOpenapiResult {
  openapi: OpenAPIObject
  registry: SchemaRegistry
}

function joinPath(basePath: string, routePath: string): string {
  if (!basePath) return routePath
  const base = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath
  const route = routePath.startsWith("/") ? routePath : `/${routePath}`
  return `${base}${route}`
}

export function generateOpenapi(options: GenerateOpenapiOptions): GenerateOpenapiResult {
  const { info, servers, routers, security, toJsonSchema } = options

  const flatRoutes: FlatRoute[] = routers.flatMap((router) =>
    Object.entries(router.routes).map(([_key, route]) => ({
      route,
      group: router.tag ?? router.id,
      fullPath: joinPath(router.basePath ?? "", route.path),
    })),
  )

  const namedModels = collectNamedModels(flatRoutes.map((fr) => fr.route))

  const registry = [...namedModels.entries()].reduce<SchemaRegistry>(
    (reg, [id, model]) => reg.add(id, model),
    createOpenapiSchemaRegistry(undefined, toJsonSchema),
  )

  const schemas = [...namedModels.entries()].reduce<Record<string, JsonSchema>>(
    (acc, [id, model]) => ({
      ...acc,
      [id]: buildJsonSchema({ model, registry, toJsonSchema }).jsonSchema,
    }),
    {} as Record<string, JsonSchema>,
  )

  const hasSchemas = Object.keys(schemas).length > 0

  const tags = routers.reduce<TagObject[]>((acc, router) => {
    const tagName = router.tag ?? router.id
    if (!acc.some((t) => t.name === tagName)) {
      const tag: TagObject = { name: tagName }
      if (router.description) tag.description = router.description
      acc.push(tag)
    }
    return acc
  }, [])

  const paths = generatePaths(flatRoutes, registry, toJsonSchema)

  let components: ComponentsObject | undefined = hasSchemas ? { schemas } : undefined

  if (security?.policy) {
    const schemeResult = buildSecuritySchemes(security.policy, security.deployments)
    if (schemeResult.schemes && Object.keys(schemeResult.schemes).length > 0) {
      components = { ...components, securitySchemes: schemeResult.schemes } as ComponentsObject
    }

    const securedPaths = applySecurityToPaths(paths, security.policy)
    if (securedPaths) {
      return {
        openapi: {
          openapi: "3.2.0",
          info,
          servers,
          paths: securedPaths,
          components,
          ...(tags.length > 0 ? { tags } : {}),
        },
        registry,
      }
    }
  }

  const openapi: OpenAPIObject = {
    openapi: "3.2.0",
    info,
    servers,
    paths,
    components,
    ...(tags.length > 0 ? { tags } : {}),
  }

  return { openapi, registry }
}

function collectNamedModels(routes: AnyRouteModel[]): Map<string, Models> {
  return routes.reduce<Map<string, Models>>((models, route) => {
    const fromRoute = collectModelsFromRoute(route)
    return [...fromRoute.entries()].reduce((acc, [id, model]) => {
      if (!acc.has(id)) acc.set(id, model)
      return acc
    }, models)
  }, new Map<string, Models>())
}

function collectModelsFromRoute(route: AnyRouteModel): Map<string, Models> {
  const sources: Models[] = [route.body, ...Object.values(route.responses).flatMap(collectModelsFromResponse)].filter(
    (m): m is Models => m != null,
  )

  return sources.reduce<Map<string, Models>>((acc, model) => {
    return collectModelDeep(model).reduce((inner, [id, m]) => {
      if (!inner.has(id)) inner.set(id, m)
      return inner
    }, acc)
  }, new Map<string, Models>())
}

function collectModelsFromResponse(response: AnyResponseModel): Models[] {
  switch (response.kind) {
    case "json-response":
    case "stream-response":
    case "sse-response":
      return response.body ? [response.body] : []

    case "binary":
      return []
  }
}

function collectModelDeep(model: Models): [string, Models][] {
  const self: [string, Models][] =
    typeof model === "object" && model !== null && "id" in model && model.id != null
      ? [[model.id as string, model]]
      : []

  const nested = collectNestedModels(model)

  return [...self, ...nested]
}

function collectNestedModels(model: Models): [string, Models][] {
  switch (model.kind) {
    case "array":
    case "set":
    case "map":
      return collectModelDeep(model.base)

    case "record":
      return Object.values(model.properties).flatMap(collectModelDeep)

    case "union":
      return Object.values(model.variants).flatMap(collectModelDeep)

    case "taggedUnion":
      return Object.values(model.variants).flatMap(collectModelDeep)

    default:
      return []
  }
}

function generatePaths(flatRoutes: FlatRoute[], registry: SchemaRegistry, toJsonSchema?: ToJsonSchema): PathsObject {
  return flatRoutes.reduce<Record<string, PathItemObject>>((paths, { route, group, fullPath }) => {
    const existing = paths[fullPath] ?? {}
    const method = route.method.toLowerCase() as keyof PathItemObject

    return {
      ...paths,
      [fullPath]: {
        ...existing,
        [method]: generateOperation(route, group, registry, toJsonSchema),
      },
    }
  }, {} as Record<string, PathItemObject>)
}

function generateOperation(route: AnyRouteModel, group: string, registry: SchemaRegistry, toJsonSchema?: ToJsonSchema): OperationObject {
  const tags = route.tags?.includes(group)
    ? route.tags
    : [...(route.tags ?? []), group]

  return {
    summary: route.summary,
    description: route.description,
    tags,
    parameters: generateParameters(route, registry, toJsonSchema),
    requestBody: generateRequestBody(route, registry, toJsonSchema),
    responses: generateResponses(route.responses, registry, toJsonSchema),
  }
}

function generateParameters(
  route: AnyRouteModel,
  registry: SchemaRegistry,
  toJsonSchema?: ToJsonSchema,
): ParameterObject[] | undefined {
  const pathParams = Object.entries(route.variables ?? {}).map(([name, model]) =>
    generateParameter(name, model, "path", true, registry, toJsonSchema),
  )

  const queries = route.queries
  const headers = route.headers

  const queryParams = queries
    ? Object.entries(queries.properties).map(([name, model]) =>
        generateParameter(name, model, "query", queries.required.includes(name as any), registry, toJsonSchema),
      )
    : []

  const headerParams = headers
    ? Object.entries(headers.properties).map(([name, model]) =>
        generateParameter(name, model, "header", headers.required.includes(name as any), registry, toJsonSchema),
      )
    : []

  const all = [...pathParams, ...queryParams, ...headerParams]

  return all.length > 0 ? all : undefined
}

function generateParameter(
  name: string,
  model: Models,
  location: "path" | "query" | "header" | "cookie",
  required: boolean,
  registry: SchemaRegistry,
  toJsonSchema?: ToJsonSchema,
): ParameterObject {
  return {
    name,
    in: location,
    required,
    schema: getSchema(model, registry, toJsonSchema),
  }
}

function generateRequestBody(
  route: AnyRouteModel,
  registry: SchemaRegistry,
  toJsonSchema?: ToJsonSchema,
): RequestBodyObject | undefined {
  if (route.body == null || route.body.kind === "null") return undefined

  const contentType = route.contentType ?? "application/json"

  return {
    content: {
      [contentType]: generateMediaType(route.body, registry, toJsonSchema),
    },
  }
}

function generateMediaType(model: Models, registry: SchemaRegistry, toJsonSchema?: ToJsonSchema): MediaTypeObject {
  return {
    schema: getSchema(model, registry, toJsonSchema),
  }
}

function generateResponses(
  responses: Record<number, AnyResponseModel>,
  registry: SchemaRegistry,
  toJsonSchema?: ToJsonSchema,
): Record<string, ResponseObject> {
  return Object.entries(responses).reduce<Record<string, ResponseObject>>(
    (acc, [status, response]) => ({
      ...acc,
      [status]: generateResponseObject(response, registry, toJsonSchema),
    }),
    {} as Record<string, ResponseObject>,
  )
}

function generateResponseObject(response: AnyResponseModel, registry: SchemaRegistry, toJsonSchema?: ToJsonSchema): ResponseObject {
  const description = response.summary ?? ""

  const headers =
    response.kind !== "binary" && response.headers
      ? generateResponseHeaders(response.headers, registry, toJsonSchema)
      : undefined

  const content = generateResponseContent(response, registry, toJsonSchema)

  return {
    description,
    headers,
    content,
  }
}

function generateResponseHeaders(
  headers: RecordModel<Record<string, Models>, string>,
  registry: SchemaRegistry,
  toJsonSchema?: ToJsonSchema,
): Record<string, { schema: JsonSchema }> {
  return Object.entries(headers.properties).reduce<Record<string, { schema: JsonSchema }>>(
    (acc, [name, model]) => ({
      ...acc,
      [name]: { schema: getSchema(model, registry, toJsonSchema) },
    }),
    {} as Record<string, { schema: JsonSchema }>,
  )
}

function generateResponseContent(
  response: AnyResponseModel,
  registry: SchemaRegistry,
  toJsonSchema?: ToJsonSchema,
): Record<string, MediaTypeObject> | undefined {
  switch (response.kind) {
    case "json-response": {
      if (response.body == null) return undefined

      const contentType = response.contentType ?? "application/json"

      const mediaType: MediaTypeObject = { schema: getSchema(response.body, registry, toJsonSchema) }

      return { [contentType]: mediaType }
    }

    case "stream-response": {
      if (response.body == null) return undefined

      const contentType = response.contentType ?? "application/x-ndjson"

      const mediaType: MediaTypeObject = {
        schema: { type: "string", format: "binary" },
        itemSchema: getSchema(response.body, registry, toJsonSchema),
      }

      return { [contentType]: mediaType }
    }

    case "sse-response": {
      const contentType = response.contentType ?? "text/event-stream"

      const itemSchema: JsonSchema = response.body
        ? getSchema(response.body, registry, toJsonSchema)
        : { type: "string" }

      const mediaType: MediaTypeObject = {
        schema: { type: "string", format: "binary" },
        itemSchema,
      }

      return { [contentType]: mediaType }
    }

    case "binary":
      return {
        [response.contentType ?? "application/octet-stream"]: {
          schema: { type: "string", format: "binary" },
        },
      }
  }
}

function getSchema(model: Models, registry: SchemaRegistry, toJsonSchema?: ToJsonSchema): JsonSchema {
  const ref = registry.getRef(model)
  return ref ? { $ref: ref } : buildJsonSchema({ model, registry, toJsonSchema }).jsonSchema
}

// ---- security helpers ----

function buildSecuritySchemes(
  policy: SecurityPolicyModel,
  deployments?: Record<string, SecurityDeployment>,
): { schemes: Record<string, SecuritySchemeObject> | undefined } {
  const components = collectSecurityComponents(policy)

  if (components.length === 0) return { schemes: undefined }

  const schemes: Record<string, SecuritySchemeObject> = {}

  for (const component of components) {
    switch (component.kind) {
      case "apikey":
        schemes[component.id] = toApiKeyScheme(component)
        break

      case "openIdConnect": {
        const deployment = findDeployment(component, deployments)
        if (!deployment || deployment.kind !== "openIdConnectDeployment") {
          console.warn(
            `[generateOpenapi] Security scheme "${component.id}" (openIdConnect) has no matching deployment, skipping`,
          )
          break
        }
        schemes[component.id] = toOpenIdConnectScheme(component, deployment)
        break
      }
    }
  }

  return { schemes: Object.keys(schemes).length > 0 ? schemes : undefined }
}

function findDeployment(
  component: SecurityComponent,
  deployments?: Record<string, SecurityDeployment>,
): SecurityDeployment | undefined {
  if (!deployments) return undefined
  for (const dep of Object.values(deployments)) {
    if (dep.component.id === component.id) return dep
  }
  return undefined
}

function toApiKeyScheme(component: ApikeySecurityComponent): SecuritySchemeObject {
  return {
    type: "apiKey",
    name: component.name,
    in: "header",
    description: component.description,
  }
}

function toOpenIdConnectScheme(
  component: OpenIdSecurityComponent,
  deployment: OpenIdDeployment,
): SecuritySchemeObject {
  const url = deployment.issuer.endsWith("/")
    ? `${deployment.issuer}.well-known/openid-configuration`
    : `${deployment.issuer}/.well-known/openid-configuration`

  return {
    type: "openIdConnect",
    openIdConnectUrl: url,
    description: component.description,
  }
}

function collectSecurityComponents(policy: SecurityPolicyModel): SecurityComponent[] {
  const seen = new Set<string>()
  const result: SecurityComponent[] = []

  for (const pathItem of Object.values(policy.paths)) {
    if (!pathItem.pipeline) continue
    for (const apply of pathItem.pipeline) {
      if (!seen.has(apply.component.id)) {
        seen.add(apply.component.id)
        result.push(apply.component)
      }
    }
  }

  return result
}

function applySecurityToPaths(
  paths: PathsObject | undefined,
  policy: SecurityPolicyModel,
): PathsObject | undefined {
  if (!paths) return undefined

  const operationMethods = ["get", "put", "post", "delete", "options", "head", "patch", "trace"] as const

  return Object.entries(paths).reduce<Record<string, PathItemObject>>((acc, [pathKey, pathItem]) => {
    const securedItem = operationMethods.reduce<PathItemObject>((methodAcc, method) => {
      const op = pathItem[method]
      if (!op) return methodAcc

      const requirements = resolveSecurityRequirements(policy, pathKey, method)
      if (requirements.length === 0) return methodAcc

      return { ...methodAcc, [method]: { ...op, security: requirements } }
    }, pathItem)

    return { ...acc, [pathKey]: securedItem }
  }, {} as Record<string, PathItemObject>)
}

function resolveSecurityRequirements(
  policy: SecurityPolicyModel,
  pathKey: string,
  method: string,
): SecurityRequirementObject[] {
  const requirements: SecurityRequirementObject[] = []

  for (const [pattern, pathItem] of Object.entries(policy.paths)) {
    if (!matchesPath(pattern, pathKey)) continue

    const methods = pathItem.methods
    if (methods && methods.length > 0 && !methods.includes(method.toUpperCase() as never)) continue

    if (!pathItem.pipeline) continue

    for (const apply of pathItem.pipeline) {
      requirements.push({ [apply.component.id]: apply.scopes })
    }
  }

  return requirements
}

function matchesPath(pattern: string, path: string): boolean {
  try {
    return new RegExp(pattern).test(path)
  } catch {
    return false
  }
}
