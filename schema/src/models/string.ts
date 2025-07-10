import type { Model } from "./meta"

export interface StringModel extends Model<string> {
    readonly type: 'string'
    readonly format?: string
    readonly maxLength?: number
    readonly minLength?: number
    readonly pattern?: string
}

export const JsonSchemaStringFormat = {
    dateTime: "date-time",
    date: "date",
    time: "time",
    duration: "duration",
    email: "email",
    idnEmail: "idn-email",
    hostname: "hostname",
    idnHostname: "idn-hostname",
    ipv4: "ipv4",
    ipv6: "ipv6",
    uri: "uri",
    uriReference: "uri-reference",
    iri: "iri",
    iriReference: "iri-reference",
    uuid: "uuid",
    uriTemplate: "uri-template",
    jsonPointer: "json-pointer",
    relativeJsonPointer: "relative-json-pointer",
    regex: "regex",
} as const