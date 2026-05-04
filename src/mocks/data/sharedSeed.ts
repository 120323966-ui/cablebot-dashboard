/* ═══════════════════════════════════════════════════
   Shared Seed — unified data generation & cache
   
   Generates once, cached for the session. Every page
   mock imports from here → cross-page consistency.
   ═══════════════════════════════════════════════════ */

import {
  SEGMENTS, ROBOTS, SEG_ALERT_POOL, BASE_RISK,
  ROBOT_INIT, SEGMENT_ENV, SEVERITIES,
  rand, irand, pick,
} from './constants'
import { ALERT_TYPE_PARAMS } from '@/utils/alertParams'
import { mapAlertType } from '@/utils/propagation'

/* ─────── Exported types ─────── */

export interface RawAlert {
  date: string
  segmentId: string
  type: string
  severity: 'critical' | 'warning' | 'info'
}

export interface ActiveAlert {
  id: string
  title: string
  severity: 'critical' | 'warning' | 'info'
  status: 'new' | 'acknowledged' | 'closed'
  segmentId: string
  occurredAt: string
  evidence: string
  value: string
  type: string
  /** 0-1 position along the segment pipe (for Spatial map markers) */
  progress: number
  currentValue?: number
  unit?: string
  threshold?: {
    warn: number
    danger: number
  }
  recentTrend?: { time: string; value: number }[]
  /** 数据源类型：移动巡检机器人或固定传感器 */
  source?: 'mobile' | 'fixed'
  /** 告警触发时的采集源位置 */
  capturePoint?: {
    segmentId: string
    progress: number
  }
  /** 关联标识，用于重复告警归并 */
  groupKey?: string
}

export interface RobotSnapshot {
  id: string
  name: string
  segmentId: string
  status: 'inspecting' | 'moving' | 'idle' | 'emergency'
  batteryPct: number
  signalRssi: number
  speedKmh: number
  temperatureC: number
  progress: number
  direction: 1 | -1
}

export interface SegmentRisk {
  segmentId: string
  riskLevel: number
  temperatureC: number
  humidityPct: number
  activeAlertCount: number
}

/* ─────── Time helpers ─────── */

function dateStr(daysAgo: number) {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().slice(0, 10)
}

function isoDate(daysAgo: number, hour?: number) {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  d.setHours(hour ?? irand(6, 22), irand(0, 59))
  return d.toISOString()
}

function isoMinutesAgo(m: number) {
  return new Date(Date.now() - m * 60_000).toISOString()
}

function firstNumericValue(text: string): number | null {
  const match = text.match(/-?\d+(?:\.\d+)?/)
  return match ? Number(match[0]) : null
}

function metricDefaults(alert: Pick<ActiveAlert, 'segmentId' | 'type' | 'evidence' | 'severity'>) {
  const env = SEGMENT_ENV[alert.segmentId] ?? { temperatureC: 30, humidityPct: 65 }
  const parsed = firstNumericValue(alert.evidence)
  const type = mapAlertType(alert.type)
  const params = ALERT_TYPE_PARAMS[type]
  const fallback = type === 'thermal'
    ? env.temperatureC
    : type === 'moisture'
      ? env.humidityPct
      : 0

  return {
    currentValue: parsed ?? fallback,
    unit: params.unit,
    threshold: {
      warn: params.thresholds.medium,
      danger: params.thresholds.high,
    },
  }
}

function buildRecentTrend(anchorIso: string, currentValue: number, severity: ActiveAlert['severity']) {
  const anchor = new Date(anchorIso)
  const severityLift = severity === 'critical' ? 0.16 : severity === 'warning' ? 0.1 : 0.04
  return Array.from({ length: 6 }, (_, idx) => {
    const pointTime = new Date(anchor)
    pointTime.setMinutes(anchor.getMinutes() - (5 - idx) * 6)
    const scale = 1 - severityLift + (idx / 5) * severityLift
    const wobble = Math.sin(idx * 1.7) * currentValue * 0.018
    return {
      time: pointTime.toISOString(),
      value: Number((currentValue * scale + wobble).toFixed(1)),
    }
  })
}

function enrichAlert(alert: ActiveAlert): ActiveAlert {
  const metric = metricDefaults(alert)
  return {
    ...alert,
    ...metric,
    source: alert.source ?? 'fixed',
    capturePoint: alert.capturePoint ?? {
      segmentId: alert.segmentId,
      progress: alert.source === 'mobile' ? alert.progress : 0.5,
    },
    recentTrend: alert.recentTrend ?? buildRecentTrend(alert.occurredAt, metric.currentValue, alert.severity),
  }
}

