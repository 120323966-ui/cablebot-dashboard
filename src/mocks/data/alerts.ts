/* ═══════════════════════════════════════════════════
   Alerts Page Mock — derives from sharedSeed
   ═══════════════════════════════════════════════════ */

import type { AlertItem } from '@/types/dashboard'
import type { AlertsPageResponse, SegmentAlertHistory } from '@/types/alerts'
import { SEGMENTS } from './constants'
import {
  getActiveAlerts, getRawAlerts, createRealtimeAlert as sharedRealtimeAlert,
} from './sharedSeed'
import type { ActiveAlert } from './sharedSeed'

/* ── Derive segment history stats from 30-day rawAlerts ── */

function deriveHistory(): SegmentAlertHistory[] {
  const rawAlerts = getRawAlerts()
  const now = Date.now()
  const d7 = new Date(now - 7 * 86400_000).toISOString().slice(0, 10)
  const d30 = new Date(now - 30 * 86400_000).toISOString().slice(0, 10)

  return SEGMENTS.map((seg) => {
    const segAlerts = rawAlerts.filter((a) => a.segmentId === seg)
    const recent7d = segAlerts.filter((a) => a.date >= d7).length
    const recent30d = segAlerts.filter((a) => a.date >= d30).length

    // Top type
    const typeCount = new Map<string, number>()
    for (const a of segAlerts) typeCount.set(a.type, (typeCount.get(a.type) ?? 0) + 1)
    let topType = '无'
    let topCount = 0
    for (const [t, c] of typeCount) { if (c > topCount) { topType = t; topCount = c } }

    // Trend: compare last 7d vs previous 7d
    const d14 = new Date(now - 14 * 86400_000).toISOString().slice(0, 10)
    const prev7d = segAlerts.filter((a) => a.date >= d14 && a.date < d7).length
    const trend: 'up' | 'down' | 'steady' = recent7d > prev7d * 1.2 ? 'up' : recent7d < prev7d * 0.8 ? 'down' : 'steady'

    return { segmentId: seg, recent7d, recent30d, topType, trend }
  })
}

function toAlertItem(alert: ActiveAlert): AlertItem {
  return {
    id: alert.id,
    title: alert.title,
    severity: alert.severity,
    status: alert.status,
    segmentId: alert.segmentId,
    occurredAt: alert.occurredAt,
    evidence: alert.evidence,
    value: alert.value,
    type: alert.type,
    currentValue: alert.currentValue,
    unit: alert.unit,
    threshold: alert.threshold,
    recentTrend: alert.recentTrend,
    groupKey: alert.groupKey,
  }
}

/* ═══════════════════════════════════════════════════
   Public API
   ═══════════════════════════════════════════════════ */

export function createAlertsPageMock(): AlertsPageResponse {
  const activeAlerts = getActiveAlerts()

  const alerts: AlertItem[] = activeAlerts.map(toAlertItem)

  return {
    alerts,
    history: deriveHistory(),
    segments: [...SEGMENTS],
  }
}

/** Realtime alert for Alerts page — shared generator, mapped to AlertItem */
export function createRealtimeAlertForPage(): AlertItem {
  return toAlertItem(sharedRealtimeAlert())
}
