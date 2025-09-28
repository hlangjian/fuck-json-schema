import type { OpenAPIObject, OperationObject, ParameterObjectAsContent, PathItemObject, PathsObject, ResponseObject, SecurityRequirementObject, SecuritySchemeObject } from "./openapi-shema";
import type { ResourceModel } from "./api";
import { isCustomModel, type CustomModel, type Model } from "./model";
import type { HttpMethod } from "./net-types";
import { allOf, type AllOfSecurity, type BasicSecurityModel, type SecurityModel } from "./security";
import { deepMergeAll, normalizePath } from "./utils";
import type { JsonSchemaObject } from "./json-schema";

export interface OpenapiOptions {
    title: string
    version: string
    resources: ResourceModel<string>[]
}

export function createOpenapi(options: OpenapiOptions): OpenAPIObject {

    const { title, version, resources } = options

    const components = getComponents(resources)

    const { parseJsonschema, componentsMap } = parseComponentSchema(components, resources)

    const securities = getSecurities(resources)

    return {
        openapi: '3.1.0',
        info: { title, version },
        paths: parseResources(parseJsonschema, resources),
        components: {
            schemas: Object.fromEntries(componentsMap),
            securitySchemes: parseSecurities(securities),
        }
    }
}

function getComponents(resources: ResourceModel<string>[]): Map<CustomModel, string> {

    const map = new Map<CustomModel, string>()

    const setModel = (model: Model) => {
        if (isCustomModel(model) && map.has(model)) return
        if (isCustomModel(model)) {
            if (map.values().some(o => o === model.id)) throw Error(`Duplicate model id ${model.id}`)
            map.set(model, model.id)
        }
    }

    for (const resource of resources) {
        for (const parameter of Object.values(resource.parameters)) {
            setModel(parameter)
        }

        for (const route of Object.values(resource.routes)) {

            for (const parameter of Object.values(route.parameter)) {
                setModel(parameter)
            }

            for (const operation of Object.values(route.operations)) {

                if (operation.query) for (const parameter of Object.values(operation.query)) {
                    setModel(parameter)
                }

                if (operation.header) for (const parameter of Object.values(operation.header)) {
                    setModel(parameter)
                }

                if (operation.content) {
                    setModel(operation.content)
                }

                if (operation.responses) for (const response of Object.values(operation.responses)) {

                    if (response.header) for (const parameter of Object.values(response.header)) {
                        setModel(parameter)
                    }

                    if (response.content) {
                        setModel(response.content)
                    }
                }
            }
        }
    }

    return map
}

function getSecurities(resources: ResourceModel<string>[]): BasicSecurityModel[] {

    const map = new Map<string, BasicSecurityModel>()

    const setModel = (security: SecurityModel) => {
        if (security.kind === 'all-of-security' || security.kind === 'one-of-security') {
            for (const subsecurity of security.securities) setModel(subsecurity)
        }
        else map.set(security.id, security)
    }

    for (const resource of resources) {

        if (resource.security) setModel(resource.security)

        for (const route of Object.values(resource.routes)) {

            for (const operation of Object.values(route.operations)) {
                if (operation.security) setModel(operation.security)
            }
        }
    }

    return [...map.values()]
}

