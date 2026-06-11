import type { Models } from "./types"

export interface RpcModel<Parameters extends Record<string, Models>, Results extends Record<string, Models>> {
  kind: "rpc"
  parameters: Parameters
  results: Results
}

export interface RpcModelOptions<Parameters extends Record<string, Models>, Results extends Record<string, Models>> {
  parameters: Parameters
  results: Results
}

export function rpc<Parameters extends Record<string, Models>, Results extends Record<string, Models>>(
  options: RpcModelOptions<Parameters, Results>,
): RpcModel<Parameters, Results> {
  return { kind: "rpc", ...options }
}
