#!/usr/bin/env node
import { buildApplication, run } from "@stricli/core"
import { rootCommand } from "./basic";

const app = buildApplication(rootCommand, {
    name: 'create specs'
})

await run(app, process.argv.slice(2), { process });