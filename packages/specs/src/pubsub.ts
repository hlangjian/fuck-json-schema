import type { Models } from "./types"

export type PubSubProtocol = "kafka" | "rabbitmq" | "redis" | "nats"

export interface ChannelModel {
  kind: "channel"
  id: string
  payload: Models
  description?: string
  deprecated?: boolean
}

export interface BrokerModel {
  kind: "broker"
  id: string
  description?: string
  protocols: PubSubProtocol[]
  channels: Record<string, ChannelModel>
}

export function channel(options: {
  payload: Models
  description?: string
  deprecated?: boolean
}): ChannelModel {
  return { kind: "channel", id: options.payload.id, ...options }
}

export function broker(options: {
  id: string
  description?: string
  protocols: PubSubProtocol[]
  channels: Record<string, ChannelModel>
}): BrokerModel {
  return { kind: "broker", ...options }
}
