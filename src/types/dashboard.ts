export type Tone = 'neutral' | 'good' | 'warning' | 'danger'
export type Severity = 'critical' | 'warning' | 'info'

export interface MetaInfo {
  stationName: string
  updatedAt: string
  operatorName: string
  shift: string
  weatherNote: string
  network: {
    status: 'ok' | 'degraded'
    latencyMs: number
  }
}

export interface KpiMetric {
  id: string
  label: string
  value: number
  unit?: string
  deltaPct?: number
  tone: Tone
  hint?: string
}

export interface ActiveTask {
  taskId: string
  title: string
  mode: 'auto' | 'semi-auto' | 'manual'
  status: 'running' | 'paused' | 'queued' | 'completed'
  progressPct: number
  etaMinutes: number
  segmentId: string
  checksCompleted: number
  checksTotal: number
}

export interface RobotOverview {
  id: string
  name: string
  health: Tone
  batteryPct: number
  signalRssi: number
  location: string
  speedKmh: number
  temperatureC: number
}

export interface AlertItem {
  id: string
  title: string
  severity: Severity
  status: 'new' | 'acknowledged' | 'closed'
  segmentId: string
  occurredAt: string
  evidence: string
  value: string
}

export interface HeatCell {
  x: number
  y: number
  risk: number
  label: string
}

export interface RiskHeatmap {
  columns: string[]
  rows: string[]
  cells: HeatCell[]
}

export interface TrendPoint {
  time: string
  value: number
}

export interface TrendSeries {
  id: string
  label: string
  unit: string
  threshold?: number
  points: TrendPoint[]
}

export interface QuickAction {
  id: string
  label: string
  description: string
  tone: Tone
  confirm?: boolean
}

export interface HomeOverviewResponse {
  meta: MetaInfo
  kpis: KpiMetric[]
  activeTask: ActiveTask | null
  robots: RobotOverview[]
  alerts: AlertItem[]
  risk: RiskHeatmap
  trends: TrendSeries[]
  actions: QuickAction[]
}

export type RealtimeMessage =
  | {
      type: 'TASK_PROGRESS'
      payload: Pick<ActiveTask, 'checksCompleted' | 'progressPct' | 'etaMinutes' | 'status'>
    }
  | { type: 'ROBOT_PULSE'; payload: { id: string; batteryPct: number; signalRssi: number; temperatureC: number } }
  | { type: 'ALERT_NEW'; payload: AlertItem }
  | { type: 'TREND_APPEND'; payload: { id: string; point: TrendPoint } }