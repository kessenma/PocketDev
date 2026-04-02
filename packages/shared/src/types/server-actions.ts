export type ServerMetricTone = 'healthy' | 'warning' | 'critical' | 'neutral'

export interface ServerActionsSummary {
  serverLabel: string
  uptime: string
  metrics: ServerMetricEntry[]
  incidentCount: number
  generatedAt: string
}

export interface ServerMetricEntry {
  id: 'cpu' | 'memory' | 'storage' | 'load'
  label: string
  value: string
  detail: string
  tone: ServerMetricTone
}

export interface ServerPortEntry {
  id: string
  port: number
  protocol: 'tcp' | 'udp'
  service: string
  process: string
  exposure: 'public' | 'private' | 'local'
  status: 'listening' | 'busy' | 'closed'
}

export interface ServerNetworkEntry {
  id: string
  interface: string
  inbound: string
  outbound: string
  connections: number
  detail: string
}

export interface ServerErrorEntry {
  id: string
  severity: 'critical' | 'warning' | 'info'
  title: string
  source: string
  relativeTime: string
  detail: string
  suggestion: string
}

export interface ServerActionDefinition {
  id: string
  label: string
  description: string
}

export interface ServerActionResult {
  actionId: string
  output: string
  exitCode: number
}
