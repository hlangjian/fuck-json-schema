/**
 * (Experimental): Traits Models
 */
import { type TypeModels } from "./basic"
import type { InferDeserialized } from "./serialize"

type SimplifyFunction<T extends (...args: any[]) => any> = T extends (...args: infer Args) => infer R
  ? (...args: Args) => R
  : never

export interface MethodModel<
  Args extends [string, TypeModels][],
  Ret extends TypeModels,
  TFunc = SimplifyFunction<InferMethod<Args, Ret>>,
> {
  args: Args
  ret: Ret
  as<T extends TFunc = TFunc>(): MethodModel<Args, Ret, T>
  description?: string
}

export interface MethodModelOptions<Args extends [string, TypeModels][], Ret extends TypeModels> {
  args: Args
  ret: Ret
  description?: string
}

type InferArgs<Args extends [string, TypeModels][]> = {
  [key in keyof Args]: Args[key] extends [string, infer R] ? InferDeserialized<R> : never
}

type InferMethod<Args extends [string, TypeModels][], Ret extends TypeModels> = (
  ...args: InferArgs<Args>
) => InferDeserialized<Ret>

export function method<const Args extends [string, TypeModels][], Ret extends TypeModels>(
  options: MethodModelOptions<Args, Ret>,
): MethodModel<Args, Ret> {
  const result = { ...options, as: () => result }
  return result
}

export interface TraitModel<T extends { [key: string]: MethodModel<[string, TypeModels][], TypeModels, any> }> {
  kind: "trait"
  id: string
  methods: T
}

export type InferTraits<T extends { [key: string]: MethodModel<[string, TypeModels][], TypeModels, any> }> = {
  [key in keyof T]: T[key] extends MethodModel<any, any, infer Func> ? Func : never
}

export function traits<T extends { [key: string]: MethodModel<[string, TypeModels][], TypeModels, any> }>(options: {
  methods: T
  id: string
}): TraitModel<T> {
  return { kind: "trait", ...options }
}