function parseComponentSchema(modelIdMap: Map<CustomModel, string>, resources: ResourceModel<string>[]) {

    const componentsMap = new Map<string, JsonSchemaObject>()

    const parse = (model: Model, root = false): JsonSchemaObject => {

        if (!root && isCustomModel(model) && modelIdMap.has(model)) {
            return { $ref: '#/components/schemas/' + modelIdMap.get(model)! }
        }

        if (model.kind === 'string') {
            return { type: 'string' }
        }

        if (model.kind === 'number') {
            return { type: 'number' }
        }

        if (model.kind === 'boolean') {
            return { type: 'boolean' }
        }

        if (model.kind === 'derived') {
            const { base, title, description, examples, schema } = model
            return { ...parse(base), title, description, examples, ...schema }
        }

        if (model.kind === 'array') {
            const { base, title, description, examples } = model
            return { type: 'array', title, description, examples, items: parse(base) }
        }

        if (model.kind === 'set') {
            const { base, title, description, examples } = model
            return { type: 'array', title, description, examples, items: parse(base) }
        }

        if (model.kind === 'map') {
            const { base, title, description, examples } = model
            return { type: 'array', title, description, examples, items: parse(base) }
        }

        if (model.kind === 'enums') {
            const { base, variants, title, description, examples } = model
            return { ...parse(base), enum: Object.values(variants), title, description, examples }
        }

        if (model.kind === 'record') {
            const { properties, title, description, examples, schema } = model

            const propertiesMap = new Map<string, JsonSchemaObject>()

            for (const [name, property] of Object.entries(properties)) {
                propertiesMap.set(name, parse(property))
            }

            return { type: 'object', properties: Object.fromEntries(propertiesMap), title, description, examples, ...schema }
        }

        if (model.kind === 'union') {
            const { variants, title, description, examples, discriminator } = model
            const variantsMap = new Map<string, JsonSchemaObject>()

            for (const [name, variant] of Object.entries(variants)) {
                variantsMap.set(name, parse(variant))
            }

            return discriminator == null
                ? { title, description, examples, anyOf: [...variantsMap.values()] }
                : { title, description, examples, oneOf: [...variantsMap.values()] }
        }

        if (model.kind === 'optional') {
            const { base } = model
            return { oneOf: [{ type: 'null' }, parse(base)] }
        }

        if (model.kind === 'constant') {
            const { base, value, title, description, examples } = model
            return { title, description, const: value }
        }

        return {}
    }

    for (const [model, id] of modelIdMap) {
        componentsMap.set(id, parse(model, true))
    }

    return {
        parseJsonschema: (model: Model) => parse(model),
        componentsMap,
    }
}

function parseSecurities(securities: BasicSecurityModel[]): { [key: string]: SecuritySchemeObject } {

    const map = new Map<string, SecuritySchemeObject>()

    for (const security of securities) {
        if (security.kind === 'apikey') {
            map.set(security.id, {
                type: 'apiKey',
                name: security.name,
                in: security.in,
                description: security.description
            })
            continue
        }

        if (security.kind === 'http') {
            map.set(security.id, {
                type: 'http',
                scheme: security.schema,
                bearerFormat: security.bearerFormat,
                description: security.description
            })
            continue
        }

        if (security.kind === 'authorization-code') {
            map.set(security.id, {
                type: 'oauth2',
                flows: {
                    authorizationCode: {
                        authorizationUrl: security.authorizationUrl,
                        tokenUrl: security.tokenUrl,
                        refreshUrl: security.refreshUrl,
                        scopes: security.scopes,
                    }
                },
                description: security.description
            })
            continue
        }

        if (security.kind === 'client-credentials') {
            map.set(security.id, {
                type: 'oauth2',
                flows: {
                    clientCredentials: {
                        tokenUrl: security.tokenUrl,
                        scopes: security.scopes,
                    }
                },
                description: security.description
            })
            continue
        }

        if (security.kind === 'password-credentials') {
            map.set(security.id, {
                type: 'oauth2',
                flows: {
                    password: {
                        tokenUrl: security.tokenUrl,
                        refreshUrl: security.refreshUrl,
                        scopes: security.scopes,
                    },
                },
                description: security.description
            })
        }

        if (security.kind === 'openid') {
            map.set(security.id, {
                type: 'openIdConnect',
                openIdConnectUrl: security.openIdConnectUrl,
                description: security.description,
            })
            continue
        }
    }

    return Object.fromEntries(map)
}

