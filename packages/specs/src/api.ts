import {
  type BooleanModel,
  type DatetimeModel,
  type DateModel,
  type DurationModel,
  type Float32Model,
  type Float64Model,
  type Int32Model,
  type Models,
  type RecordModel,
  type StringModel,
} from "./types"
import type { ExtractPathParams } from "./utils"

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS" | "HEAD" | "TRACE"

export type SimpleType =
  | Int32Model
  | Float32Model
  | Float64Model
  | StringModel
  | BooleanModel
  | DatetimeModel
  | DateModel
  | DurationModel

export interface RouterModel {
  basePath?: string
  name: string
  routes: Record<
    string,
    RouteModel<
      string,
      Record<string, SimpleType>,
      Models,
      RecordModel<Record<string, Models>, string>,
      RecordModel<Record<string, Models>, string>,
      Record<number, ResponseModel<Models, RecordModel<Record<string, Models>, string>>>
    >
  >
}

export interface RouteModel<
  Path extends string,
  Variables extends Record<string, SimpleType>,
  Body extends Models,
  Queries extends RecordModel<Record<string, Models>, string>,
  Headers extends RecordModel<Record<string, Models>, string>,
  Responses extends Record<number, ResponseModel<Models, RecordModel<Record<string, Models>, string>>>,
> {
  kind: "route"
  method: HttpMethod
  contentType?: string
  summary?: string
  description?: string
  path: Path
  variables?: Variables
  body?: Body
  headers?: Headers
  queries?: Queries
  responses: Responses
  tags?: string[]
}

export type ResponseModel<Body extends Models, Headers extends RecordModel<Record<string, Models>, string>> =
  | JsonResponseModel<Body, Headers>
  | StreamResponseModel<Body, Headers>
  | SSEResponseModel<Body, Headers>
  | BinaryResponseModel<Headers>

export interface JsonResponseModel<Body extends Models, Headers extends RecordModel<Record<string, Models>, string>> {
  kind: "json-response"
  contentType?: PlainTextLikeContentType | JsonLikeContentType
  summary?: string
  body?: Body
  headers?: Headers
}

export interface StreamResponseModel<Body extends Models, Headers extends RecordModel<Record<string, Models>, string>> {
  kind: "stream-response"
  contentType?: JsonStreamLikeContentType
  summary?: string
  body?: Body
  headers?: Headers
}

export interface SSEResponseModel<Body extends Models, Headers extends RecordModel<Record<string, Models>, string>> {
  kind: "sse-response"
  contentType?: PlainTextStreamLikeContentType
  summary?: string
  body?: Body
  headers?: Headers
}

export interface BinaryResponseModel<Headers extends RecordModel<Record<string, Models>, string>> {
  kind: "binary"
  contentType?: BinaryLikeContentType
  summary?: string
  headers?: Headers
}

export interface RouteOptions<
  Path extends string,
  Variables extends Record<ExtractPathParams<Path>, SimpleType>,
  Body extends Models,
  Queries extends RecordModel<Record<string, Models>, string>,
  Headers extends RecordModel<Record<string, Models>, string>,
  Responses extends Record<string, ResponseModel<Models, RecordModel<Record<string, Models>, string>>>,
> extends Omit<RouteModel<string, Variables, Body, Queries, Headers, Responses>, "kind"> {}

export function route<
  Path extends string,
  Variables extends Record<ExtractPathParams<Path>, SimpleType>,
  Body extends Models,
  Queries extends RecordModel<Record<string, Models>, string>,
  Headers extends RecordModel<Record<string, Models>, string>,
  Responses extends Record<string, ResponseModel<Models, RecordModel<Record<string, Models>, string>>>,
>(
  options: RouteOptions<Path, Variables, Body, Queries, Headers, Responses>,
): RouteModel<Path, Variables, Body, Queries, Headers, Responses> {
  return { kind: "route", ...options } as RouteModel<Path, Variables, Body, Queries, Headers, Responses>
}

export interface ResponseOptions<Body extends Models, Headers extends RecordModel<Record<string, Models>, string>> {
  contentType?: string
  summary?: string
  body?: Body
  headers?: Headers
}

export function json<Body extends Models, Headers extends RecordModel<Record<string, Models>, string>>(
  options: ResponseOptions<Body, Headers>,
): JsonResponseModel<Body, Headers> {
  return { kind: "json-response", ...options }
}

export function jsonStream<Body extends Models, Headers extends RecordModel<Record<string, Models>, string>>(
  options: ResponseOptions<Body, Headers>,
): StreamResponseModel<Body, Headers> {
  return { kind: "stream-response", ...options }
}

export function sseStream<Body extends Models, Headers extends RecordModel<Record<string, Models>, string>>(
  options: ResponseOptions<Body, Headers>,
): SSEResponseModel<Body, Headers> {
  return { kind: "sse-response", ...options }
}

export interface BinaryResponseOptions<Headers extends RecordModel<Record<string, Models>, string>> {
  contentType?: BinaryLikeContentType
  summary?: string
  headers?: Headers
}

export function binary<Headers extends RecordModel<Record<string, Models>, string>>(
  options: BinaryResponseOptions<Headers>,
): BinaryResponseModel<Headers> {
  return { kind: "binary", ...options }
}

export type PlainTextLikeContentType =
  | (string & {})
  | "text/plain"
  | "text/html"
  | "text/css"
  | "text/xml"
  | "text/markdown"
  | "text/csv"

export type JsonLikeContentType =
  | (string & {})
  | "application/json"
  | "application/json; charset=utf-8"
  | "application/ld+json"
  | "application/hal+json"
  | "application/vnd.api+json"
  | "application/problem+json"
  | "application/schema+json"

export type PlainTextStreamLikeContentType = (string & {}) | "text/event-stream"

export type JsonStreamLikeContentType =
  | (string & {})
  | "application/ndjson"
  | "application/x-ndjson"
  | "application/jsonl"
  | "application/json-seq"
  | "application/stream+json"

export type BinaryLikeContentType =
  | (string & {})
  | "application/octet-stream"
  | "application/pdf"
  | "application/zip"
  | "application/gzip"
  | "image/jpeg"
  | "image/png"
  | "image/gif"
  | "image/webp"
  | "image/svg+xml"
  | "audio/mpeg"
  | "audio/wav"
  | "video/mp4"
  | "video/webm"

export type FormLikeContentType = (string & {}) | "application/x-www-form-urlencoded" | "multipart/form-data"
