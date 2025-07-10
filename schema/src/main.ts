import { writeFile } from "fs/promises";
import { model } from "./models/index";
import { modelToJsonSchema } from "./jsonSchema";
import { outputFile } from "./writeFile";

const email = model({
    type: 'string',
    format: 'email',
    title: 'email',
    description: 'this is email string',
})

const username = model({
    type: 'string',
    format: 'uuid',
    title: 'uuid',
    description: 'this is uuid string'
})

const profile = model({
    type: 'object',
    properties: {
        email,
        username,
    },
    default: {
        email: '1127233679@qq.com',
        profile: '1ee03570-b9aa-473c-a1ab-ffe1e4bee7ab'
    }
})

const schema = modelToJsonSchema({
    schema: 'https://json-schema.org/draft/2020-12/schema',
    model: profile,
    defs: {
        username,
        email,
        profile
    }
})

await outputFile('./src/temp/schema.json', JSON.stringify(schema, null, 2))