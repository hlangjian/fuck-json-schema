# Security

Two security component types, both implement `SecurityAppliable` (has `.apply()` method):

```ts
const apiKeyAuth = apikey({ id: "xApiKey", name: "X-API-Key", description: "..." })
const oidc = openIdConnect({ id: "keycloak", scopes: ["read:warehouses"], description: "..." })
```

## Security policy

Define a security policy that maps regex path patterns to security pipelines:

```ts
const policy: SecurityPolicyModel = {
  name: "default",
  paths: {
    "^/warehouses$": {
      pipeline: [apiKeyAuth.apply(), oidc.apply("read:warehouses")],
    },
    "^/warehouses/": {
      methods: ["GET", "POST", "PUT", "DELETE"],  // restrict to specific HTTP methods
      pipeline: [apiKeyAuth.apply()],
    },
  },
}
```

## OpenID Connect deployment

Required to generate OpenAPI security schemes:

```ts
const keycloakDep = deployOpenIdConnect({ component: oidc, issuer: "https://keycloak.example.com" })
```

Pass to `generateOpenapi`:

```ts
const { openapi } = generateOpenapi({
  // ...
  security: {
    policy: securityPolicy,
    deployments: { keycloak: keycloakDep },
  },
})
```
