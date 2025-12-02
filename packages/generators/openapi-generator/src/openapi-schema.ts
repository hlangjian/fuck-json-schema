import type { JsonSchema } from "@huanglangjian/json-schema-generator"

export interface OpenAPIObject {
    openapi: string
    info: InfoObject
    SchemaObjectDialect?: string
    servers?: ServerObject[]
    paths?: PathsObject
    webhooks?: { [key: string]: PathItemObject }
    components?: ComponentsObject
    security?: SecurityRequirementObject
    tags?: TagObject[]
    externalDocs?: ExternalDocumentationObject
}

export interface InfoObject {
    title: string
    summary?: string
    description?: string
    termsOfService?: string
    contact?: ContactObject
    license?: LicenseObject
    version: string
}

export interface ContactObject {
    name?: string
    url?: string
    email?: string
}

export interface LicenseObject {
    name: string
    identifier?: string
    url?: string
}

export interface ServerObject {
    url: string
    description?: string
    variables?: { [key: string]: ServerVariableObject }
}

export interface ServerVariableObject {
    enum?: string[]
    default: string
    description?: string
}

export interface ComponentsObject {
    schemas?: { [key: string]: SchemaObject }
    responses?: { [key: string]: ResponseObject | ReferenceObject }
    parameters?: { [key: string]: ParameterObject | ReferenceObject }
    examples?: { [key: string]: ExampleObject | ReferenceObject }
    requestBodies?: { [key: string]: RequestBodyObject | ReferenceObject }
    headers?: { [key: string]: HeaderObject | ReferenceObject }
    securitySchemes?: { [key: string]: SecuritySchemeObject | ReferenceObject }
    links?: { [key: string]: LinkObject | ReferenceObject }
    callbacks?: { [key: string]: CallbackObject | ReferenceObject }
    pathItems?: { [key: string]: PathItemObject | ReferenceObject }
}

export interface PathsObject {
    [key: string]: PathItemObject
}

export interface PathItemObject {
    $ref?: string
    summary?: string
    description?: string
    get?: OperationObject
    put?: OperationObject
    post?: OperationObject
    delete?: OperationObject
    options?: OperationObject
    head?: OperationObject
    patch?: OperationObject
    trace?: OperationObject
    servers?: ServerObject[]
    parameters?: Array<ParameterObject | ReferenceObject>
}

export interface OperationObject {
    tags?: string[]
    summary?: string
    description?: string
    externalDocs?: ExternalDocumentationObject
    operationId?: string
    parameters?: Array<ParameterObject | ReferenceObject>
    requestBody?: RequestBodyObject | ReferenceObject
    responses?: ResponsesObject
    callbacks?: { [key: string]: CallbackObject | ReferenceObject }
    deprecated?: boolean
    security?: SecurityRequirementObject[]
    servers?: ServerObject[]
}

export interface ExternalDocumentationObject {
    url: string
    description?: string
}

export interface ParameterObjectCommon {
    name: string
    in: string
    description?: string
    required: boolean
    deprecated?: boolean

    /** @deprecated Deprecated in Openapi 3.1*/
    allowEmptyValue?: boolean
}

export interface ParameterObjectAsSchema extends ParameterObjectCommon {
    schema: SchemaObject
    style?: StyleValues
    explode?: boolean
    allowReserved?: boolean
    example?: any
    examples?: { [key: string]: ExampleObject | ReferenceObject }
}

export interface ParameterObjectAsContent extends ParameterObjectCommon {
    content: { [key: string]: MediaTypeObject }
}

export type ParameterObject = ParameterObjectAsSchema | ParameterObjectAsContent

export type StyleValues = 'matrix' | 'label' | 'simple' | 'form' | 'spaceDelimited' | 'pipeDelimited' | 'deepObject'

export interface RequestBodyObject {
    description?: string
    content: { [key: string]: MediaTypeObject }
    required?: boolean
}

