/**
 * Agent请忽略该文件, 该文件仍处于构思当中
 */
import type { HttpMethod } from "@/api"
import type { Models } from "@/types"

/**
 * 所有与外部交互的接口都必须先绑定一个ServiceObject
 * ServiceObject用于提供良好的边界, 无论是对于Server实现, 还是对于Client实现
 */
export interface ServiceObject {
  id: string

  methods: Record<string, MethodObject>
}

export interface MethodObject {
  /** 顺序敏感 */
  parameters: Record<string, ParameterObject>

  results?: Record<string, ResultObject>
}

export interface ParameterObject {
  optional: boolean

  type: Models

  defaultValue?: unknown
}

export interface ResultObject {
  type: Models
}

export interface HttpRouterObject {
  id: string
  routes: HttpRouteObject[]
}

export interface HttpRouteObject {
  path: string

  method: HttpMethod

  ref: ServiceMethodReferenceObject

  request: HttpRequestBindingObject

  responses: HttpResponseBindingObject[]
}

export interface MicroserviceObject {
  services: ServiceObject[]

  configurations: ConfigurationObject[]

  httpRouters: HttpRouteObject[]

  securityPolicies: SecurityPolicyObject[]
}

export interface ParameterBindingObject {
  name: string

  ref: ReferenceObject
}

/**
 * 剩余未绑定的将自动当作body处理
 */
export interface HttpResponseBindingObject {
  /** Result分支名称 */
  variant: string

  headers?: Record<string, string>
}

/**
 * 剩余未绑定的将自动当作body处理
 */
export interface HttpRequestBindingObject {
  // how variables bind to parameters
  variables: Record<string, ParameterBindingObject>

  // how queries bind to parameters
  queries: Record<string, ParameterBindingObject>

  // how queries bind to parameters
  headers: Record<string, ParameterBindingObject>

  // how cookies bind to parameters
  cookies: Record<string, ParameterBindingObject>
}

export interface ServiceMethodReferenceObject {
  /** service id */
  service: string

  /** method name */
  method: string
}

/**
 * 模仿JsonSchema的ref设计
 * 其中$ref的值是Json Pointer
 */
export interface ReferenceObject {
  $ref: string
}

export interface ConfigurationObject {
  id: string

  properties: Record<string, ParameterObject>
}

export interface SecurityPolicyObject {
  id: string
  paths: SecurityPolicyPathObject[]
}

export interface SecurityActionObject {
  type: "apikey" | "client_credentials"
  scopes: string[]
}

export interface SecurityPolicyPathObject {
  pattern: string
  actions: SecurityActionObject[]
}
