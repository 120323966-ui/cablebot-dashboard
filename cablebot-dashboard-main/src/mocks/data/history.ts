/* ═══════════════════════════════════════════════════
   History Page Mock — derives from sharedSeed
   
   Uses shared rawAlerts (30-day) as the single source,
   then derives all views (dailyStats, segmentRisks, etc.)
   Same pattern as before, but rawAlerts come from sharedSeed.
   ═══════════════════════════════════════════════════ */

import type {
  AlertTypeCount,
  AlertRecord,
  DailyStat,
  HistoryPageResponse,
  InspectionRecord,
  SegmentDailyRisk,
  SegmentSummary,
} from '@/types/history'
import { SEGMENTS, ROBOTS, MODES, BASE_RISK, ALERT_TYPES, rand, irand, pick } from './constants'
import { getRawAlerts, type RawAlert, dateStr, isoDate } from './sharedSeed'

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

  /* ── segmentRisks ── */
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
  for (const a of rawAlerts) typeMap.set(a.type, (typeMap.get(a.type) ?? 0) + 1)
  const alertTypes: AlertTypeCount[] = [...ALERT_TYPES].map((type) => ({
    type,
    count: typeMap.get(type) ?? 0,
  }))

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
  const robotNames = ROBOTS.map((r) => r.name)
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
        robotName: pick(robotNames),
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

function buildFull30d(): HistoryPageResponse {
  const rawAlerts = getRawAlerts()  // ← from sharedSeed, not self-generated
  const derived = deriveAll(rawAlerts, 30)
  const inspections = generateInspections(derived.dailyStats)
  const totalInspections = inspections.length
  const avgHandleMinutes = Number(rand(6, 18).toFixed(1))
  const coveredSegs = new Set(inspections.map((r) => r.segmentId)).size
  const coveragePct = Math.round((coveredSegs / SEGMENTS.length) * 100)

  return {
    ...derived,
    inspections,
    totalInspections,
    avgHandleMinutes,
    coveragePct,
  }
}

let _cache: HistoryPageResponse | null = null

export function createHistoryPageMock(days = 30): HistoryPageResponse {
  if (!_cache) {
    _cache = buildFull30d()
  }
  if (days >= 30) return _cache

  const rawAlerts = getRawAlerts()
  const cutoffDate = dateStr(days - 1)
  const filteredRaw = rawAlerts.filter((a) => a.date >= cutoffDate)
  const derived = deriveAll(filteredRaw, days)
  const inspections = _cache.inspections.filter((r) => r.date.slice(0, 10) >= cutoffDate)
  const totalInspections = inspections.length

  return {
    ...derived,
    inspections,
    totalInspections,
    avgHandleMinutes: _cache.avgHandleMinutes,
    coveragePct: _cache.coveragePct,
  }
}
