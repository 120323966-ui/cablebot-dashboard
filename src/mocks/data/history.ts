import type {
  AlertTypeCount,
  AlertRecord,
  DailyStat,
  HistoryPageResponse,
  InspectionRecord,
  SegmentDailyRisk,
  SegmentSummary,
} from '@/types/history'

/* ═══════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════ */

const SEGMENTS = ['A1', 'A2', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3']
const ROBOTS = ['PipeBot-01', 'PipeBot-02', 'PipeBot-03']
const MODES: InspectionRecord['mode'][] = ['auto', 'semi-auto', 'manual']

const BASE_RISK: Record<string, number> = {
  A1: 0.18, A2: 0.28, B1: 0.32, B2: 0.45,
  B3: 0.82, C1: 0.38, C2: 0.62, C3: 0.3,
}

const SEG_ALERT_POOL: Record<string, string[]> = {
  A1: ['照明异常', '通信异常'],
  A2: ['积水检测', '湿度/渗漏', '照明异常'],
  B1: ['气体浓度', '结构异常'],
  B2: ['结构异常', '振动超标', '气体浓度'],
  B3: ['热像异常', '热像异常', '湿度/渗漏', '结构异常'],
  C1: ['气体浓度', '气体浓度', '通信异常'],
  C2: ['湿度/渗漏', '湿度/渗漏', '热像异常', '积水检测'],
  C3: ['振动超标', '振动超标', '结构异常'],
}

const SEVERITIES: ('critical' | 'warning' | 'info')[] = ['critical', 'warning', 'info']

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min
}
function irand(min: number, max: number) {
  return Math.floor(rand(min, max + 1))
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}
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

/* ═══════════════════════════════════════════════════
   Bottom-up: generate raw alert detail records
   ═══════════════════════════════════════════════════ */

interface RawAlert {
  date: string
  segmentId: string
  type: string
  severity: 'critical' | 'warning' | 'info'
}

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
        const sev: 'critical' | 'warning' | 'info' = r > 0.7
          ? pick(['critical', 'critical', 'warning'])
          : r > 0.5
            ? pick(['critical', 'warning', 'warning'])
            : pick(SEVERITIES)

        alerts.push({ date, segmentId: seg, type: pick(pool), severity: sev })
      }
    }
  }
  return alerts
}

/* ═══════════════════════════════════════════════════
   Derive all views from rawAlerts
   ═══════════════════════════════════════════════════ */

function rawToAlertRecords(rawAlerts: RawAlert[]): AlertRecord[] {
  return rawAlerts.map((a, i) => ({
    id: `HA-${String(i + 1).padStart(4, '0')}`,
    date: a.date,
    segmentId: a.segmentId,
    type: a.type,
    severity: a.severity,
  }))
}

function deriveAll(rawAlerts: RawAlert[], days: number) {
  const dates = Array.from({ length: days }, (_, i) => dateStr(days - 1 - i))

  /* ── dailyStats ── */
  const dailyStats: DailyStat[] = dates.map((date) => {
    const dayAlerts = rawAlerts.filter((a) => a.date === date)
    const critical = dayAlerts.filter((a) => a.severity === 'critical').length
    const warning = dayAlerts.filter((a) => a.severity === 'warning').length
    const info = dayAlerts.filter((a) => a.severity === 'info').length
    const total = critical + warning + info
    const inspections = Math.max(2, Math.round(2 + total * rand(0.3, 0.6)))
    return { date, critical, warning, info, inspections }
  })

  /* ── segmentRisks（从当天告警数推导） ── */
  const segmentRisks: SegmentDailyRisk[] = []
  for (const date of dates) {
    const dayAlerts = rawAlerts.filter((a) => a.date === date)
    for (const seg of SEGMENTS) {
      const segDayAlerts = dayAlerts.filter((a) => a.segmentId === seg)
      const criticalCount = segDayAlerts.filter((a) => a.severity === 'critical').length
      const warningCount = segDayAlerts.filter((a) => a.severity === 'warning').length
      const infoCount = segDayAlerts.filter((a) => a.severity === 'info').length
      const alertScore = Math.min(1, (criticalCount * 3 + warningCount * 1.5 + infoCount * 0.5) / 8)
      const risk = Math.min(1, Math.max(0, BASE_RISK[seg] * 0.4 + alertScore * 0.6 + rand(-0.03, 0.03)))
      segmentRisks.push({ date, segmentId: seg, risk })
    }
  }

  /* ── alertTypes ── */
  const typeMap = new Map<string, number>()
  for (const a of rawAlerts) {
    typeMap.set(a.type, (typeMap.get(a.type) ?? 0) + 1)
  }
  const alertTypes: AlertTypeCount[] = [
    '热像异常', '湿度/渗漏', '气体浓度', '结构异常',
    '振动超标', '积水检测', '通信异常', '照明异常',
  ].map((type) => ({ type, count: typeMap.get(type) ?? 0 }))

  /* ── segmentSummaries ── */
  const segmentSummaries: SegmentSummary[] = SEGMENTS.map((seg) => {
    const segAlerts = rawAlerts.filter((a) => a.segmentId === seg)
    const alertCount = segAlerts.length
    const baseInsp = Math.ceil(days * 0.15)
    const extraInsp = Math.ceil(alertCount * rand(0.3, 0.5))
    const inspectionCount = baseInsp + extraInsp
    const segRisks = segmentRisks.filter((r) => r.segmentId === seg)
    const avgRisk = segRisks.length
      ? Number((segRisks.reduce((s, r) => s + r.risk, 0) / segRisks.length).toFixed(2))
      : BASE_RISK[seg]
    const segTypeMap = new Map<string, number>()
    for (const a of segAlerts) segTypeMap.set(a.type, (segTypeMap.get(a.type) ?? 0) + 1)
    let topAlertType = '无'
    let topCount = 0
    for (const [t, c] of segTypeMap) {
      if (c > topCount) { topAlertType = t; topCount = c }
    }
    return { segmentId: seg, alertCount, inspectionCount, avgRisk, topAlertType }
  })

  const alertRecords = rawToAlertRecords(rawAlerts)
  const totalAlerts = rawAlerts.length

  return { dailyStats, segmentRisks, alertTypes, segmentSummaries, alertRecords, totalAlerts }
}

