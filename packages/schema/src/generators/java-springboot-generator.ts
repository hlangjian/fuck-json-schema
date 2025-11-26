import type { OperationModel, RoutesModel } from "../api/routes"
import { constant } from "../models/constant"
import { record, type RecordModel } from "../models/record"
import { string } from "../models/string"
import { taggedUnion, type TaggedUnionModel } from "../models/tagged-union"
import type { Model } from "../models/types"
import { upperFirst } from "../utils"
import { createGeneratorContext, type GeneratorContext, type GeneratorContextOptions, type ModuleGeneratorContext } from "./generic-generator"
import { extractBodyFromGeneratedCode, extractImportsFromGeneratedCode, formatJava, generateRecordModel, generateTaggedUnionModel, getModelSignature, getModuleImportCodes, getPath, resolveId } from "./java-generator"

export async function generateSpringboot(options: GeneratorContextOptions): Promise<Map<string, string>> {

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

        else {
            const code = generateSpringbootRouteModel(model, context)
            const path = getPath(model.id, context)

            const controllerCode = generateSpringbootController(model, context)
            const controllerPath = getPath(model.id + 'Controller', context)

            files.set(path, code)
            files.set(controllerPath, controllerCode)
        }
    })

    const formattedFiles = new Map<string, string>()

    for (const [path, code] of files) {
        formattedFiles.set(path, await formatJava(code))
    }

    return formattedFiles
}

export function generateSpringbootRouteModel(model: RoutesModel, context: GeneratorContext): string {
    const { packageId, simpleName } = resolveId(model.id, context)

    const module = context.createModule(model.id)

    const interfaceOperationDeclarations: string[] = []

    const interfaceOperationResponse: string[] = []

    Object.entries(model.operations).forEach(([name, operation]) => {

        const responseCode = getOperationResponseModel(name, operation, module)

        const responseSignature = name + 'Response'

        const parameters: string[] = []

        if (operation.content) parameters.push(`${getModelSignature(operation.content, module)} content`)

        if (operation.pathParams) for (const [name, parameter] of Object.entries(operation.pathParams)) {
            parameters.push(`${getModelSignature(parameter, module)} path${upperFirst(name)}`)
        }

        if (operation.queryParams) for (const [name, parameter] of Object.entries(operation.queryParams)) {
            parameters.push(`${getModelSignature(parameter, module)} query${upperFirst(name)}`)
        }

        if (operation.headerParams) for (const [name, parameter] of Object.entries(operation.headerParams)) {
            parameters.push(`${getModelSignature(parameter, module)} header${upperFirst(name)}`)
        }

        interfaceOperationDeclarations.push(`${responseSignature} ${name}(${parameters.join(',')});`)

        interfaceOperationResponse.push(responseCode)
    })

    module.dependsOn('org.jspecify.annotations.NullMarked')

    return `
        package ${packageId};

        ${getModuleImportCodes(module)}

        @NullMarked
        public interface ${simpleName} {
            ${interfaceOperationDeclarations.join('\n\n')}

            ${interfaceOperationResponse.join('\n\n')}
        }
    `
}

function getOperationResponseModel(name: string, operation: OperationModel, context: ModuleGeneratorContext): string {

    const variants: RecordModel[] = []

    for (const [name, response] of Object.entries(operation.responses)) {

        const properties = new Map<string, Model>()

        properties.set('name', constant(string(), name))

        if (response.content) properties.set('content', response.content)

        if (response.headers) for (const [headerName, header] of Object.entries(response.headers)) {
            properties.set('header' + upperFirst(headerName), header)
        }

        variants.push(record({
            id: name,
            properties: Object.fromEntries(properties),
        }))
    }

    const variantCodes = variants.map(o => generateRecordModel(o, context))

    const permits = variantCodes.length === 0 ? '' : 'permits ' + variants.map(o => `${name}Response.${o.id}`)

    const variantBodies: string[] = []

    for (const variant of variantCodes) {
        const imports = extractImportsFromGeneratedCode(variant)

        for (const type of imports) context.dependsOn(type)

        const body = extractBodyFromGeneratedCode(variant)

        const index = body.indexOf(')')

        const realBody = body.slice(0, index + 1) + ` implements ${name}Response ` + body.slice(index + 1)

        variantBodies.push(realBody)
    }

    return `
        sealed interface ${name}Response ${permits} {
            ${variantBodies.join('\n\n')}
        }
    `
}

