import { relative, resolve } from "path"
import type { RecordModel } from "../models/record"
import type { Model } from "../models/types"
import { upperFirst } from "../utils"
import { createGeneratorContext, type GeneratorContext, type GeneratorContextOptions, type ModuleGeneratorContext } from "./generic-generator"
import type { TaggedUnionModel } from "../models/tagged-union"
import type { ConstantModel } from "../models/constant"
import type { OptionalModel } from "../models/optional"
import type { StringModel } from "../models/string"
import type { NumberModel } from "../models/number"
import type { BooleanModel } from "../models/boolean"
import { isDate, isSet } from "util/types"
import { format } from "prettier"
import prettierJava from 'prettier-plugin-java'

export async function generateJava(options: GeneratorContextOptions): Promise<Map<string, string>> {

    const context = createGeneratorContext(options)

    const files = new Map<string, string>()

    await context.travel(async model => {
        if (model.kind === 'record') {
            const code = generateRecordModel(model, context)
            const path = getPath(model.id, context)
            files.set(path, code)
        }

        else if (model.kind === 'tagged-union') {
            const code = generateTaggedUnionModel(model, context)
            const path = getPath(model.id, context)
            files.set(path, code)
        }
    })

    const formattedFiles = new Map<string, string>()

    for (const [path, code] of files) {
        formattedFiles.set(path, await formatJava(code))
    }

    return formattedFiles
}

export function generateRecordModel(model: RecordModel, context: GeneratorContext | ModuleGeneratorContext): string {

    const module = 'createModule' in context ? context.createModule(model.id) : context

    const { packageId, simpleName } = resolveId(model.id, context)

    const requiredParameters: { name: string, property: Model }[] = []

    const optionalParameters: { name: string, property: OptionalModel }[] = []

    const constantParameters: { name: string, property: ConstantModel }[] = []

    for (const [name, property] of Object.entries(model.properties)) {
        if (property.kind === 'constant') {
            constantParameters.push({ name, property })
        }

        else if (property.kind === 'optional') {
            optionalParameters.push({ name, property })
        }

        else requiredParameters.push({ name, property })
    }

    const canonicalArguments = requiredParameters.concat(optionalParameters).map(({ name, property }) => {
        const signature = getModelSignature(property, module)
        return `${signature} ${name}`
    })

    const constantProperties = constantParameters.map(({ name, property }) => {
        const signature = getModelSignature(property, module)
        return `private static final ${signature} ${name}$ = ${generateInstanceCode(property, property.value, module)};`
    })

    const constantGetters = constantParameters.map(({ name, property }) => {
        const signature = getModelSignature(property, module)

        module.dependsOn('com.fasterxml.jackson.annotation.JsonProperty')

        return `
            @JsonProperty("${name}")
            public ${signature} ${name}(){
                return ${name}$;
            }
        `
    })

    function getMinimalConstructor() {
        if (optionalParameters.length === 0) return ''

        const minimalArguments = requiredParameters.map(({ name, property }) => {
            const signature = getModelSignature(property, module)
            return `${signature} ${name}`
        })

        const requiredAssignments = requiredParameters.map(({ name }) => {
            return name
        })

        const optionalAssignments = optionalParameters.map(({ property }) => {
            return generateInstanceCode(property, property.value, module)
        })

        return `
            public ${simpleName}(
                ${minimalArguments.join(',')}
            ){
                this(${requiredAssignments.concat(optionalAssignments).join(',')});
            }
        `
    }

    const builderProperties = requiredParameters.concat(optionalParameters).map(({ name, property }) => {
        const signature = getModelSignature(property, module)
        return `public ${signature} ${name};`
    })

    const builderConstructorAssigments = requiredParameters.concat(optionalParameters).map(({ name }) => {
        return `this.${name} = source.${name}();`
    })

    const buildAssigments = requiredParameters
        .concat(optionalParameters)
        .map(o => 'builder.' + o.name);

    module.dependsOn('org.jspecify.annotations.NullMarked')

    const definationCode = `
        @NullMarked
        public record ${simpleName}(
            ${canonicalArguments.join(',')}
        ){
            ${constantProperties.join('\n\n')}

            ${constantGetters.join('\n\n')}

            ${getMinimalConstructor()}

            protected ${simpleName} with(java.util.function.Consumer<Builder$> initializer){
                var builder = new Builder$(this);
                initializer.accept(builder);
                return new ${simpleName}(${buildAssigments.join(',')});
            }

            private class Builder$ {

                protected Builder$(${simpleName} source){
                    ${builderConstructorAssigments.join('\n\n')}
                }

                ${builderProperties.join('\n\n')}

            }
        }
    `

    return `
        package ${packageId};

        ${getModuleImportCodes(module)}
        
        ${definationCode}
    `
}

