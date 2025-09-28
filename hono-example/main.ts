import { isStringModel, model, type BaseModel } from "@huanglangjian/schema";
import { createTemplate, indentAwareTemplate, outputFileSync } from "@huanglangjian/template";
import * as path from 'path'
import { inspect } from "util";

export interface NameSpaceModel {
    models: { [key: string]: BaseModel }
    code(): string
}

export function generateStringModel(dist: string, prefix: string, model: BaseModel) {

    if (isStringModel(model) === false) return

    const name = model.name ?? 'UnknownString'

    const fullName = [prefix, name].join('.')

    const [packageName, simpleName] = splitPackageName(fullName)

    const code = createTemplate(o => o.indent`
    package ${packageName};
    
    public class ${simpleName} {
        public String value;
    }
    `)

    console.warn(`unsupport model ${model}`)

    const output = path.resolve(import.meta.dirname, path.join(dist, name))

    console.log({ output })

    console.log(code.parse())
}

function splitPackageName(fullName: string): [packageName: string, simpleName: string] {
    const lastDotIndex = fullName.lastIndexOf('.');
    if (lastDotIndex === -1) return ['', fullName]
    return [fullName.slice(0, lastDotIndex), fullName.slice(lastDotIndex + 1)]
}

const strModel = model.string()

generateStringModel('./dist', 'com.models', strModel)