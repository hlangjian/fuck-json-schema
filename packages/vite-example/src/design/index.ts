import { application, createOpenapi, generateSpringboot as generateJava, outputFile } from "@huanglangjian/schema";
import { warehouseResource } from "./warehouse";

const app = application({
    routes: [warehouseResource]
})

const openapi = createOpenapi({
    routes: app.routes,
    info: {
        title: 'Hello',
        version: 'v1'
    },
    servers: [
        {
            url: 'http://localhost:5173/api/'
        }
    ]
})

outputFile('./openapi.json', JSON.stringify(openapi))

const outputPath = '../starter/src/main/java'

const files = await generateJava({
    routes: app.routes,
    outputDir: outputPath,
    baseNamespace: 'com.logistic.specs'
})


for (const [path, code] of files) {
    outputFile(path, code)
}

// const typescriptFiles = await generateTypescript({
//     routes: app.routes,
//     outputDir: './src/output/typescript',
// })

// for (const [path, code] of typescriptFiles) {

//     outputFile(path, code)
// }