export function generateTaggedUnionModel(model: TaggedUnionModel, context: GeneratorContext | ModuleGeneratorContext): string {

    const module = 'createModule' in context ? context.createModule(model.id) : context

    const { packageId, simpleName } = resolveId(model.id, context)

    const permits = Object.keys(model.variants).map(name => {
        return `${simpleName}.${name}`
    })

    const variants = Object.entries(model.variants).map(([name, variant]) => {
        const signature = getModelSignature(variant, module)

        module.dependsOn('com.fasterxml.jackson.annotation.JsonCreator')
        module.dependsOn('com.fasterxml.jackson.annotation.JsonValue')

        return `
            public record ${name}(
                @JsonCreator @JsonValue
                ${signature} value
            ) implements ${simpleName} {}
        `
    })

    module.dependsOn('org.jspecify.annotations.NullMarked')

    return `
        package ${packageId};

        ${getModuleImportCodes(module)}

        @NullMarked
        public sealed interface ${simpleName} ${permits.length > 0 ? 'permits ' + permits.join(',') : ''} {
            ${variants.join('\n\n')}
        }
    `
}

export function resolveId(id: string, context: GeneratorContext | ModuleGeneratorContext) {
    const parts = [
        ...context.baseNamespace.split('.'),
        ...id.split('.')
    ]

    const realId = parts.join('.')

    const packageId = parts.slice(0, -1).join('.')

    const simpleName = parts.at(-1) ?? id

    return { realId, packageId, simpleName }
}

export function getPath(id: string, context: GeneratorContext): string {

    const parts = [
        ...context.baseNamespace.split('.'),
        ...id.split('.')
    ]

    const path = parts.join('/') + '.java'

    const dirname = process.cwd()

    const absolutePath = resolve(context.outputDir, path)

    const relativePath = relative(dirname, absolutePath)

    return relativePath
}

export const getModelSignature = (model: Model, context: ModuleGeneratorContext): string => {

    if (model.kind === 'boolean') return 'boolean'

    if (model.kind === 'string') return 'String'

    if (model.kind === 'date') {
        context.dependsOn('java.time.LocalDate')
        return 'LocalDate'
    }

    if (model.kind === 'time') {
        context.dependsOn('java.time.LocalTime')
        return 'LocalTime'
    }

    if (model.kind === 'datetime') {
        context.dependsOn('java.time.localDateTime')
        return 'localDateTime'
    }

    if (model.kind === 'uuid') {
        context.dependsOn('java.util.UUID')
        return 'UUID'
    }

    if (model.kind === 'number') {
        if (model.type === 'decimal') {
            context.dependsOn('java.math.BigDecimal')
            return 'BigDecimal'
        }

        return upperFirst(model.type)
    }

    if (model.kind === 'constant') return getModelSignature(
        model.base,
        context,
    )

    if (model.kind === 'array') {
        const baseSignature = getModelSignature(model.base, context)
        context.dependsOn('java.util.List')
        return `List<${baseSignature}>`
    }

    if (model.kind === 'set') {
        const baseSignature = getModelSignature(model.base, context)
        context.dependsOn('java.util.Set')
        return `Set<${baseSignature}>`
    }

    if (model.kind === 'map') {
        const baseSignature = getModelSignature(model.base, context)
        context.dependsOn('java.util.Map')
        return `Map<${baseSignature}>`
    }

    if (model.kind === 'record' || model.kind === 'tagged-union') {
        const parts = [
            ...context.baseNamespace.split('.'),
            ...model.id.split('.'),
        ]

        return parts.join('.')
    }

    if (model.kind === 'optional') {

        context.dependsOn('org.jspecify.annotations.Nullable')

        if (model.base.kind === 'boolean') return '@Nullable Boolean'

        if (model.base.kind === 'number' && model.base.type !== 'decimal') {
            return '@Nullable ' + {
                'short': 'Short',
                'int': 'Integer',
                'long': 'Long',
                'float': 'Float',
                'double': 'Double'
            }[model.base.type]
        }

        if (model.base.kind === 'optional') return getModelSignature(model.base, context)

        const baseSignature = getModelSignature(model.base, context)

        return '@Nullable ' + baseSignature
    }

    throw Error('Unknown model type')
}