/* ═══════════════════════════════════════════════════
   1. Raw Alerts (30-day history for History & Reports)
   ═══════════════════════════════════════════════════ */

function generateRawAlerts(days: number): RawAlert[] {
  const alerts: RawAlert[] = []
  for (let i = days - 1; i >= 0; i--) {
    const date = dateStr(i)
    const weekday = new Date(Date.now() - i * 86400000).getDay()
    const dayScale = weekday === 0 || weekday === 6 ? 0.6 : 1

    for (const seg of SEGMENTS) {
      const r = BASE_RISK[seg]
      const count = Math.round(r * dayScale * rand(0.8, 3.5))
      for (let j = 0; j < count; j++) {
        const pool = SEG_ALERT_POOL[seg]
        const sev: RawAlert['severity'] = r > 0.7
          ? pick(['critical', 'critical', 'warning'] as const)
          : r > 0.5
            ? pick(['critical', 'warning', 'warning'] as const)
            : pick(SEVERITIES)
        alerts.push({ date, segmentId: seg, type: pick(pool), severity: sev })
      }
    }
  }
  return alerts
}

/* ═══════════════════════════════════════════════════
   2. Active Alerts (current situation for Home/Alerts/Spatial/Command)
      
   Fixed set of ~12 alerts reflecting each segment's
   risk profile. IDs are AL-3xx, shared across all pages.
   ═══════════════════════════════════════════════════ */

function buildActiveAlerts(): ActiveAlert[] {
  const alerts: ActiveAlert[] = [
    // ── B3 (risk 0.82) — 热像异常 dominant, 3 alerts ──
    { id: 'AL-301', segmentId: 'B3', type: '热像异常', severity: 'critical', status: 'new',
      title: 'B3 段热像异常偏高', evidence: '热像峰值 71.2°C', value: '高于阈值 +9.3°C',
      occurredAt: isoMinutesAgo(4), progress: 0.35 },
    { id: 'AL-302', segmentId: 'B3', type: '热像异常', severity: 'critical', status: 'acknowledged',
      title: 'B3 段电缆接头温升', evidence: '接头区域 68.4°C', value: '高于阈值 +6.5°C',
      occurredAt: isoMinutesAgo(35), progress: 0.70 },
    { id: 'AL-303', segmentId: 'B3', type: '湿度/渗漏', severity: 'warning', status: 'acknowledged',
      title: 'B3 段湿度偏高', evidence: '湿度 82%', value: '超出基准 +14%',
      occurredAt: isoMinutesAgo(22), progress: 0.90 },

    // ── C2 (risk 0.62) — 湿度/渗漏 dominant, 3 alerts ──
    { id: 'AL-304', segmentId: 'C2', type: '湿度/渗漏', severity: 'warning', status: 'acknowledged',
      title: 'C2 段湿度突增', evidence: '湿度 86%', value: '较均值 +18%',
      occurredAt: isoMinutesAgo(12), progress: 0.40 },
    { id: 'AL-305', segmentId: 'C2', type: '湿度/渗漏', severity: 'warning', status: 'new',
      title: 'C2 段渗漏疑似', evidence: '热像异常冷斑', value: '温差 -12°C',
      occurredAt: isoMinutesAgo(8), progress: 0.80 },
    { id: 'AL-312', segmentId: 'C2', type: '通信异常', severity: 'info', status: 'new',
      title: 'R2 通信质量下降', evidence: 'RSSI -66dBm', value: '建议切换中继',
      occurredAt: isoMinutesAgo(18), progress: 0.65 },

    // ── B2 (risk 0.45) — 1 alert ──
    { id: 'AL-306', segmentId: 'B2', type: '结构异常', severity: 'info', status: 'acknowledged',
      title: 'B2 段支架螺栓松动', evidence: '视觉检测置信度 87%', value: '建议下次巡检复核',
      occurredAt: isoMinutesAgo(95), progress: 0.30 },

    // ── C1 (risk 0.38) — 1 alert ──
    { id: 'AL-307', segmentId: 'C1', type: '气体浓度', severity: 'warning', status: 'closed',
      title: 'C1 段气体浓度偏高', evidence: 'CH₄ 0.8%', value: '接近预警阈值',
      occurredAt: isoMinutesAgo(68), progress: 0.60 },

    // ── C3 (risk 0.30) — 1 alert ──
    { id: 'AL-308', segmentId: 'C3', type: '振动超标', severity: 'warning', status: 'new',
      title: 'C3 段振动超标', evidence: '加速度 2.4g', value: '超标 0.9g',
      occurredAt: isoMinutesAgo(210), progress: 0.55 },

    // ── A2 (risk 0.28) — 1 alert ──
    { id: 'AL-309', segmentId: 'A2', type: '积水检测', severity: 'warning', status: 'new',
      title: 'A2 段积水检测', evidence: '水位传感器触发', value: '积水深度约 3cm',
      occurredAt: isoMinutesAgo(47), progress: 0.50 },

    // ── B1 (risk 0.32) — 1 alert ──
    { id: 'AL-310', segmentId: 'B1', type: '气体浓度', severity: 'warning', status: 'closed',
      title: 'B1 段温度波动', evidence: '最大波幅 8.6°C', value: '已趋于稳定',
      occurredAt: isoMinutesAgo(280), progress: 0.45 },

    // ── A1 (risk 0.18) — 1 alert ──
    { id: 'AL-311', segmentId: 'A1', type: '照明异常', severity: 'info', status: 'closed',
      title: 'A1 段照明异常', evidence: '照度 12lux', value: '低于正常值 60%',
      occurredAt: isoMinutesAgo(180), progress: 0.30 },
  ]
  return alerts.map(enrichAlert)
}

