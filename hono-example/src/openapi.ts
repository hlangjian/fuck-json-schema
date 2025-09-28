import { Scalar } from "@scalar/hono-api-reference";
import type { Hono } from "hono";
import { outputFile } from "@huanglangjian/schema";
import { openapi, ProfileController } from "./design/index.js";
import { format, generateJava } from "./custom-generator.js";

const files = generateJava([ProfileController])

for (const [path, code] of files) {
    await outputFile(path, await format(code))
}

export function useOpenapi<T extends Hono<any, any, any>>(app: T): T {

    app.get('/d/openapi', async (ctx) => {
        return ctx.json(openapi)
    })

    app.get('/d/scalar', Scalar({
        url: '/d/openapi',
        theme: 'bluePlanet',
        hiddenClients: {
            c: true,
            ruby: true,
            php: true,
            python: true,
            rust: true,
            csharp: true,
            clojure: true,
            go: true,
            http: true,
            objc: true,
            kotlin: true,
            ocaml: true,
            java: true,
            r: true,
            swift: true,
            node: true,
            javascript: ['xhr', 'jquery', 'ofetch']
        },
        defaultHttpClient: {
            targetKey: 'shell',
            clientKey: 'curl'
        }
    }))

    return app
}