export function generateInstanceCode(model: Model, value: any | undefined, context: ModuleGeneratorContext): string {

    if (model.kind === 'string' || model.kind === 'number' || model.kind === 'boolean') {
        return parseValue(model, value)
    }

    if (model.kind === 'constant') return generateInstanceCode(model.base, value ?? model.value, context)

    if (model.kind === 'optional') return generateInstanceCode(model.base, value, context)

    if (model.kind === 'array') {
        if (Array.isArray(value) === false) throw Error(`
            ${JSON.stringify(model)},

            ${JSON.stringify(value)}
        `)

        const signature = getModelSignature(model.base, context)

        const arrayItemClauses = value.map(o => `add(${generateInstanceCode(model.base, o, context)})`)

        const arrayItemsClause = arrayItemClauses.length === 0 ? '' : '{{' + arrayItemClauses.join(';\n\n') + '}}'

        context.dependsOn('java.util.ArrayList')

        return `new ArrayList<${signature}>()${arrayItemsClause}`
    }

    if (model.kind === 'map') {
        if (typeof value === 'object' === false) throw Error()

        const signature = getModelSignature(model.base, context)

        const mapItemClauses = Object.entries(value).map(([key, value]) => `
            put("${key}", ${generateInstanceCode(model.base, value, context)})
        `)

        const mapItemsClause = mapItemClauses.length === 0 ? '' : '{{' + mapItemClauses.join(';\n\n') + '}}'

        context.dependsOn('java.util.HashMap')

        return `new HashMap<String, ${signature}>()${mapItemsClause}`
    }

    if (model.kind === 'date') {
        if (isDate(value) === false) throw Error()

        context.dependsOn('java.time.LocalDate')

        return `
            LocalDate.of(
                ${value.getFullYear()}, 
                ${value.getMonth() + 1}, 
                ${value.getDate()})
        `
    }

    if (model.kind === 'datetime') {
        if (isDate(value) === false) throw Error()

        context.dependsOn('java.time.LocalDateTime')

        return `
            LocalDateTime.of(
                ${value.getFullYear()}, 
                ${value.getMonth() + 1},
                ${value.getDate()},
                ${value.getHours()},
                ${value.getMinutes()},
                ${value.getSeconds()})
        `
    }

    if (model.kind === 'time') {
        if (isDate(value) === false) throw Error()

        context.dependsOn('java.time.LocalTime')

        return `
            LocalTime.of(
                ${value.getHours()},
                ${value.getMinutes()},
                ${value.getSeconds()})
        `
    }

    if (model.kind === 'set') {
        if (isSet(value) === false) throw Error()

        context.dependsOn('java.util.Set')

        return `Set.of(${[...value].map(o => generateInstanceCode(model.base, o, context)).join(',')})`
    }

    if (model.kind === 'record') {
        if (typeof value !== 'object') throw Error()

        const { realId } = resolveId(model.id, context)

        const requiredProperties: { name: string, property: Model }[] = []

        const optionalProperties: { name: string, property: Model }[] = []

        for (const [name, property] of Object.entries(model.properties)) {
            if (property.kind === 'constant') continue

            if (property.kind === 'optional') optionalProperties.push({ name, property })

            else requiredProperties.push({ name, property })
        }

        const properties = requiredProperties.concat(optionalProperties).map(({ name, property }) => {
            const propertyValue = value[name]
            return generateInstanceCode(property, propertyValue, context)
        })

        return `new ${realId}(${properties.join(',')})`
    }

    if (model.kind === 'uuid') {
        if (typeof value !== 'string') throw Error()

        context.dependsOn('java.util.UUID')

        return `UUID.fromString("${value}")`
    }

    if (model.kind === 'tagged-union') {
        if (typeof value !== 'object') throw Error()

        if (model.discriminator in value === false) throw Error()

        const variant = model.variants[value[model.discriminator]]

        return generateInstanceCode(variant, value, context)
    }

    throw Error()
}

export const parseValue = (base: StringModel | NumberModel | BooleanModel, value?: string): string => {

    if (value == null) return 'null'

    if (base.kind === 'number') switch (base.type) {
        case 'short': return '(short)' + value
        case 'int': return value + ''
        case 'long': return value + 'l'
        case 'float': return value + 'f'
        case 'double': return value + 'D'
        default:
            throw Error(`Enums base on ${base.type} not supported currently`)
    }

    if (base.kind === 'boolean') return value

    return `\"${value}\"`
}


export async function formatJava(code: string): Promise<string> {
    try {
        return '//@formatter:off\n\n' + await format(code, {
            parser: 'java',
            plugins: [prettierJava],
            tabWidth: 4,
            printWidth: 100,
        })
    } catch (error) {
        return code
    }
}

export function getModuleImportCodes(module: ModuleGeneratorContext): string {
    return module.dependencies.values()
        .map(o => `import ${o};`)
        .toArray()
        .join('\n\n')
}

export function extractImportsFromGeneratedCode(code: string): string[] {
    return code.matchAll(/^\s*import\s+(.+?)\s*;\s*$/gm).map(o => o[1]).toArray()
}

export function extractBodyFromGeneratedCode(code: string): string {
    const match = code.match(/@NullMarked[\s\S]*$/)
    return match ? match[0] : ''
}