function generateSpringbootController(route: RoutesModel, context: GeneratorContext | ModuleGeneratorContext): string {

    const { packageId, simpleName } = resolveId(route.id, context)

    const module = 'dependsOn' in context ? context : context.createModule(route.id)

    module.dependsOn('org.springframework.web.bind.annotation.RestController')

    function getOperationCode(operationName: string, operation: OperationModel): string {

        const parameters: string[] = []

        const parameterNames: string[] = []

        if (operation.content) {
            const signature = getModelSignature(operation.content, module)
            parameters.push(`${signature} content`)
            parameterNames.push('content')
        }

        if (operation.pathParams) for (const [name, parameter] of Object.entries(operation.pathParams)) {
            const signature = getModelSignature(parameter, module)

            const argName = 'path' + upperFirst(name)

            parameters.push(`
                @PathVariable("${name}")
                ${signature} ${argName}  
            `)
            parameterNames.push(argName)
        }

        if (operation.queryParams) for (const [name, parameter] of Object.entries(operation.queryParams)) {
            const signature = getModelSignature(parameter, module)

            const args: string[] = []

            const required = parameter.kind !== 'optional'

            args.push(`name = "${name}"`)

            if (required) args.push('required = ' + required)

            if (parameter.kind === 'optional' && parameter.value != null) {
                args.push('defaultValue = ' + JSON.stringify(parameter.value))
            }

            const argName = 'query' + upperFirst(name)

            parameters.push(`
                @RequestParam(${args.join(',')})
                ${signature} ${argName}    
            `)

            parameterNames.push(argName)
        }

        if (operation.headerParams) for (const [name, parameter] of Object.entries(operation.headerParams)) {
            const signature = getModelSignature(parameter, module)

            const args: string[] = []

            const required = parameter.kind !== 'optional'

            args.push(`name = "${name}"`)

            if (required) args.push('required = ' + required)

            if (parameter.kind === 'optional' && parameter.value != null) {
                args.push('defaultValue = ' + JSON.stringify(parameter.value))
            }

            const argName = 'header' + upperFirst(name)

            module.dependsOn('org.springframework.web.bind.annotation.RequestHeader')

            parameters.push(`
                @RequestHeader(${args.join(',')})
                ${signature} ${argName}   
            `)

            parameterNames.push(argName)
        }

        const responseCodes = Object.entries(operation.responses).map(([responseName, response]) => {

            function getHeaderBuildingBlock() {
                if (response.headers == null || Object.keys(response.headers).length === 0) return ''

                module.dependsOn('org.springframework.http.HttpHeaders')

                const lines: string[] = []

                lines.push('var headers = new HttpHeaders();')

                for (const [headerName, parameter] of Object.entries(response.headers)) {

                    const accessor = 'o.header' + upperFirst(headerName) + '()'

                    switch (parameter.kind) {
                        case 'string':
                            lines.push(`headers.add("${headerName}", ${accessor});`)
                            break

                        default:
                            lines.push(`headers.add("${headerName}", objectMapper.writeValueAsString(${accessor}));`)
                    }
                }

                return lines.join('\n')
            }

            function getHeaderSettingBlock() {
                if (response.headers == null || Object.keys(response.headers).length === 0) return ''

                return '.headers(headers)'
            }

            function getBodyBlock() {
                if (response.content == null) return '.build()'

                return '.body(o.content())'
            }

            return `
                case ${simpleName}.${operationName}Response.${responseName} o -> {

                    ${getHeaderBuildingBlock()}
                
                    yield ResponseEntity
                        .status(${response.status})
                        ${getHeaderSettingBlock()}
                        ${getHeaderSettingBlock()}
                        ${getBodyBlock()};
                }
            `
        })

        function getAnnotation(operation: OperationModel): string {

            const path = operation.path

            switch (operation.method) {
                case 'GET':
                    module.dependsOn('org.springframework.web.bind.annotation.GetMapping')
                    return `@GetMapping("${path}")`;
                case 'POST':
                    module.dependsOn('org.springframework.web.bind.annotation.PostMapping')
                    return `@PostMapping("${path}")`;
                case 'PUT':
                    module.dependsOn('org.springframework.web.bind.annotation.PutMapping')
                    return `@PutMapping("${path}")`;
                case 'DELETE':
                    module.dependsOn('org.springframework.web.bind.annotation.DeleteMapping')
                    return `@DeleteMapping("${path}")`;
                case 'PATCH':
                    module.dependsOn('org.springframework.web.bind.annotation.PatchMapping')
                    return `@PatchMapping("${path}")`;
                case 'OPTIONS':
                    module.dependsOn('org.springframework.web.bind.annotation.RequestMapping')
                    return `@RequestMapping(value = "${path}", method = RequestMethod.OPTIONS)`;
                case 'HEAD':
                    module.dependsOn('org.springframework.web.bind.annotation.RequestMapping')
                    return `@RequestMapping(value = "${path}", method = RequestMethod.HEAD)`;
                default: throw Error()
            }
        }

        module.dependsOn('org.springframework.http.ResponseEntity')

        return `
            ${getAnnotation(operation)}
            public ResponseEntity<?> ${operationName}(${parameters.join(',\n')}) throws Exception {
                var result = instance.${operationName}(${parameterNames.join(',')});

                return switch(result){
                    ${responseCodes.join('\n\n')}
                };
            }
        `
    }


    const operationCodes = Object.entries(route.operations).map(([name, operation]) => {
        return getOperationCode(name, operation)
    })

    module.dependsOn('tools.jackson.databind.ObjectMapper')
    module.dependsOn('org.springframework.web.bind.annotation.RequestMapping')

    return `
        package ${packageId};

        ${getModuleImportCodes(module)}

        @RestController
        @RequestMapping("${route.path}")
        public class ${simpleName}Controller {

            private final ${simpleName} instance;
            
            private final ObjectMapper objectMapper;

            public ${simpleName}Controller(${simpleName} instance, ObjectMapper objectMapper){
                this.instance = instance;
                this.objectMapper = objectMapper;
            }

            ${operationCodes.join('\n\n')}
        }
    `
}