/* ═══════════════════════════════════════════════════
   3. Robot Snapshots
   ═══════════════════════════════════════════════════ */

function buildRobots(): RobotSnapshot[] {
  return ROBOTS.map((r) => {
    const init = ROBOT_INIT[r.id]
    return { id: r.id, name: r.name, ...init }
  })
}

/* ═══════════════════════════════════════════════════
   4. Segment Risks (derived from BASE_RISK + activeAlerts)
   ═══════════════════════════════════════════════════ */

function buildSegmentRisks(activeAlerts: ActiveAlert[]): SegmentRisk[] {
  return SEGMENTS.map((seg) => {
    const env = SEGMENT_ENV[seg]
    const alertCount = activeAlerts.filter((a) => a.segmentId === seg && a.status !== 'closed').length
    return {
      segmentId: seg,
      riskLevel: BASE_RISK[seg],
      temperatureC: env.temperatureC,
      humidityPct: env.humidityPct,
      activeAlertCount: alertCount,
    }
  })
}

/* ═══════════════════════════════════════════════════
   5. Realtime alert generator (shared by Home + Alerts pages)
   ═══════════════════════════════════════════════════ */

let realtimeSeq = 400

const REALTIME_TEMPLATES: { title: string; severity: 'critical' | 'warning' | 'info'; segment: string; evidence: () => string; value: string }[] = [
  { title: 'B3 段温度波动增强', severity: 'critical', segment: 'B3', evidence: () => `峰值 ${(67 + Math.random() * 6).toFixed(1)}°C`, value: '建议人工复核热像窗口' },
  { title: 'C2 段湿度再次上升', severity: 'warning', segment: 'C2', evidence: () => `湿度 ${(84 + Math.random() * 8).toFixed(0)}%`, value: '较均值 +22%' },
  { title: 'A2 段水位缓慢上升', severity: 'warning', segment: 'A2', evidence: () => `水位 ${(3 + Math.random() * 2).toFixed(1)}cm`, value: '超过基准 +1.2cm' },
  { title: 'B3 段接头温度抬升', severity: 'critical', segment: 'B3', evidence: () => `接头 ${(66 + Math.random() * 8).toFixed(1)}°C`, value: '高于阈值 +8.2°C' },
  { title: 'C3 段异常振动', severity: 'info', segment: 'C3', evidence: () => '加速度 1.8g', value: '轻微超标' },
  { title: 'B1 段通信延迟', severity: 'info', segment: 'B1', evidence: () => `延迟 ${irand(200, 400)}ms`, value: '建议检查中继节点' },
]

export function createRealtimeAlert(currentRobots: RobotSnapshot[] = getRobots()): ActiveAlert {
  const tpl = REALTIME_TEMPLATES[Math.floor(Math.random() * REALTIME_TEMPLATES.length)]
  realtimeSeq++

  // 生成关联标识：区段 + 标题，用于下游重复告警归并
  const groupKey = `${tpl.segment}::${tpl.title}`
  const robotOnSegment = currentRobots.find((robot) => robot.segmentId === tpl.segment)
  const isMobile = Math.random() < 0.5 && Boolean(robotOnSegment)
  const source: ActiveAlert['source'] = isMobile ? 'mobile' : 'fixed'
  const capturePoint = {
    segmentId: tpl.segment,
    progress: isMobile ? robotOnSegment!.progress : 0.5,
  }

  return enrichAlert({
    id: `AL-${realtimeSeq}`,
    title: tpl.title,
    severity: tpl.severity,
    status: 'new',
    segmentId: tpl.segment,
    occurredAt: new Date().toISOString(),
    evidence: tpl.evidence(),
    value: tpl.value,
    type: SEG_ALERT_POOL[tpl.segment]?.[0] ?? '热像异常',
    progress: Number(rand(0.1, 0.9).toFixed(2)),
    source,
    capturePoint,
    groupKey,
  })
}