/* ═══════════════════════════════════════════════════
   Inspection records
   ═══════════════════════════════════════════════════ */

function generateInspections(dailyStats: DailyStat[]): InspectionRecord[] {
  const inspections: InspectionRecord[] = []
  let seq = 1
  for (const day of dailyStats) {
    const daysAgo = Math.round((Date.now() - new Date(day.date).getTime()) / 86400000)
    for (let j = 0; j < day.inspections; j++) {
      const checksTotal = irand(12, 24)
      const status: InspectionRecord['status'] =
        Math.random() < 0.85 ? 'completed' : Math.random() < 0.5 ? 'partial' : 'aborted'
      const checksDone = status === 'completed' ? checksTotal : irand(3, checksTotal - 1)
      inspections.push({
        id: `TK-${String(seq++).padStart(4, '0')}`,
        date: isoDate(daysAgo, 6 + j * 2),
        segmentId: pick(SEGMENTS),
        robotName: pick(ROBOTS),
        mode: pick(MODES),
        checksDone,
        checksTotal,
        alertsFound: irand(0, 4),
        durationMinutes: irand(15, 55),
        status,
      })
    }
  }
  return inspections.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

/* ═══════════════════════════════════════════════════
   Build + Cache
   ═══════════════════════════════════════════════════ */

function buildFull30d(): { response: HistoryPageResponse; rawAlerts: RawAlert[] } {
  const rawAlerts = generateRawAlerts(30)
  const derived = deriveAll(rawAlerts, 30)
  const inspections = generateInspections(derived.dailyStats)
  const totalInspections = inspections.length
  const avgHandleMinutes = Number(rand(6, 18).toFixed(1))
  const coveredSegs = new Set(inspections.map((r) => r.segmentId)).size
  const coveragePct = Math.round((coveredSegs / SEGMENTS.length) * 100)

  return {
    rawAlerts,
    response: {
      ...derived,
      inspections,
      totalInspections,
      avgHandleMinutes,
      coveragePct,
    },
  }
}

let cache: { response: HistoryPageResponse; rawAlerts: RawAlert[] } | null = null

export function createHistoryPageMock(days = 30): HistoryPageResponse {
  if (!cache) {
    cache = buildFull30d()
  }
  if (days >= 30) return cache.response

  const cutoffDate = dateStr(days - 1)
  const filteredRaw = cache.rawAlerts.filter((a) => a.date >= cutoffDate)
  const derived = deriveAll(filteredRaw, days)
  const inspections = cache.response.inspections.filter((r) => r.date.slice(0, 10) >= cutoffDate)
  const totalInspections = inspections.length

  return {
    ...derived,
    inspections,
    totalInspections,
    avgHandleMinutes: cache.response.avgHandleMinutes,
    coveragePct: cache.response.coveragePct,
  }
}
