import type { RouterModel, Models, RecordModel } from "@huanglangjian/specs"
import { collectOperations, collectSchemaMap } from "@huanglangjian/specs"
import type { OperationDescriptor, SchemaMap } from "@huanglangjian/specs"
import { groupBy } from "@huanglangjian/specs"
import { camelCase, pascalCase } from "text-case"

import {
  generateModels,
  toDotnetType,
  toDotnetPropertyName,
  typeXmlDoc,
  opXmlDoc,
  modelDefault,
  addModelsToSchemaMap,
  statusCodeToMethod,
  generateCsproj,
  filePrologue,
  type DotnetProjectOptions,
} from "./shared"

export { type DotnetProjectOptions }

export interface DotnetServerOptions {
  routers: RouterModel[]
  namespace?: string
  projectName?: string
  project?: DotnetProjectOptions
  identifier?: (id: string) => string
  configuration?: RecordModel<Record<string, Models>, string>
  models?: Models[]
}

export function generateDotnetServer(options: DotnetServerOptions): Record<string, string> {
  const {
    routers,
    namespace = "Api",
    projectName,
    project = {},
    identifier = pascalCase,
    configuration,
    models,
  } = options

  const operations = collectOperations(routers)

  const schemaMap = collectSchemaMap(operations)

  if (models) addModelsToSchemaMap(models, schemaMap)

  if (configuration) addModelsToSchemaMap([configuration as Models], schemaMap)

  const projName = projectName ?? `${namespace}.Server`

  const pf = (p: string) => `${projName}/${p}`

  const files: Record<string, string> = {}

  files[pf(`${projName}.csproj`)] = generateCsproj(project, "server", namespace)

  const modelsCode = generateModels(schemaMap, identifier, namespace)

  if (modelsCode.trim()) files[pf("Models.cs")] = modelsCode

  files[pf("ClosedAttribute.cs")] = `namespace System.Runtime.CompilerServices;\n\n[AttributeUsage(AttributeTargets.Class, AllowMultiple = false, Inherited = false)]\npublic sealed class ClosedAttribute : Attribute { }`

  for (const operation of operations) {
    const dir = pascalCase(operation.group)

    const fileName = pascalCase(operation.id)

    files[pf(`Endpoints/${dir}/${fileName}.cs`)] = generateEndpointFile(
      operation,
      schemaMap,
      identifier,
      namespace,
    )
  }

  const groups = groupBy(operations, (op) => op.group)

  for (const [group, groupOps] of Object.entries(groups)) {
    const dir = pascalCase(group)

    files[pf(`Endpoints/${dir}/${dir}Endpoints.cs`)] = generateEndpointAggregator(
      group,
      groupOps,
      namespace,
    )
  }

  files[pf("ServiceCollectionExtensions.cs")] = generateDiExtension(groups, namespace)

  if (configuration) {
    files[pf("Config.cs")] = generateConfig(configuration, identifier, namespace, schemaMap)
  }

  return files
}

