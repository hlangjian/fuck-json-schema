# Init guide — scaffold a working Specs environment

For users who want to start defining API contracts but have no project yet. Produces a minimal **editable, generatable, previewable** setup. Add domain files under `src/` to iterate.

## Target layout

```
<specs>/
├── package.json          # consumer project (not the @huanglangjian/specs library itself)
├── generate.ts           # generation entry: writes OpenAPI + server/client codegen to disk
├── preview.html          # Scalar OpenAPI viewer (CDN, zero deps)
├── src/
│   ├── index.ts          # aggregate routers + models
│   └── <domain>/
│       ├── routes.ts
│       └── models.ts
└── docs/
    └── openapi.json      # generated; commit this for preview/review
```

> `generated/` (server + client output) is a build artifact — gitignore it.

## 1. package.json

This is the **consumer project's** `package.json`, not the `@huanglangjian/specs` library's. Install the latest versions with `pnpm add @huanglangjian/specs @huanglangjian/specs-ts-codegen zod` (or `valibot` instead of `zod` if you prefer Valibot validation); version strings below are illustrative only.

```json
{
  "name": "my-api-specs",
  "private": true,
  "type": "module",
  "scripts": {
    "generate": "tsx generate.ts"
  },
  "dependencies": {
    "@huanglangjian/specs": "latest",
    "zod": "latest"
  },
  "devDependencies": {
    "@huanglangjian/specs-ts-codegen": "latest",
    "@types/node": "latest",
    "tsx": "latest",
    "typescript": "latest"
  }
}
```

## 2. generate.ts

The core. `generateOpenapi` returns `{ openapi, registry }`; `generateTsServer` / `generateTsClient` return `Record<string, string>`. None of them touch the filesystem — this script does.

```ts
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"

import { generateOpenapi } from "@huanglangjian/specs"
import { generateTsServer, generateTsClient } from "@huanglangjian/specs-ts-codegen"

import { routers, models } from "./src/index"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function writeFiles(outDir: string, files: Record<string, string>, label: string) {
  fs.rmSync(outDir, { recursive: true, force: true })
  fs.mkdirSync(outDir, { recursive: true })
  for (const [filename, content] of Object.entries(files)) {
    const filePath = path.resolve(outDir, filename)
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, content, "utf-8")
  }
  console.log(`Generated: ${label} (${Object.keys(files).length} files)`)
}

// ① OpenAPI
const { openapi } = generateOpenapi({
  info: { title: "<你的 API 名>", version: "1.0.0", description: "<一句话说明>" },
  servers: [{ url: "http://localhost:3000", description: "开发服务器" }],
  routers,
})
fs.mkdirSync(path.resolve(__dirname, "docs"), { recursive: true })
fs.writeFileSync(path.resolve(__dirname, "docs", "openapi.json"), JSON.stringify(openapi, null, 2), "utf-8")
console.log("Generated: docs/openapi.json")

// ② server stubs + ③ client SDK
writeFiles(path.resolve(__dirname, "generated", "server"), generateTsServer({ routers, models }), "server")
writeFiles(path.resolve(__dirname, "generated", "client"), generateTsClient({ routers, models }), "client")
```

> Need a `ServerConfig`? Pass it to the server generator and optionally emit a JSON Schema:
>
> ```ts
> import { generateJsonSchema } from "@huanglangjian/specs"
> import { ServerConfig } from "./src/config"
>
> writeFiles("generated/server", generateTsServer({ routers, configuration: ServerConfig, models }), "server")
> fs.writeFileSync("docs/server-config.schema.json", JSON.stringify(generateJsonSchema(ServerConfig), null, 2))
> ```

## 3. src/index.ts

Aggregate routers and any free-standing models:

```ts
import type { Models } from "@huanglangjian/specs"

import { healthRouter } from "./health/routes"

export const routers = [healthRouter]

export const models: Models[] = [
  // extra named models not referenced by any route
]
```

Define routes and models with `router()`, `route()`, `record()`, etc. — see [Model kinds](./model-kinds.md) and [Usage example](./usage-example.md).

## Run loop

1. Edit `src/` — add a domain (`routes.ts` + `models.ts`).
2. `pnpm generate` → writes `docs/openapi.json` + `generated/`.
3. Preview (below).
4. Back to 1.

## Preview OpenAPI

Three options, pick by taste:

1. **Scalar (zero-dep, CDN)** — serve `preview.html` over HTTP (file:// breaks CORS):
   ```html
   <!doctype html>
   <html>
     <head>
       <title>API Reference</title>
       <meta charset="utf-8" />
       <meta name="viewport" content="width=device-width, initial-scale=1" />
     </head>
     <body>
       <div id="app"></div>
       <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
       <script>
         Scalar.createApiReference("#app", { url: "./docs/openapi.json", hideClientButton: true })
       </script>
     </body>
   </html>
   ```
   Run `pnpm dlx serve .` and open `http://localhost:3000/preview.html`.

2. **Redocly (hot-reload, optional)** — `pnpm exec redocly preview-docs docs/openapi.json` auto-refreshes when `openapi.json` changes; best for tight iteration loops. Requires `pnpm add -D @redocly/cli`; similar alternatives include Stoplight Studio (GUI) and `swagger-ui-watcher` — pick any.

3. **VSCode** — install an OpenAPI/Swagger extension, open `docs/openapi.json`, render in-editor.
