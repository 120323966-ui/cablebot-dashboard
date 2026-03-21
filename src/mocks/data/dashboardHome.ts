/* ═══════════════════════════════════════════════════
   Dashboard Home Mock — derives from sharedSeed
   ═══════════════════════════════════════════════════ */

import type { AlertItem, HomeOverviewResponse, TrendPoint } from '@/types/dashboard'
import { SEGMENT_LABELS, BASE_RISK } from './constants'
import {
  getActiveAlerts, getRobots, getKpis, getSegmentRisks,
  createRealtimeAlert as sharedRealtimeAlert,
} from './sharedSeed'

/* ── Trend helpers (chart-specific, not shared) ── */

const TREND_POINTS = 12
const TREND_STEP_MINUTES = 10

function alignToStep(date: Date, stepMinutes: number) {
  const aligned = new Date(date)
  aligned.setSeconds(0, 0)
  const minute = aligned.getMinutes()
  aligned.setMinutes(minute - (minute % stepMinutes))
  return aligned
}

function buildTrend(base: number, wobble: number): TrendPoint[] {
  const end = alignToStep(new Date(), TREND_STEP_MINUTES)
  return Array.from({ length: TREND_POINTS }, (_, idx) => {
    const pointTime = new Date(end)
    pointTime.setMinutes(end.getMinutes() - (TREND_POINTS - 1 - idx) * TREND_STEP_MINUTES)
    return {
      time: pointTime.toISOString(),
      value: Number((base + Math.sin(idx / 2) * wobble + (idx % 3) * 0.9).toFixed(1)),
    }
  })
}

/* ── Heatmap: derive cell risks from BASE_RISK with per-row variance ── */

function buildHeatmap() {
  const rows = ['北侧', '中段', '南侧']
  const columns = ['A1', 'A2', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3']
  const rowMul = [1.08, 0.95, 0.82]
  const offsets = [0.02, 0, 0.04, -0.01, 0.09, 0.04, -0.07, 0.04] // per-segment fine-tuning

  const cells = columns.flatMap((seg, ci) => {
    const base = BASE_RISK[seg]
    return rows.map((_, ri) => {
      const risk = Math.min(1, Math.max(0, Number((base * rowMul[ri] + offsets[ci] * (ri === 0 ? 1 : ri === 1 ? 0.5 : 0)).toFixed(2))))
      let label: string, kind: string, trend: 'up' | 'down' | 'steady'

      if (risk >= 0.8) { label = '热像复核'; kind = 'temperature'; trend = 'up' }
      else if (risk >= 0.65) { label = '潮湿异常'; kind = 'humidity'; trend = 'up' }
      else if (risk >= 0.5) { label = '持续观察'; kind = 'review'; trend = 'up' }
      else if (risk >= 0.35) { label = '轻度波动'; kind = 'normal'; trend = 'up' }
      else if (risk >= 0.2) { label = '状态平稳'; kind = 'normal'; trend = 'steady' }
      else { label = '状态平稳'; kind = 'normal'; trend = 'steady' }

      return { x: ci, y: ri, risk, label, kind, trend }
    })
  })

  return { columns, rows, cells }
}

/* ═══════════════════════════════════════════════════
   Public API
   ═══════════════════════════════════════════════════ */

export function createHomeOverviewMock(): HomeOverviewResponse {
  const activeAlerts = getActiveAlerts()
  const robots = getRobots()
  const kpis = getKpis()

  // Map ActiveAlert → AlertItem (drop type & progress)
  const alertItems: AlertItem[] = activeAlerts
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .map(({ type, progress, ...rest }) => rest)

  return {
    meta: {
      stationName: '地下电缆排管 · 监控中心',
      updatedAt: new Date().toISOString(),
      operatorName: '值班员 · Cris',
      shift: '白班',
      weatherNote: '城区降雨后 3 小时，重点关注湿度与渗漏风险',
      network: { status: 'ok', latencyMs: 36 },
    },
    kpis: [
      { id: 'tasks', label: '今日计划任务', value: kpis.taskCount, unit: '项', deltaPct: 20, tone: 'neutral' },
      { id: 'online', label: '在线机器人', value: kpis.onlineRobots, unit: '台', deltaPct: 0, tone: 'good' },
      { id: 'alerts', label: '待处置告警', value: kpis.pendingAlertCount, unit: '条', deltaPct: 33, tone: 'warning' },
      { id: 'risk', label: '高风险区段', value: kpis.highRiskSegCount, unit: '段', deltaPct: -25, tone: 'danger' },
    ],
    activeTask: {
      taskId: 'TK-2026-0315-0021',
      title: 'B3 区段巡检任务',
      mode: 'semi-auto',
      status: 'running',
      progressPct: 42,
      etaMinutes: 28,
      segmentId: 'B3',
      checksCompleted: 8,
      checksTotal: 19,
    },
    robots: robots.map((r) => ({
      id: r.id,
      name: r.name,
      health: r.status === 'idle' ? 'neutral' as const : r.batteryPct < 50 ? 'warning' as const : 'good' as const,
      batteryPct: r.batteryPct,
      signalRssi: r.signalRssi,
      location: SEGMENT_LABELS[r.segmentId] ?? r.segmentId,
      speedKmh: r.speedKmh,
      temperatureC: r.temperatureC,
    })),
    alerts: alertItems,
    risk: buildHeatmap(),
    trends: [
      { id: 'temp', label: '管道温度', unit: '°C', threshold: 65, points: buildTrend(56, 6) },
      { id: 'humidity', label: '环境湿度', unit: '%', threshold: 80, points: buildTrend(68, 8) },
    ],
    actions: [
      { id: 'pause', label: '暂停任务', description: '立即暂停当前半自动巡检任务', tone: 'warning', confirm: true },
      { id: 'focus-b3', label: '聚焦 B3 区段', description: '切换首页态势中心到高风险区段 B3', tone: 'neutral' },
      { id: 'export', label: '导出日报', description: '生成今日巡检摘要与异常快照', tone: 'good' },
      { id: 'voice', label: '语音控制', description: '进入语音指令待命，支持快捷命令', tone: 'danger' },
    ],
  }
}

/** Realtime alert for Home page — delegates to shared generator */
export function createRealtimeAlert(): AlertItem {
  const { type, progress, ...rest } = sharedRealtimeAlert()
  return rest
}