function generateEndpointFile(
  operation: OperationDescriptor,
  schemaMap: SchemaMap,
  identifier: (s: string) => string,
  namespace: string,
): string {
  const lines: string[] = []

  const opName = pascalCase(operation.id)

  const ns = `${namespace}.${pascalCase(operation.group)}`

  const hasBody = operation.requestModel != null && operation.requestModel.kind !== "null"

  const handlerType = `I${opName}Handler`

  const responseType = `${opName}Response`

  lines.push(filePrologue(ns))

  lines.push("")

  const doc = opXmlDoc(operation)

  if (doc) lines.push(doc)

  const handlerParams: string[] = []

  for (const [, v] of Object.entries(operation.pathVariables)) {
    handlerParams.push(`${toDotnetType(v.model, schemaMap, identifier)} ${toDotnetPropertyName(v.name)}`)
  }

  for (const [name, q] of Object.entries(operation.queries)) {
    const t = toDotnetType(q.model, schemaMap, identifier)

    handlerParams.push(`${t}${q.required ? "" : "?"} ${toDotnetPropertyName(name)}`)
  }

  for (const [name, h] of Object.entries(operation.headers)) {
    const t = toDotnetType(h.model, schemaMap, identifier)

    handlerParams.push(`${t}${h.required ? "" : "?"} ${toDotnetPropertyName(name)}`)
  }

  if (hasBody) {
    handlerParams.push(`${toDotnetType(operation.requestModel!, schemaMap, identifier)} body`)
  }

  lines.push(`public interface ${handlerType}`)

  lines.push(`{`)

  const hps = handlerParams.length > 0 ? `${handlerParams.join(", ")}, ` : ""

  lines.push(`    Task<${responseType}> HandleAsync(${hps}CancellationToken ct = default);`)

  lines.push(`}`)

  lines.push("")

  lines.push(`public abstract record ${responseType}`)

  lines.push(`{`)

  for (const r of operation.responses) {
    const variantName = statusCodeToPascalCase(r.status, r.kind, r.model)

    if (r.model != null) {
      lines.push(`    public sealed record ${variantName}(${toDotnetType(r.model, schemaMap, identifier)} Body) : ${responseType};`)
    } else {
      lines.push(`    public sealed record ${variantName} : ${responseType};`)
    }
  }

  lines.push(`}`)

  lines.push("")

  lines.push(`internal static class ${opName}Endpoint`)

  lines.push(`{`)

  lines.push(`    internal static RouteHandlerBuilder Map(`)

  lines.push(`        IEndpointRouteBuilder app,`)

  lines.push(`        ${handlerType} handler)`)

  lines.push(`    {`)

  const lambdaParams: string[] = []

  for (const [, v] of Object.entries(operation.pathVariables)) {
    const dn = toDotnetPropertyName(v.name)

    lambdaParams.push(`[FromRoute] ${toDotnetType(v.model, schemaMap, identifier)} ${dn}`)
  }

  for (const [name, q] of Object.entries(operation.queries)) {
    const dn = toDotnetPropertyName(name)

    const t = toDotnetType(q.model, schemaMap, identifier)

    if (q.required) {
      lambdaParams.push(`[FromQuery] ${t} ${dn}`)
    } else {
      lambdaParams.push(`[FromQuery] ${t}? ${dn} = default`)
    }
  }

  for (const [name, h] of Object.entries(operation.headers)) {
    const dn = toDotnetPropertyName(name)

    lambdaParams.push(`[FromHeader(Name = "${name}")] ${toDotnetType(h.model, schemaMap, identifier)}${h.required ? "" : "?"} ${dn}`)
  }

  if (hasBody) {
    lambdaParams.push(`[FromBody] ${toDotnetType(operation.requestModel!, schemaMap, identifier)} body`)
  }

  lambdaParams.push("CancellationToken ct")

  const mapMethod = `Map${pascalCase(operation.method)}`

  lines.push(`        return app.${mapMethod}("${operation.path}", async (${lambdaParams.join(", ")}) =>`)

  lines.push(`        {`)

  lines.push(`            var response = await handler.HandleAsync(`)

  const callArgs: string[] = []

  for (const [, v] of Object.entries(operation.pathVariables)) callArgs.push(toDotnetPropertyName(v.name))

  for (const [name] of Object.entries(operation.queries)) callArgs.push(toDotnetPropertyName(name))

  for (const [name] of Object.entries(operation.headers)) callArgs.push(toDotnetPropertyName(name))

  if (hasBody) callArgs.push("body")

  callArgs.push("ct")

  lines.push(`                ${callArgs.join(", ")});`)

  lines.push("")

  lines.push(`            return response switch`)

  lines.push(`            {`)

  for (const r of operation.responses) {
    const variantName = statusCodeToPascalCase(r.status, r.kind, r.model)

    const methodName = statusCodeToMethod(r.status)

    if (r.model != null) {
      lines.push(`                ${responseType}.${variantName} b => TypedResults.${methodName}(b.Body),`)
    } else {
      lines.push(`                ${responseType}.${variantName} => TypedResults.${methodName}(),`)
    }
  }

  lines.push(`                _ => TypedResults.Problem()`)

  lines.push(`            };`)

  lines.push(`        });`)

  lines.push(`    }`)

  lines.push(`}`)

  return lines.join("\n") + "\n"
}

function statusCodeToPascalCase(
  status: number,
  kind: string,
  responseModel: Models | null,
): string {
  const httpName = statusCodeToMethod(status)

  if (kind === "stream-response" || kind === "sse-response") {
    return responseModel ? `${httpName}Stream` : `${httpName}Empty`
  }

  if (kind === "binary") return responseModel ? `${httpName}Binary` : `${httpName}Empty`

  if (responseModel == null) return `${httpName}Empty`

  return httpName
}

