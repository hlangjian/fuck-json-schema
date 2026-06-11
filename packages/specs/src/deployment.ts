import type { OpenIdSecurityComponent } from "./security"

export interface OpenIdDeployment {
  kind: "openIdConnectDeployment"
  component: OpenIdSecurityComponent
  issuer: string
}

export interface OpenIdDeploymentOptions {
  component: OpenIdSecurityComponent
  issuer: string
}

export function deployOpenIdConnect(options: OpenIdDeploymentOptions): OpenIdDeployment {
  return {
    kind: "openIdConnectDeployment",
    component: options.component,
    issuer: options.issuer,
  }
}

export type SecurityDeployment = OpenIdDeployment
