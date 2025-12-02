import { type HttpMethod, type Model, type RoutesModel, type SecurityModel, type SecurityProvider } from "@huanglangjian/schema"
import type { InfoObject, OpenAPIObject, OperationObject, ParameterObjectAsContent, PathItemObject, PathsObject, ResponseObject, SecurityRequirementObject, SecuritySchemeObject, ServerObject, TagObject } from "./openapi-schema"
import { createJsonSchema, type JsonSchemaObject } from '@huanglangjian/json-schema-generator'
import equal from "fast-deep-equal"
import { normalizePath, deepMergeAll } from "utils"

export interface CreateOpenapiOptional {
    info: InfoObject
    routes?: RoutesModel[]
    servers?: ServerObject[]
    tags?: TagObject[]
    securities?: { [key: string]: SecurityProvider }
    sortModel?: (first: string, second: string) => number
}

export function createOpenapi(optional: CreateOpenapiOptional): OpenAPIObject {

    const { info, routes = [], servers, tags: externalTags = [], securities = {}, sortModel } = optional

    const tags: TagObject[] = [...externalTags]

    for (const route of routes) if (route.summary != null) tags.push({ name: route.summary, description: route.description })

    const models = getModels(routes)

    const schemas = new Map<string, JsonSchemaObject>()

    const securityList = Object.entries(securities).map(([name, security]) => ({ name, security }))

    const parseJsonSchema = (model: Model): JsonSchemaObject => {

        if ('id' in model && schemas.has(model.id)) return schemas.get(model.id)!

        const schema = createJsonSchema({ model, defines: models, refPrefix: '#/components/schemas/' })

        const { $defs, ...rest } = schema

        if ('id' in model) schemas.set(model.id, rest)

        if ('base' in model) parseJsonSchema(model.base)

        if ('properties' in model) for (const property of Object.values(model.properties)) {
            parseJsonSchema(property)
        }

        if ('variants' in model) for (const variant of Object.values(model.variants)) {
            // if (model.kind !== 'enums') parseJsonSchema(variant)
        }

        return rest
    }

    const parseSecurity = (securityGroups: SecurityModel[][]) => {
        const securityObjects: SecurityRequirementObject[] = []

        for (const group of securityGroups) {

            const requirement: SecurityRequirementObject = {}

            for (const security of group) {
                if (security.kind === 'apikey' || security.kind === 'http') {
                    const define = securityList.find(o => o.security === security)
                    if (define == null) console.warn('security not found')
                    else requirement[define.name] = []
                }

                else if (security.kind === 'oauth2') {
                    const define = securityList.find(o =>
                        o.security.kind !== 'apikey'
                        && o.security.kind !== 'http'
                        && o.security.define === security.define)

                    if (define == null) console.warn('security not found')
                    else requirement[define.name] = security.scopes
                }

                else {
                    const define = securityList.find(o => o.security.kind === 'openid-provider' && o.security.define === security)
                    if (define == null) console.warn('security not found')
                    else requirement[define.name] = []
                }
            }

            securityObjects.push(requirement)
        }

        return securityObjects
    }


    const paths = parseRoutes(parseJsonSchema, parseSecurity, routes)

    return {
        openapi: '3.1.0',
        info,
        paths,
        components: {
            schemas: Object.fromEntries(sortModel ? [...schemas.entries()].sort((a, b) => sortModel(a[0], b[0])) : schemas),
            securitySchemes: parseSecurityComponents(securities),
        },
        tags,
        servers,
    }
}

function getModels(routes: RoutesModel[]): { [key: string]: Model } {
    const map = new Map<string, Model>()

    const resolve = (model: Model | undefined | null) => {
        if (model == null) return

        if (model.kind === 'record' || model.kind === 'tagged-union') {
            const cache = map.get(model.id)

            if (cache != null && model !== cache && !equal(model, cache)) {
                console.warn(`duplicate model id '${model.id}'`)
                return
            }

            map.set(model.id, model)

            if (model.kind === 'record') for (const property of Object.values(model.properties)) {
                resolve(property)
            }

            else if (model.kind === 'tagged-union') for (const variant of Object.values(model.variants)) {
                resolve(variant)
            }

            // else if (model.kind === 'enums') resolve(model.base)

            return
        }

        if ('base' in model) return resolve(model.base)
    }

    for (const route of routes) {

        for (const operation of Object.values(route.operations)) {

            if (operation.pathParams) for (const parameter of Object.values(operation.pathParams)) {
                resolve(parameter)
            }

            if (operation.queryParams) for (const parameter of Object.values(operation.queryParams)) {
                resolve(parameter)
            }

            if (operation.headerParams) for (const parameter of Object.values(operation.headerParams)) {
                resolve(parameter)
            }

            for (const response of Object.values(operation.responses)) {
                if (response.headers) for (const parameter of Object.values(response.headers)) {
                    resolve(parameter)
                }
            }
        }
    }

    return Object.fromEntries(map)
}

