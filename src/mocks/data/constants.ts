/* ═══════════════════════════════════════════════════
   Shared Constants — single source of truth
   All mock files import from here, never self-define.
   ═══════════════════════════════════════════════════ */

export const SEGMENTS = ['A1', 'A2', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3'] as const
export type SegmentId = (typeof SEGMENTS)[number]

export const ROBOTS = [
  { id: 'R1', name: 'PipeBot-01' },
  { id: 'R2', name: 'PipeBot-02' },
  { id: 'R3', name: 'PipeBot-03' },
] as const

export const ALERT_TYPES = [
  '热像异常', '湿度/渗漏', '气体浓度', '结构异常',
  '振动超标', '积水检测', '通信异常', '照明异常',
] as const

/** 每个区段的高发告警类型（权重：重复项 = 更高概率） */
export const SEG_ALERT_POOL: Record<string, string[]> = {
  A1: ['照明异常', '通信异常'],
  A2: ['积水检测', '湿度/渗漏', '照明异常'],
  B1: ['气体浓度', '结构异常'],
  B2: ['结构异常', '振动超标', '气体浓度'],
  B3: ['热像异常', '热像异常', '湿度/渗漏', '结构异常'],
  C1: ['气体浓度', '气体浓度', '通信异常'],
  C2: ['湿度/渗漏', '湿度/渗漏', '热像异常', '积水检测'],
  C3: ['振动超标', '振动超标', '结构异常'],
}

/** 区段基础风险值（决定告警密度与严重等级分布） */
export const BASE_RISK: Record<string, number> = {
  A1: 0.18, A2: 0.28, B1: 0.32, B2: 0.45,
  B3: 0.82, C1: 0.38, C2: 0.62, C3: 0.30,
}

/** 区段位置描述（用于 UI 文字显示） */
export const SEGMENT_LABELS: Record<string, string> = {
  A1: 'A1-北段入口', A2: 'A2-检查井段',
  B1: 'B1-西段入口', B2: 'B2-中段检查位', B3: 'B3-西入口',
  C1: 'C1-南段入口', C2: 'C2-阀井段', C3: 'C3-东段出口',
}

/** 机器人初始状态快照 */
export const ROBOT_INIT: Record<string, {
  segmentId: string
  status: 'inspecting' | 'moving' | 'idle'
  batteryPct: number
  signalRssi: number
  speedKmh: number
  temperatureC: number
  progress: number
  direction: 1 | -1
}> = {
  R1: { segmentId: 'B3', status: 'inspecting', batteryPct: 78, signalRssi: -58, speedKmh: 1.2, temperatureC: 27.4, progress: 0.42, direction: 1 },
  R2: { segmentId: 'C2', status: 'moving', batteryPct: 49, signalRssi: -66, speedKmh: 0.8, temperatureC: 31.2, progress: 0.65, direction: -1 },
  R3: { segmentId: 'A1', status: 'idle', batteryPct: 91, signalRssi: -52, speedKmh: 0, temperatureC: 25.1, progress: 0.10, direction: 1 },
}

/** 区段特征温度/湿度基准（与风险值和告警类型关联） */
export const SEGMENT_ENV: Record<string, { temperatureC: number; humidityPct: number }> = {
  A1: { temperatureC: 28.4, humidityPct: 62 },
  A2: { temperatureC: 30.1, humidityPct: 65 },
  B1: { temperatureC: 33.2, humidityPct: 70 },
  B2: { temperatureC: 38.6, humidityPct: 74 },
  B3: { temperatureC: 68.4, humidityPct: 82 },
  C1: { temperatureC: 29.8, humidityPct: 71 },
  C2: { temperatureC: 34.5, humidityPct: 86 },
  C3: { temperatureC: 27.6, humidityPct: 60 },
}

export const SEVERITIES: ('critical' | 'warning' | 'info')[] = ['critical', 'warning', 'info']
export const MODES: ('auto' | 'semi-auto' | 'manual')[] = ['auto', 'semi-auto', 'manual']

/* ── Utility helpers ── */

export function rand(min: number, max: number) {
  return Math.random() * (max - min) + min
}
export function irand(min: number, max: number) {
  return Math.floor(rand(min, max + 1))
}
export function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}
