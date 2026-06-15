# Usage example

```ts
import { generateTsServer, generateTsClient } from "@huanglangjian/specs-ts-codegen"
import { routerModel } from "@huanglangjian/specs"
import type { RouterModel } from "@huanglangjian/specs"

// Define routers using the routerModel() factory
const routers: RouterModel[] = [
  routerModel({ name: "Warehouses", routes: { ... } }),
]

// Generate server handlers
const serverFiles = generateTsServer({
  routers,
  configuration: ServerConfig,  // optional env config
})
// → { "models.ts": "...", "warehouses/createWarehouse.ts": "...", "index.ts": "...", "config.ts": "..." }

// Generate client SDK
const clientFiles = generateTsClient({ routers })
// → { "models.ts": "...", "warehouses/createWarehouse.ts": "...", "index.ts": "..." }

// Wire into any framework:
// Hono: app.on(def.method, def.path, (c) => def.handler(c.req.raw, c.req.param()))
// Bun:  serve({ fetch: (req) => def.handler(req) })
// Deno: serve((req) => def.handler(req))
```