function parseRoutes(
    parseJsonschema: (model: Model) => JsonSchemaObject,
    parseSecurity: (securityGroups: SecurityModel[][]) => SecurityRequirementObject[],
    routes: RoutesModel[]
): PathsObject {

    const pathsMap = new Map<string, PathItemObject>()

    for (const route of routes) {

        const methods = new Map<string, Map<HttpMethod, OperationObject[]>>()

        for (const [summary, operation] of Object.entries(route.operations ?? {})) {

            const parameters = [] as ParameterObjectAsContent[]

            let content: Model[] = []

            if (operation.pathParams) for (const [parameterName, parameter] of Object.entries(operation.pathParams)) {
                parameters.push({
                    name: parameterName,
                    in: 'path',
                    required: true,
                    content: {
                        'application/json': {
                            schema: parseJsonschema(parameter)
                        }
                    }
                })
            }

            if (operation.queryParams) for (const [parameterName, parameter] of Object.entries(operation.queryParams)) {
                parameters.push({
                    name: parameterName,
                    in: 'query',
                    required: parameter.kind === 'optional',
                    content: {
                        'application/json': {
                            schema: parseJsonschema(parameter)
                        }
                    }
                })
            }

            if (operation.headerParams) for (const [parameterName, parameter] of Object.entries(operation.headerParams)) {
                parameters.push({
                    name: parameterName,
                    in: 'header',
                    required: parameter.kind === 'optional',
                    content: {
                        'application/json': {
                            schema: parseJsonschema(parameter)
                        }
                    }
                })
            }

            if (operation.content) content.push(operation.content)

            const responseMap = new Map<number, ResponseObject>()

            if (operation.responses) for (const [responseName, response] of Object.entries(operation.responses)) {

                const headerMap = new Map<string, { schema: JsonSchemaObject }>()

                const content = [] as Model[]

                if (response.headers) for (const [parameterName, parameter] of Object.entries(response.headers)) {
                    headerMap.set(parameterName, {
                        schema: parseJsonschema(parameter)
                    })
                }

                if (response.content) content.push(response.content)

                if (content.length > 1) throw Error('cannot set multiple content')

                if (responseMap.has(response.status)) throw Error(`duplicate response status ${response.status} ${responseName}`)

                responseMap.set(response.status, {
                    description: response.description ?? '',
                    headers: headerMap.size > 0 ? Object.fromEntries(headerMap) : undefined,
                    content: content.length > 0 ? { [response.contentType ?? 'application/json']: { schema: parseJsonschema(content[0]) } } : undefined,
                })
            }

            const requestBody: OperationObject['requestBody'] = content.length === 0 ? undefined : {
                content: { [operation.contentType]: { schema: parseJsonschema(content[0]) } }
            }

            const operationObject: OperationObject = {
                summary: operation.summary ?? summary,
                description: operation.description,
                tags: [...new Set([...route.tags ?? [], ...operation.tags ?? []])],
                parameters: [...parameters.values()],
                requestBody,
                responses: Object.fromEntries(responseMap),
                deprecated: operation.deprecated,
                security: operation.security ? parseSecurity(operation.security) : undefined,
            }

            const normalizeOperationPath = normalizePath(operation.path)

            const methodsInPath = new Map(methods.get(normalizeOperationPath))

            const newMethodInPath = methodsInPath.set(operation.method, [...methodsInPath.get(operation.method) ?? [], operationObject])

            methods.set(normalizeOperationPath, newMethodInPath)
        }

        for (const [operationPath, methodsInPath] of methods) {

            const routePath = normalizePath([route.path, operationPath].join('/'))

            if (pathsMap.has(routePath)) throw Error(`duplicate route path ${routePath}`)

            const pathItemObject: PathItemObject = Object.fromEntries(
                [...methodsInPath].map(([method, operations]) => [method.toLowerCase(), deepMergeAll(operations)])
            )

            pathsMap.set(routePath, pathItemObject)
        }
    }

    return Object.fromEntries(pathsMap)
}

function parseSecurityComponents(providers: { [key: string]: SecurityProvider }): {
    [key: string]: SecuritySchemeObject
} {
    const ret: { [key: string]: SecuritySchemeObject } = {}

    for (const [name, provider] of Object.entries(providers)) {
        if (provider.kind === 'apikey') ret[name] = {
            type: 'apiKey',
            in: provider.in,
            name: provider.name,
            description: provider.description
        }

        if (provider.kind === 'http') ret[name] = {
            type: 'http',
            scheme: provider.schema,
            bearerFormat: provider.bearerFormat,
            description: provider.description,
        }

        if (provider.kind === 'authorization-code-provider') ret[name] = {
            type: 'oauth2',
            flows: {
                authorizationCode: {
                    authorizationUrl: provider.authorizationUrl,
                    tokenUrl: provider.tokenUrl,
                    refreshUrl: provider.refreshUrl,
                    scopes: provider.define.scopes,
                }
            },
            description: provider.description
        }

        if (provider.kind === 'client-credentials-provider') ret[name] = {
            type: 'oauth2',
            flows: {
                clientCredentials: {
                    tokenUrl: provider.tokenUrl,
                    scopes: provider.define.scopes,
                }
            },
            description: provider.description
        }

        if (provider.kind === 'password-credentials-provider') ret[name] = {
            type: 'oauth2',
            flows: {
                password: {
                    tokenUrl: provider.tokenUrl,
                    refreshUrl: provider.refreshUrl,
                    scopes: provider.define.scopes,
                }
            },
            description: provider.description
        }

        if (provider.kind === 'openid-provider') ret[name] = {
            type: 'openIdConnect',
            openIdConnectUrl: provider.openIdConnectUrl,
            description: provider.description,
        }
    }

    return ret
}