function parseResources(parseJsonschema: (model: Model) => JsonSchemaObject, resources: ResourceModel<string>[]): PathsObject {

    const pathsMap = new Map<string, PathItemObject>()

    for (const resource of resources) {

        const resourceParameters = new Map<string, Model>()

        const resourceSecurity = resource.security

        for (const [name, parameter] of Object.entries(resource.parameters)) {
            resourceParameters.set(name, parameter)
        }

        for (const [name, route] of Object.entries(resource.routes)) {

            const routeParameters = new Map<string, Model>()

            for (const [name, parameter] of Object.entries(route.parameter)) {
                routeParameters.set(name, parameter)
            }

            const methods = new Map<HttpMethod, OperationObject[]>()

            for (const [summary, operation] of Object.entries(route.operations)) {

                const pathParameters = new Map<string, ParameterObjectAsContent>()

                const operationSecurity = operation.security

                for (const [name, parameter] of [...resourceParameters, ...routeParameters]) {
                    const schema = parseJsonschema(parameter)
                    pathParameters.set(name, { name, in: 'path', required: true, content: { [operation.contentType]: { schema } } })
                }

                const otherParameters: ParameterObjectAsContent[] = []

                const pushParameter = (type: string, model: Model) => {
                    const required = model.kind !== 'optional'
                    const schema = parseJsonschema(model)
                    otherParameters.push({ name, in: type, required, content: { [operation.contentType]: { schema } } })
                }

                if (operation.query) for (const [name, parameter] of Object.entries(operation.query)) {
                    pushParameter('query', parameter)
                }

                if (operation.header) for (const [name, parameter] of Object.entries(operation.header)) {
                    pushParameter('header', parameter)
                }

                const responseMap = new Map<number, ResponseObject>()

                if (operation.responses) for (const [responseName, response] of Object.entries(operation.responses)) {

                    const headerMap = new Map<string, { schema: JsonSchemaObject }>()

                    if (response.header) for (const [headerName, model] of Object.entries(response.header)) {
                        headerMap.set(headerName, { schema: parseJsonschema(model) })
                    }

                    if (responseMap.has(response.status)) throw Error(`duplicate response status ${response.status} ${responseName}`)

                    responseMap.set(response.status, {
                        description: response.description ?? '',
                        headers: Object.fromEntries(headerMap),
                        content: response.content ? { [response.contentType]: { schema: parseJsonschema(response.content) } } : undefined,
                    })
                }

                const requestBody: OperationObject['requestBody'] = operation.content == null ? undefined : {
                    content: { [operation.contentType]: { schema: parseJsonschema(operation.content) } }
                }

                const operationObject: OperationObject = {
                    summary,
                    description: operation.description,
                    tags: [...resource.tags, ...operation.tags ?? []],
                    parameters: [...pathParameters.values(), ...otherParameters],
                    requestBody,
                    responses: Object.fromEntries(responseMap),
                    deprecated: operation.deprecated,
                    security: resolveSecurity(resourceSecurity, operationSecurity),
                }

                methods.set(operation.method, [...methods.get(operation.method) ?? [], operationObject])
            }

            const routePath = normalizePath([resource.path, route.path].join('/'))

            if (pathsMap.has(routePath)) throw Error(`duplicate route path ${routePath}`)

            const pathItemObject: PathItemObject = Object.fromEntries(
                [...methods].map(([method, operations]) => [method.toLowerCase(), deepMergeAll(operations)])
            )

            pathsMap.set(routePath, pathItemObject)
        }
    }

    return Object.fromEntries(pathsMap)
}

function resolveSecurity(resourceSecurity?: SecurityModel, operationSecurity?: SecurityModel): SecurityRequirementObject[] | undefined {
    if (resourceSecurity == null && operationSecurity == null) return undefined

    const ret: SecurityRequirementObject[] = []

    const securityUnits: AllOfSecurity[] = []

    const parse = (security: SecurityModel) => {
        if (security.kind === 'all-of-security') securityUnits.push(security)
        else if (security.kind === 'one-of-security') security.securities.forEach(parse)
        else securityUnits.push(allOf(security))
    }

    if (resourceSecurity) parse(resourceSecurity)
    if (operationSecurity) parse(operationSecurity)

    for (const { securities } of securityUnits) {

        const map = new Map<string, string[]>()

        for (const security of securities) {
            if (security.kind === 'authorization-code' || security.kind === 'client-credentials') {
                map.set(security.id, Object.keys(security.scopes))
            }
            else map.set(security.id, [])
        }

        ret.push(Object.fromEntries(map))
    }

    return ret
}

function maybe(resources: ResourceModel<string>[]) {

    const map = new Map<Model, string>()

    for (const resource of resources) {
        for (const [name, parameter] of Object.entries(resource.parameters)) {

        }

        for (const [name, route] of Object.entries(resource.routes)) {

            for (const [name, parameter] of Object.entries(route.parameter)) {

            }

            for (const [name, operation] of Object.entries(route.operations)) {

                if (operation.query) for (const [name, parameter] of Object.entries(operation.query)) {

                }

                if (operation.header) for (const [name, parameter] of Object.entries(operation.header)) {

                }

                if (operation.content) {

                }

                if (operation.responses) for (const [responseName, response] of Object.entries(operation.responses)) {

                    if (response.header) for (const [] of Object.entries(response.header)) {

                    }

                    if (response.content) {

                    }
                }
            }
        }
    }
}