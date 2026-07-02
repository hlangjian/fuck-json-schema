import type { RouterModel, Models } from "@huanglangjian/specs"
import { collectOperations, collectSchemaMap } from "@huanglangjian/specs"
import type { OperationDescriptor, SchemaMap } from "@huanglangjian/specs"
import { groupBy } from "@huanglangjian/specs"
import { camelCase, pascalCase } from "text-case"

import {
  generateModels,
  toDotnetType,
  opXmlDoc,
  addModelsToSchemaMap,
  generateCsproj,
  filePrologue,
  type DotnetProjectOptions,
} from "./shared"

export { type DotnetProjectOptions }

export interface DotnetClientOptions {
  routers: RouterModel[]
  namespace?: string
  projectName?: string
  project?: DotnetProjectOptions
  identifier?: (id: string) => string
  models?: Models[]
}

export function generateDotnetClient(options: DotnetClientOptions): Record<string, string> {
  const { routers, namespace = "Api.Client", projectName, project = {}, identifier = pascalCase, models } = options

  const operations = collectOperations(routers)

  const schemaMap = collectSchemaMap(operations)

  if (models) addModelsToSchemaMap(models, schemaMap)

  const projName = projectName ?? `${namespace}.Client`

  const pf = (p: string) => `${projName}/${p}`

  const files: Record<string, string> = {}

  files[pf(`${projName}.csproj`)] = generateCsproj(project, "client", namespace)

  const modelsCode = generateModels(schemaMap, identifier, namespace)

  if (modelsCode.trim()) files[pf("Models.cs")] = modelsCode

  files[pf("ClosedAttribute.cs")] = `namespace System.Runtime.CompilerServices;\n\n[AttributeUsage(AttributeTargets.Class, AllowMultiple = false, Inherited = false)]\npublic sealed class ClosedAttribute : Attribute { }`

  for (const operation of operations) {
    const dir = pascalCase(operation.group)

    const fileName = pascalCase(operation.id)

    files[pf(`Clients/${dir}/${fileName}.cs`)] = generateClientMethodFile(
      operation,
      schemaMap,
      identifier,
      namespace,
    )
  }

  const clientGroups = groupBy(operations, (op) => op.group)

  for (const [group, groupOps] of Object.entries(clientGroups)) {
    const dir = pascalCase(group)

    files[pf(`Clients/${dir}/${dir}Client.cs`)] = generateClientClass(
      group,
      groupOps,
      namespace,
      schemaMap,
      identifier,
    )
  }

  return files
}

function generateClientMethodFile(
  operation: OperationDescriptor,
  schemaMap: SchemaMap,
  identifier: (s: string) => string,
  namespace: string,
): string {
  const lines: string[] = []

  const opName = pascalCase(operation.id)

  const ns = `${namespace}.${pascalCase(operation.group)}`

  const hasBody = operation.requestModel != null && operation.requestModel.kind !== "null"

  const hasQuery = Object.keys(operation.queries).length > 0

  const hasHeaders = Object.keys(operation.headers).length > 0

  const responseType = `${opName}Response`

  lines.push(filePrologue(ns))

  lines.push("")

  const doc = opXmlDoc(operation)

  if (doc) lines.push(doc)

  lines.push(`public abstract record ${responseType}`)

  lines.push(`{`)

  for (const r of operation.responses) {
    const variantName = clientResponseVariantName(r.status, r.kind, r.model)

    if (r.model != null) {
      lines.push(`    public sealed record ${variantName}(${toDotnetType(r.model, schemaMap, identifier)} Body) : ${responseType};`)
    } else {
      lines.push(`    public sealed record ${variantName} : ${responseType};`)
    }
  }

  lines.push(`}`)

  lines.push("")

  lines.push(`internal static class ${opName}Client`)

  lines.push(`{`)

  const methodParams: string[] = ["HttpClient http"]

  for (const [, v] of Object.entries(operation.pathVariables)) {
    methodParams.push(`${toDotnetType(v.model, schemaMap, identifier)} ${camelCase(v.name)}`)
  }

  for (const [name, q] of Object.entries(operation.queries)) {
    const t = toDotnetType(q.model, schemaMap, identifier)

    methodParams.push(`${t}${q.required ? "" : "?"} ${camelCase(name)} = null`)
  }

  if (hasHeaders) {
    methodParams.push("Dictionary<string, string>? headers = null")
  }

  if (hasBody) {
    methodParams.push(`${toDotnetType(operation.requestModel!, schemaMap, identifier)} body`)
  }

  methodParams.push("CancellationToken ct = default")

  lines.push(`    internal static async Task<${responseType}> ${opName}Async(${methodParams.join(", ")})`)

  lines.push(`    {`)

  const pathTemplate = operation.path.replace(/\{(\w+)\}/g, (_, name) => `{${camelCase(name)}}`)

  lines.push(`        var url = $"${pathTemplate}"`)

  if (hasQuery) {
    const queryParts: string[] = []

    for (const [name, q] of Object.entries(operation.queries)) {
      const dn = camelCase(name)

      if (q.model.kind === "array" || q.model.kind === "set") {
        queryParts.push(`if (${dn}?.Count > 0) foreach (var item in ${dn}) parts.Add("${name}=" + Uri.EscapeDataString(item.ToString()!));`)
      } else {
        queryParts.push(`if (${dn} != null) parts.Add("${name}=" + Uri.EscapeDataString(${dn}.ToString()!));`)
      }
    }

    if (queryParts.length > 0) {
      lines.push(`        var parts = new List<string>();`)

      lines.push(...queryParts.map((s) => `        ${s}`))

      lines.push(`        if (parts.Count > 0) url += "?" + string.Join("&", parts);`)
    }
  }

  lines.push("")

  lines.push(`        using var request = new HttpRequestMessage(HttpMethod.${pascalCase(operation.method)}, url);`)

  if (hasHeaders) {
    lines.push(`        if (headers != null)`)

    lines.push(`            foreach (var (k, v) in headers) request.Headers.TryAddWithoutValidation(k, v);`)
  }

  if (hasBody) {
    lines.push(`        request.Content = JsonContent.Create(body);`)
  }

  lines.push("")

  lines.push(`        using var response = await http.SendAsync(request, ct);`)

  lines.push(`        return response.StatusCode switch`)

  lines.push(`        {`)

  for (const r of operation.responses) {
    const variantName = clientResponseVariantName(r.status, r.kind, r.model)

    const statusName = httpStatusName(r.status)

    if (r.kind === "binary") {
      if (r.model != null) {
        lines.push(`            System.Net.HttpStatusCode.${statusName} => new ${responseType}.${variantName}(await response.Content.ReadAsByteArrayAsync(ct)),`)
      } else {
        lines.push(`            System.Net.HttpStatusCode.${statusName} => new ${responseType}.${variantName}(),`)
      }
    } else if (r.model != null) {
      const bodyType = toDotnetType(r.model, schemaMap, identifier)

      lines.push(`            System.Net.HttpStatusCode.${statusName} => new ${responseType}.${variantName}(await response.Content.ReadFromJsonAsync<${bodyType}>(ct: ct)!),`)
    } else {
      lines.push(`            System.Net.HttpStatusCode.${statusName} => new ${responseType}.${variantName}(),`)
    }
  }

  lines.push(`            _ => throw new HttpRequestException($"${operation.method} ${operation.path} failed: {response.StatusCode}")`)

  lines.push(`        };`)

  lines.push(`    }`)

  lines.push(`}`)

  return lines.join("\n") + "\n"
}

