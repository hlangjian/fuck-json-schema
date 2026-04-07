import { test } from "vitest"

import { int32, optional, record, string } from "@/type-system/basic"

import { formatJava, generateJavaClass } from "./java"
import { formatRust, generateRustCode } from "./rust"
import { formatTypescript, generateTypescriptInterface } from "./typescript"

const model = record({
  id: "Warehouse",
  properties: {
    name: string(),
    age: optional(int32()),
  },
})

test("typescript-codegen", async () => {
  const code = await formatTypescript(generateTypescriptInterface({ model }))
  console.log(code)
})

test("java-codegen", async () => {
  const code = await formatJava(generateJavaClass({ model, package: "com.example" }))
  console.log(code)
})

test("rust-codegen", async () => {
  const code = await formatRust(generateRustCode({ model, module_name: "unknown" }))
  console.log(code)
})