/* ═══════════════════════════════════════════════════
   6. Realtime Command event generator (for Command page)
      Accepts segmentId so it works for any robot's view.
   ═══════════════════════════════════════════════════ */

const EVENT_POOLS: Record<string, Array<{ title: string; severity: 'critical' | 'warning' | 'info'; source: string; detail: string }>> = {
  B3: [
    { title: '热像高温点持续存在', severity: 'critical', source: '热成像联动', detail: '建议暂停并请求人工确认' },
    { title: '局部潮湿带范围扩大', severity: 'warning', source: '视觉识别', detail: '建议切换局部放大窗口复核' },
    { title: '机器人通过支架狭窄区', severity: 'info', source: '空间约束', detail: '维持低速并保持前视对准' },
  ],
  C2: [
    { title: '渗漏疑似区域检出', severity: 'critical', source: '热成像联动', detail: '冷斑异常，建议标记' },
    { title: '湿度持续上升', severity: 'warning', source: '环境传感', detail: '建议降速并开启照明增强' },
    { title: '通信信号波动', severity: 'info', source: '链路监测', detail: '当前延迟升高' },
  ],
  A1: [
    { title: '照明区域偏暗', severity: 'info', source: '视觉识别', detail: '照度低于基准' },
    { title: '轻微通信抖动', severity: 'info', source: '链路监测', detail: '延迟波动 ±50ms' },
  ],
}

// fallback pool for segments without specific events
const DEFAULT_EVENT_POOL = [
  { title: '传感器数据正常', severity: 'info' as const, source: '系统', detail: '各项指标在正常范围' },
]

export function createRealtimeCommandEvent(segmentId: string) {
  const pool = EVENT_POOLS[segmentId] ?? DEFAULT_EVENT_POOL
  const picked = pool[Math.floor(Math.random() * pool.length)]
  return {
    id: `EV-${Math.floor(Math.random() * 900 + 100)}`,
    occurredAt: new Date().toISOString(),
    ...picked,
    status: 'new' as const,
    segmentId,
  }
}

/* ═══════════════════════════════════════════════════
   Cache & Public API
   ═══════════════════════════════════════════════════ */

interface SeedCache {
  rawAlerts: RawAlert[]
  activeAlerts: ActiveAlert[]
  robots: RobotSnapshot[]
  segmentRisks: SegmentRisk[]
}

let _cache: SeedCache | null = null

function ensureSeed(): SeedCache {
  if (!_cache) {
    const rawAlerts = generateRawAlerts(30)
    const activeAlerts = buildActiveAlerts()
    const robots = buildRobots()
    const segmentRisks = buildSegmentRisks(activeAlerts)
    _cache = { rawAlerts, activeAlerts, robots, segmentRisks }
  }
  return _cache
}

/** 30-day raw alerts for History/Reports derivation */
export function getRawAlerts(): RawAlert[] {
  return ensureSeed().rawAlerts
}

/** Current active alerts (shared across Home/Alerts/Spatial/Command) */
export function getActiveAlerts(): ActiveAlert[] {
  return ensureSeed().activeAlerts.map((a) => ({ ...a }))
}

/** Robot initial state (shared across Home/Spatial/Command) */
export function getRobots(): RobotSnapshot[] {
  return ensureSeed().robots.map((r) => ({ ...r }))
}

/** Segment risk snapshots (shared across Home heatmap / Spatial map) */
export function getSegmentRisks(): SegmentRisk[] {
  return ensureSeed().segmentRisks.map((s) => ({ ...s }))
}

/** Derived KPI values (for Home page) */
export function getKpis() {
  const { activeAlerts, robots, segmentRisks } = ensureSeed()
  const pendingAlerts = activeAlerts.filter((a) => a.status === 'new')
  const criticalPending = pendingAlerts.filter((a) => a.severity === 'critical')
  const highRiskSegs = segmentRisks.filter((s) => s.riskLevel >= 0.55)

  return {
    taskCount: 6,
    onlineRobots: robots.filter((r) => r.status !== 'idle' || r.batteryPct > 0).length,
    pendingAlertCount: pendingAlerts.length,
    criticalPendingCount: criticalPending.length,
    highRiskSegCount: highRiskSegs.length,
    highRiskSegNames: highRiskSegs.map((s) => s.segmentId).join('、'),
  }
}

/** Re-export helpers from constants for convenience */
export { dateStr, isoDate }