function generateEndpointAggregator(
  group: string,
  operations: OperationDescriptor[],
  namespace: string,
): string {
  const lines: string[] = []

  const groupPascal = pascalCase(group)

  const ns = `${namespace}.${groupPascal}`

  lines.push(`namespace ${ns};`)

  lines.push("")

  lines.push(`public interface I${groupPascal}Router`)

  lines.push(`{`)

  for (const op of operations) {
    const opName = pascalCase(op.id)

    lines.push(`    I${opName}Handler ${opName} { get; }`)
  }

  lines.push(`}`)

  lines.push("")

  lines.push(`public static class ${groupPascal}Endpoints`)

  lines.push(`{`)

  lines.push(`    public static IEndpointRouteBuilder Map${groupPascal}Api(`)

  lines.push(`        this IEndpointRouteBuilder app)`)

  lines.push(`    {`)

  lines.push(`        var router = app.ServiceProvider.GetRequiredService<I${groupPascal}Router>();`)

  lines.push("")

  for (const op of operations) {
    lines.push(`        app.Map(router.${pascalCase(op.id)});`)
  }

  lines.push(`        return app;`)

  lines.push(`    }`)

  lines.push("")

  lines.push(`    internal static RouteHandlerBuilder Map(`)

  lines.push(`        IEndpointRouteBuilder app,`)

  for (const op of operations) {
    lines.push(`        I${pascalCase(op.id)}Handler handler${camelCase(op.id)},`)
  }

  lines.push(`    )`)

  lines.push(`    {`)

  for (const op of operations) {
    lines.push(`        ${pascalCase(op.id)}Endpoint.Map(app, handler${camelCase(op.id)});`)
  }

  lines.push(`        return (RouteHandlerBuilder)app;`)

  lines.push(`    }`)

  lines.push(`}`)

  return lines.join("\n") + "\n"
}

function generateDiExtension(
  groups: Record<string, OperationDescriptor[]>,
  namespace: string,
): string {
  if (Object.keys(groups).length === 0) return ""

  const lines: string[] = []

  lines.push(filePrologue(namespace))

  lines.push("")

  lines.push(`using Microsoft.Extensions.DependencyInjection;`)

  lines.push("")

  lines.push(`public static class ServiceCollectionExtensions`)

  lines.push(`{`)

  for (const [group] of Object.entries(groups)) {
    const groupPascal = pascalCase(group)

    lines.push(`    public static IServiceCollection Add${groupPascal}Router<TRouter>(`)

    lines.push(`        this IServiceCollection services)`)

    lines.push(`        where TRouter : class, I${groupPascal}Router`)

    lines.push(`    {`)

    lines.push(`        services.AddScoped<I${groupPascal}Router, TRouter>();`)

    lines.push(`        return services;`)

    lines.push(`    }`)

    lines.push("")
  }

  lines.push(`}`)

  return lines.join("\n") + "\n"
}

function generateConfig(
  config: RecordModel<Record<string, Models>, string>,
  identifier: (s: string) => string,
  namespace: string,
  schemaMap: SchemaMap,
): string {
  const lines: string[] = []

  const configTypeName = identifier(config.id)

  // It's generateConfig
  lines.push(filePrologue(namespace))

  lines.push("")

  lines.push(`using Microsoft.Extensions.Configuration;`)

  lines.push("")

  const doc = typeXmlDoc(config)

  if (doc) lines.push(doc)

  lines.push(`public static class ${configTypeName}Config`)

  lines.push(`{`)

  lines.push(`    public static ${configTypeName} FromConfiguration(IConfiguration configuration)`)

  lines.push(`    {`)

  lines.push(`        return new ${configTypeName}`)

  lines.push(`        {`)

  for (const [propName, propModel] of Object.entries(config.properties)) {
    const dotnetName = toDotnetPropertyName(propName)

    const envKey = `${pascalCase(config.id)}__${dotnetName}`

    if (propModel.kind === "union" || propModel.kind === "record") {
      lines.push(`            ${dotnetName} = Parse${dotnetName}(configuration),`)
    } else {
      const dotnetType = toDotnetType(propModel, schemaMap, identifier)

      const defaultValue = modelDefault(propModel)

      const isRequired = !(config.required as string[]).includes(propName as any)

      if (defaultValue !== undefined) {
        lines.push(`            ${dotnetName} = configuration.GetValue("${envKey}", ${JSON.stringify(defaultValue)}),`)
      } else if (isRequired) {
        lines.push(`            ${dotnetName} = configuration.GetValue<${dotnetType}?>("${envKey}"),`)
      } else {
        lines.push(`            ${dotnetName} = configuration.GetValue<${dotnetType}>("${envKey}")!,`)
      }
    }
  }

  lines.push(`        };`)

  lines.push(`    }`)

  lines.push(`}`)

  return lines.join("\n") + "\n"
}
