
export interface ApiKeySecurity {
    kind: 'apikey'
    in: 'query' | 'header' | 'cookie'
    name: string
    description?: string
}

export interface ApiKeySecurityOptions {
    in: 'query' | 'header' | 'cookie'
    name: string
    description?: string
}

export function apikeySecurity(options: ApiKeySecurityOptions): ApiKeySecurity {
    return { kind: 'apikey', ...options }
}

export interface HttpSecurity {
    kind: 'http'
    schema: 'basic' | 'bearer' | 'digest' | (string & {})
    bearerFormat: 'JWT' | 'opaque' | 'OAuth' | 'AccessToken' & (string & {})
    description?: string
}

export interface HttpSecurityOptions {
    schema: 'basic' | 'bearer' | 'digest' | (string & {})
    bearerFormat: 'JWT' | 'opaque' | 'OAuth' | 'AccessToken' & (string & {})
    description?: string
}

export function httpSecurity(options: HttpSecurityOptions): HttpSecurity {
    return { kind: 'http', ...options }
}

export interface OAuth2Security<T extends string> {
    kind: 'oauth2'
    scopes: T[]
    define: OAuth2SecurityDefine<string>
}

export interface AuthorizationCodeProvider {
    kind: 'authorization-code-provider'
    authorizationUrl: string
    tokenUrl: string
    refreshUrl?: string
    description?: string
    define: OAuth2SecurityDefine<string>
}

export interface ClientCredentialsProvider {
    kind: 'client-credentials-provider'
    tokenUrl: string
    description?: string
    define: OAuth2SecurityDefine<string>
}

export interface PasswordCredentialsProvider {
    kind: 'password-credentials-provider'
    tokenUrl: string
    refreshUrl?: string
    description?: string
    define: OAuth2SecurityDefine<string>
}

export type OAuth2Provider =
    | AuthorizationCodeProvider
    | ClientCredentialsProvider
    | PasswordCredentialsProvider

export interface OAuth2SecurityDefine<T extends string> {
    scopes: { [key in T]: string }
    scope: (...values: Array<T>) => OAuth2Security<T>
}

export function defineOAuth2<T extends { [key: string]: string }>(scopes: T): OAuth2SecurityDefine<keyof T & string> {

    const define: OAuth2SecurityDefine<keyof T & string> = {
        scopes,
        scope(...values) {
            return { kind: 'oauth2', define, scopes: values }
        }
    }

    return define
}

export interface AuthorizationCodeProviderOptions {
    authorizationUrl: string
    tokenUrl: string
    refreshUrl?: string
    description?: string
}

export interface ClientCredentialsProviderOptions {
    tokenUrl: string
    description?: string
}

export interface PasswordCredentialsProviderOptions {
    tokenUrl: string
    refreshUrl?: string
    description?: string
}

export function createAuthorizationCodeProvider(define: OAuth2SecurityDefine<string>, options: AuthorizationCodeProviderOptions): AuthorizationCodeProvider {
    return { kind: 'authorization-code-provider', define, ...options }
}

export function createClientCredentialsProvider(define: OAuth2SecurityDefine<string>, options: ClientCredentialsProviderOptions): ClientCredentialsProvider {
    return { kind: 'client-credentials-provider', define, ...options }
}

export function createPasswordCredentialsProvider(define: OAuth2SecurityDefine<string>, options: PasswordCredentialsProviderOptions): PasswordCredentialsProvider {
    return { kind: 'password-credentials-provider', define, ...options }
}

export interface OpenidSecurity {
    kind: 'openid'
}

export interface OpenidProvider {
    kind: 'openid-provider'
    openIdConnectUrl: string
    description?: string
    define: OpenidSecurity
}

export interface OpenidProviderOptions {
    openIdConnectUrl: string
    description?: string
}

export function defineOpenid(): OpenidSecurity {
    return { kind: 'openid' }
}

export function createOpenidProvider(define: OpenidSecurity, options: OpenidProviderOptions): OpenidProvider {
    return { kind: 'openid-provider', define, ...options }
}

export type SecurityModel =
    | ApiKeySecurity
    | HttpSecurity
    | OAuth2Security<string>
    | OpenidSecurity

export type SecurityProvider =
    | ApiKeySecurity
    | HttpSecurity
    | OAuth2Provider
    | OpenidProvider