import * as o from '@huanglangjian/schema'
import prettier from 'prettier'
import javaPlugin from 'prettier-plugin-java'

export const generateJava = o.createGenerator(({ getCodes, writeCode, writeFile, model }) => {

    const getSignature = (model: o.Model): string => {
        switch (model.kind) {
            case 'string': return 'String'
            case 'number': return model.type === 'decimal' ? 'BigDecimal' : model.type
            case 'boolean': return 'boolean'
            case 'derived': return getSignature(model.base)
            case 'optional': return getSignature(model.base)
            case 'constant': return getSignature(model.base)
            case 'array': return `Array<${getSignature(model.base)}>`
            case 'map': return `Map<${getSignature(model.base)}>`
            case 'set': return `Set<${getSignature(model.base)}>`
            case 'enums':
            case 'record':
            case 'union': return parseId(model.id).classId
            default: throw Error(`unknown model kind ${model['kind']}`)
        }
    }

    const parseId = (id: string) => {
        const parts = id.split('.')
        const className = upperFrist(parts[parts.length - 1])
        const classId = [...parts.slice(0, -1), className].join('.')
        const packageId = parts.slice(0, -1).join('.')
        const outputfile = `output/${classId.replaceAll('.', '/')}.java`
        const stubOutputFile = `output/${classId.replaceAll('.', '/')}Stub.java`
        return { className, classId, packageId, outputfile, stubOutputFile }
    }

    const { className, classId, packageId, outputfile, stubOutputFile } = parseId(model.id)

    const subCodes = [...getCodes(classId).values()].join('\n')

    if (model.kind === 'derived') {
        // do nothing
    }

    else if (model.kind === 'enums') {

        const variants = Object.entries(model.variants).map(([key, value]) => `${key} = ${value},`)

        writeFile(outputfile, `
            package ${packageId};

            public enum ${className} {
                ${variants.join('\n')}
            }
        `)
    }

    else if (model.kind === 'record') {

        const fields = Object.entries(model.properties).map(([key, value]) =>
            value.kind === 'optional'
                ? `public @NotNull ${getSignature(value)} ${key};`
                : `public ${getSignature(value)} ${key};`
        )

        writeFile(outputfile, `
            package ${packageId};

            public class ${className} {
                ${fields.join('\n\n')}

                ${subCodes}
            }
        `)
    }

    else if (model.kind === 'union') {

        writeFile(outputfile, `
            package ${packageId};

            public sealed interface ${className} permit ${Object.keys(model.variants).join()} {
                ${subCodes}
            }
        `)
    }

    else if (model.kind === 'resource') {

        const operationCodes: string[] = []

        const responseCodes: string[] = []

        const requestCodes: string[] = []

        const operationStubCodes: string[] = []

        for (const route of model.routes) {

            const parameters = new Map<string, o.Model>()

            for (const [name, parameter] of Object.entries(model.parameters)) parameters.set(name, parameter)

            for (const [name, parameter] of Object.entries(route.parameter)) parameters.set(name, parameter)

            for (const [operationName, operation] of Object.entries(route.operations)) {

                const responseName = upperFrist(operationName) + 'Response'

                const requestName = upperFrist(operationName) + 'Request'

                operationCodes.push(`${responseName} ${operationName}(${requestName} request);`)

                const stubArguments: string[] = []

                const requestFields: string[] = []

                for (const [name, parameter] of parameters) {
                    requestFields.push(`public ${getSignature(parameter)} path${upperFrist(name)};`)
                }

                for (const [name, parameter] of Object.entries(operation.query ?? {})) {
                    requestFields.push(`public ${getSignature(parameter)} query${upperFrist(name)};`)
                }

                for (const [name, parameter] of Object.entries(operation.header ?? {})) {
                    requestFields.push(`public ${getSignature(parameter)} header${upperFrist(name)};`)
                }

                if (operation.content) requestFields.push(`public ${getSignature(operation.content)} content;`)

                requestCodes.push(`
                    public class ${requestName} {

                        ${requestFields.join('\n\n')}
                    }
                `)

                const responseVariantsCodes: string[] = []

                const variantNames: string[] = []

                for (const [name, variant] of Object.entries(operation.responses)) {
                    const fields: string[] = []

                    for (const [name, parameter] of Object.entries(variant.header ?? {})) {
                        fields.push(`public ${getSignature(parameter)} header${upperFrist(name)};`)
                    }

                    if (variant.content) fields.push(`public ${getSignature(variant.content)} content;`)

                    const variantName = `${responseName}${upperFrist(name)}`

                    variantNames.push(variantName)

                    responseVariantsCodes.push(`
                        public final class ${variantName} implements ${responseName} {
                        
                            ${fields.join('\n\n')}
                        }
                    `)
                }


                const stubArgumentNames: string[] = []

                const requestSetters: string[] = []

                for (const [name, parameter] of parameters) {
                    const argumentName = `path${upperFrist(name)}`
                    stubArguments.push(`@PathVariable("${name}") ${getSignature(parameter)} ${argumentName}`)
                    stubArgumentNames.push(argumentName)
                    requestSetters.push(`request.${argumentName} = ${argumentName};`)
                }

                for (const [name, parameter] of Object.entries(operation.query ?? {})) {
                    const argumentName = `query${upperFrist(name)}`
                    stubArguments.push(`@RequestParam("${name}") ${getSignature(parameter)} ${argumentName}`)
                    stubArgumentNames.push(argumentName)
                    requestSetters.push(`request.${argumentName} = ${argumentName};`)
                }

                for (const [name, parameter] of Object.entries(operation.header ?? {})) {
                    const argumentName = `header${upperFrist(name)}`
                    stubArguments.push(`@RequestHeader("${name}") ${getSignature(parameter)} ${argumentName}`)
                    stubArgumentNames.push(argumentName)
                    requestSetters.push(`request.${argumentName} = ${argumentName};`)
                }

                if (operation.content) {
                    stubArguments.push(`@RequestBody ${getSignature(operation.content)} body`)
                    requestSetters.push(`request.content = content;`)
                }

                const variantSwitch: string[] = []

                for (const [name, variant] of Object.entries(operation.responses)) {

                    const variantName = `${responseName}${upperFrist(name)}`

                    const headers: string[] = []

                    for (const [headerName, parameter] of Object.entries(variant.header ?? {})) {
                        headers.push(`.header("${headerName}", name.header${upperFrist(headerName)})`)
                    }

                    variantSwitch.push(`
                        case ${className}.${operationName}Response.${variantName} ${name} -> ResponseEntity
                            .status(${variant.status})
                            .contentType(MediaType.parseMediaType("${variant.contentType}"))
                            .body(${name}.content)
                            .build();
                    `)
                }

                operationStubCodes.push(`
                    ${parseMappingAnnotation(operation.method, route.path)}
                    public ResponseEntity<?> ${operationName}(
                        ${stubArguments.join(',\n')}
                    ){
                        ${className}.${requestName} request = new ${className}.${requestName}();

                        ${requestSetters.join('\n')}

                        var result = impl.${operationName}(request);

                        return switch(result){
                            ${variantSwitch.join('\n')}
                        };
                    }
                `)

                responseCodes.push(`
                public sealed interface ${responseName} permits ${variantNames.map(o => [responseName, o].join('.')).join()} {
                    
                    ${responseVariantsCodes.join('\n\n')}
                }    
                `)
            }

        }

        writeFile(outputfile, `
            package ${packageId};
            
            /**
             * ${model.description ?? ''}
             */
            public interface ${className} {
                ${operationCodes.join('\n\n')}

                ${requestCodes.join('\n\n')}

                ${responseCodes.join('\n\n')}
            }
        `)

        writeFile(stubOutputFile, `
            package ${packageId};
            
            @RestController
            @RequestMapping("${model.path}")
            public class ${className}Stub {

                private ${className} impl;

                public ${className}Stub(${className} impl){
                    this.impl = impl;
                }

                ${operationStubCodes.join('\n\n')}
            }
        `)
    }
})

function parseMappingAnnotation(method: string, path: string) {
    switch (method) {
        case 'GET': return `@GetMapping("${path}")`
        case 'POST': return `@PostMapping("${path}")`
        case 'PUT': return `@PutMapping("${path}")`
        case 'DELETE': return `@DeleteMapping("${path}")`
        case 'PATCH': return `@PatchMapping("${path}")`
        case 'HEAD': return `@RequestMapping(path = "${path}", method = RequestMethod.HEAD)`
        case 'OPTIONS': return `@RequestMapping(path = "${path}", method = RequestMethod.OPTIONS)`
        case 'TRACE': return `@RequestMapping(path = "${path}", method = RequestMethod.TRACE)`
        default: return 'never'
    }
}

function upperFrist(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1)
}

export async function format(code: string): Promise<string> {
    return await prettier.format(code, {
        parser: 'java',
        plugins: [javaPlugin],
        tabWidth: 4,
    })
}