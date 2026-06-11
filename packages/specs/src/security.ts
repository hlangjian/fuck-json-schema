import type { HttpMethod } from "./api"

export interface SecurityPolicyModel {
  name: string

  /** key就是path的模式, 支持正则表达 */
  paths: Record<string, SecurityPolicyPathItem>
}

export interface SecurityPolicyPathItem {
  /** 如果没有设置, 则默认对所有http method生效 */
  methods?: HttpMethod[]

  /** 如果没有设置, 则忽略该规则 */
  pipeline?: SecurityApply[]
}

export type SecurityComponent = ApikeySecurityComponent | OpenIdSecurityComponent

export interface ApikeySecurityComponent {
  kind: "apikey"
  id: string
  name: string
  description?: string
}

export interface OpenIdSecurityComponent {
  kind: "openIdConnect"
  id: string
  description?: string
  scopes: string[]
}

export interface SecurityApply {
  component: SecurityComponent
  scopes: string[]
}

export interface SecurityAppliable {
  apply: (...scopes: string[]) => SecurityApply
}

export interface ApikeySecurityComponentOptions {
  id: string
  name: string
  description?: string
}

export function apikey(options: ApikeySecurityComponentOptions): ApikeySecurityComponent & SecurityAppliable {
  const component: ApikeySecurityComponent = {
    kind: "apikey",
    ...options,
  }

  return {
    ...component,
    apply: () => ({ component, scopes: [] }),
  }
}

export interface OpenIdComponentOptions {
  id: string
  description?: string
  scopes: string[]
}

export function openIdConnect(options: OpenIdComponentOptions): OpenIdSecurityComponent & SecurityAppliable {
  const component: OpenIdSecurityComponent = {
    kind: "openIdConnect",
    ...options,
  }

  return {
    ...component,
    apply: (...scopes: string[]) => ({ component, scopes }),
  }
}