function httpStatusName(status: number): string {
  const map: Record<number, string> = {
    200: "OK",
    201: "Created",
    204: "NoContent",
    301: "Moved",
    302: "Found",
    400: "BadRequest",
    401: "Unauthorized",
    403: "Forbidden",
    404: "NotFound",
    409: "Conflict",
    500: "InternalServerError",
    501: "NotImplemented",
    503: "ServiceUnavailable",
  }

  return map[status] ?? status.toString()
}

function clientResponseVariantName(status: number, kind: string, responseModel: Models | null): string {
  const httpName = pascalCase(httpStatusName(status))

  if (kind === "stream-response" || kind === "sse-response") return responseModel ? `${httpName}Stream` : httpName

  if (kind === "binary") return responseModel ? `${httpName}Binary` : httpName

  if (responseModel == null) return `${httpName}Empty`

  return httpName
}

function generateClientClass(
  group: string,
  operations: OperationDescriptor[],
  namespace: string,
  schemaMap: SchemaMap,
  identifier: (s: string) => string,
): string {
  const lines: string[] = []

  const groupPascal = pascalCase(group)

  lines.push(filePrologue(`${namespace}.${groupPascal}`))

  lines.push("")

  lines.push(`public class ${groupPascal}Client`)

  lines.push(`{`)

  lines.push(`    private readonly HttpClient _http;`)

  lines.push("")

  lines.push(`    public ${groupPascal}Client(HttpClient http)`)

  lines.push(`    {`)

  lines.push(`        _http = http;`)

  lines.push(`    }`)

  lines.push("")

  for (const op of operations) {
    const opName = pascalCase(op.id)

    const methodName = pascalCase(op.id)

    const params: string[] = []

    for (const [, v] of Object.entries(op.pathVariables)) {
      params.push(`${toDotnetType(v.model, schemaMap, identifier)} ${v.name}`)
    }

    for (const [name, q] of Object.entries(op.queries)) {
      const t = toDotnetType(q.model, schemaMap, identifier)

      params.push(`${t}${q.required ? "" : "?"} ${name} = null`)
    }

    if (op.requestModel != null && op.requestModel.kind !== "null") {
      params.push(`${toDotnetType(op.requestModel, schemaMap, identifier)} body`)
    }

    params.push("CancellationToken ct = default")

    lines.push(`    public Task<${opName}Response> ${methodName}Async(${params.join(", ")})`)

    lines.push(`    {`)

    const callArgs: string[] = ["_http"]

    for (const [, v] of Object.entries(op.pathVariables)) callArgs.push(v.name)

    for (const [name] of Object.entries(op.queries)) callArgs.push(name)

    if (Object.keys(op.headers).length > 0) callArgs.push("null")

    if (op.requestModel != null && op.requestModel.kind !== "null") callArgs.push("body")

    callArgs.push("ct")

    lines.push(`        return ${opName}Client.${opName}Async(${callArgs.join(", ")});`)

    lines.push(`    }`)

    lines.push("")
  }

  lines.push(`}`)

  return lines.join("\n") + "\n"
}
