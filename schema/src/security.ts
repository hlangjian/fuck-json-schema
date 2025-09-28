export const securitySymbol: unique symbol = Symbol('security')

export type SecurityModel = BasicSecurityModel | OneOfSecurity | AllOfSecurity

export type BasicSecurityModel = ApiKeySecurity | HttpSecurity | AuthorizationCodeSecurity | ClientCredentialsSecurity | PasswordCredentialsSecurity | OpenidSecurity

export function isSecurityModel(value: any): value is BasicSecurityModel {
    return typeof value === 'object' && !Array.isArray(value) && securitySymbol in value
}

export function isBasicSecurityModel(value: any): value is BasicSecurityModel {
    if (isSecurityModel(value)) return value.kind === 'apikey'
        || value.kind === 'http'
        || value.kind === 'authorization-code'
        || value.kind === 'client-credentials'
        || value.kind === 'openid'
    return false
}

export interface ApiKeySecurity {
    kind: 'apikey'
    id: string
    in: 'query' | 'header' | 'cookie'
    name: string
    description?: string
    [securitySymbol]: true
}

export type ApiKeySecurityOptions = Omit<ApiKeySecurity, typeof securitySymbol | 'kind'>

export function apikeySecurity(options: ApiKeySecurityOptions): ApiKeySecurity {
    const { id, in: locate, name, description } = options
    return { kind: 'apikey', id, in: locate, name, description, [securitySymbol]: true }
}

export interface HttpSecurity {
    kind: 'http'
    id: string
    schema: 'basic' | 'bearer' | 'digest' | (string & {})
    bearerFormat: 'JWT' | 'opaque' | 'OAuth' | 'AccessToken' & (string & {})
    description?: string
    [securitySymbol]: true
}

export type HttpSecurityOptions = Omit<HttpSecurity, typeof securitySymbol | 'kind' | 'bearerFormat'> & Partial<Pick<HttpSecurity, 'bearerFormat'>>

export function httpSecurity(options: HttpSecurityOptions): HttpSecurity {
    const { id, schema = 'basic', bearerFormat = 'JWT', description } = options ?? {}
    return { kind: 'http', id, schema, bearerFormat, description, [securitySymbol]: true }
}

export interface AuthorizationCodeSecurity {
    kind: 'authorization-code'
    id: string
    authorizationUrl: string
    tokenUrl: string
    refreshUrl?: string
    scopes: { [key: string]: string }
    description?: string
    [securitySymbol]: true
}

export type AuthorizationCodeSecurityOptions = Omit<AuthorizationCodeSecurity, typeof securitySymbol | 'kind' | 'scopes'> & { scopes?: { [key: string]: string } }

export function authorizationCodeSecurity(options: AuthorizationCodeSecurityOptions): AuthorizationCodeSecurity {
    const { id, authorizationUrl, tokenUrl, refreshUrl, scopes = {}, description } = options
    return { kind: 'authorization-code', id, authorizationUrl, tokenUrl, refreshUrl, scopes, description, [securitySymbol]: true }
}

export interface ClientCredentialsSecurity {
    kind: 'client-credentials'
    id: string
    tokenUrl: string
    scopes: { [key: string]: string }
    description?: string
    [securitySymbol]: true
}

export type ClientCredentialsSecurityOptions = Omit<ClientCredentialsSecurity, typeof securitySymbol | 'kind' | 'scopes'> & { scopes?: { [key: string]: string } }

export function clientCredentialsSecurity(options: ClientCredentialsSecurityOptions): ClientCredentialsSecurity {
    const { id, tokenUrl, scopes = {}, description } = options
    return { kind: 'client-credentials', id, tokenUrl, scopes, description, [securitySymbol]: true }
}

export interface PasswordCredentialsSecurity {
    kind: 'password-credentials'
    id: string
    tokenUrl: string
    refreshUrl?: string
    scopes: { [key: string]: string }
    description?: string
    [securitySymbol]: true
}

export type PasswordCredentialsSecurityOptions = Omit<PasswordCredentialsSecurity, typeof securitySymbol | 'kind' | 'scopes'> & { scopes?: { [key: string]: string } }

export function passwordCredentialsSecurity(options: PasswordCredentialsSecurityOptions): PasswordCredentialsSecurity {
    const { id, tokenUrl, refreshUrl, scopes = {}, description } = options
    return { kind: 'password-credentials', id, tokenUrl, refreshUrl, scopes, description, [securitySymbol]: true }
}

export interface OpenidSecurity {
    kind: 'openid'
    id: string
    openIdConnectUrl: string
    description?: string
    [securitySymbol]: true
}

export type OpenidSecurityOptions = Omit<OpenidSecurity, typeof securitySymbol | 'kind'>

export function openidSecurity(options: OpenidSecurityOptions): OpenidSecurity {
    const { id, openIdConnectUrl, description } = options
    return { kind: 'openid', id, openIdConnectUrl, description, [securitySymbol]: true }
}

export interface OneOfSecurity {
    kind: 'one-of-security'
    securities: (BasicSecurityModel | AllOfSecurity)[]
    [securitySymbol]: true
}

export function oneOf(...securities: (BasicSecurityModel | AllOfSecurity)[]): OneOfSecurity {
    return { kind: 'one-of-security', securities, [securitySymbol]: true }
}

export interface AllOfSecurity {
    kind: 'all-of-security'
    securities: BasicSecurityModel[]
    [securitySymbol]: true
}

export function allOf(...securities: BasicSecurityModel[]): AllOfSecurity {
    return { kind: 'all-of-security', securities, [securitySymbol]: true }
}