export interface MediaTypeObject {
    schema?: SchemaObject
    example?: any
    examples?: { [key: string]: ExampleObject | ReferenceObject }
    encoding?: { [key: string]: EncodingObject }
}

export interface EncodingObjectCommon {
    contentType?: string
    headers?: { [key: string]: HeaderObject | ReferenceObject }
}

export interface EncodingObjectAsRFC6570 extends EncodingObjectCommon {
    style?: string
    explode?: boolean
    allowReserved?: boolean
}

export type EncodingObject = EncodingObjectCommon | EncodingObjectAsRFC6570

export interface ResponsesObject {
    // default?: ResponseObject | ReferenceObject
    [key: string]: ResponseObject | ReferenceObject
}

export interface ResponseObject {
    description: string
    headers?: { [key: string]: HeaderObject | ReferenceObject }
    content?: { [key: string]: MediaTypeObject }
    links?: { [key: string]: LinkObject | ReferenceObject }
}

export interface CallbackObject {
    [key: string]: PathItemObject
}

export interface ExampleObject {
    summary?: string
    description?: string
    value?: any
    externalValue?: string
}

export interface LinkObject {
    operationRef?: string
    operationId?: string
    parameters?: { [key: string]: any }
    requestBody?: any
    description?: string
    server?: ServerObject
}

export interface HeaderObjectCommon {
    description?: string
    required?: boolean
    deprecated?: boolean
}

export interface HeaderObjectAsSchema extends HeaderObjectCommon {
    schema: SchemaObject | ReferenceObject
    style?: string
    explode?: boolean
    example?: any
    examples?: { [key: string]: ExampleObject | ReferenceObject }
}

export interface HeaderObjectAsContent extends HeaderObjectCommon {
    content: { [key: string]: MediaTypeObject }
}

export type HeaderObject = HeaderObjectAsSchema | HeaderObjectAsContent

export interface TagObject {
    name: string
    description?: string
    externalDocs?: ExternalDocumentationObject
}

export interface ReferenceObject {
    $ref: string
    summary?: string
    description?: string
}

export type SchemaObject = JsonSchema

export interface DiscriminatorObject {
    propertyName: string
    mapping?: { [key: string]: string }
}

export interface XMLObject {
    name?: string
    namespace?: string
    prefix?: string
    attribute?: boolean
    wrapped?: boolean
}

export type SecuritySchemeObject = ApiKeySecurityScheme | HttpSecurityScheme | OAuth2SecurityScheme | OpenIdConnectSecurityScheme

export interface ApiKeySecurityScheme {
    type: "apiKey"
    name: string
    in: "query" | "header" | "cookie"
    description?: string
}

export interface HttpSecurityScheme {
    type: "http"
    scheme: string
    bearerFormat?: string
    description?: string
}

export interface OAuth2SecurityScheme {
    type: "oauth2"
    flows: OAuthFlowsObject
    description?: string
}

export interface OpenIdConnectSecurityScheme {
    type: "openIdConnect"
    openIdConnectUrl: string
    description?: string
}

export interface AuthorizationCodeFlowObject {
    authorizationUrl: string
    tokenUrl: string
    refreshUrl?: string
    scopes: { [key: string]: string }
}

export interface PasswordFlowObject {
    tokenUrl: string
    refreshUrl?: string
    scopes: { [key: string]: string }
}

export interface ClientCredentialsFlowObject {
    tokenUrl: string
    refreshUrl?: string
    scopes: { [key: string]: string }
}

export interface OAuthFlowsObject {
    authorizationCode?: AuthorizationCodeFlowObject
    password?: PasswordFlowObject
    clientCredentials?: ClientCredentialsFlowObject
}

export interface OAuthFlowObject {
    authorizationUrl: string
    tokenUrl: string
    refreshUrl?: string
    scopes: { [key: string]: string }
}

export interface SecurityRequirementObject {
    [key: string]: string[]
}