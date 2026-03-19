export interface PipeNode {
  id: string
  label: string
  x: number
  y: number
  type: 'manhole' | 'junction' | 'entry'
}

export interface PipeSegment {
  id: string
  fromNode: string
  toNode: string
  riskLevel: number
  temperatureC: number
  humidityPct: number
  activeAlerts: number
  length: number
  lastInspected: string
}

export interface PipeAlert {
  id: string
  segmentId: string
  progress: number
  severity: 'critical' | 'warning' | 'info'
  label: string
}

export interface RobotOnMap {
  id: string
  name: string
  segmentId: string
  progress: number
  direction: 1 | -1
  batteryPct: number
  speedKmh: number
  status: 'moving' | 'inspecting' | 'idle'
}

export interface CrossSectionSensor {
  id: string
  label: string
  type: 'temperature' | 'humidity' | 'gas' | 'water' | 'camera'
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
  value: string
  status: 'normal' | 'warning' | 'danger'
}

export interface SpatialPageResponse {
  nodes: PipeNode[]
  segments: PipeSegment[]
  alerts: PipeAlert[]
  robots: RobotOnMap[]
  sensors: Record<string, CrossSectionSensor[]>
}