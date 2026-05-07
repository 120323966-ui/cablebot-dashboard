import { Activity, Gauge, GitBranch, ListChecks } from 'lucide-react'
import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/Badge'
import type { AlertItem, TrendPoint } from '@/types/dashboard'
import type { SegmentAlertHistory } from '@/types/alerts'
import { getNeighbors, getPropagationDirection, hasConsecutiveNeighborsWithAlert } from '@/utils/topology'
import { mapAlertType } from '@/utils/propagation'

function formatValue(value: number, unit?: string) {
  return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)}${unit ?? ''}`
}

function formatSignedValue(value: number, unit?: string) {
  return `${value > 0 ? '+' : ''}${formatValue(value, unit)}`
}

function formatPercent(value: number) {
  const abs = Math.abs(value)
  const formatted = abs >= 10 ? abs.toFixed(0) : abs.toFixed(1)
  return `${value > 0 ? '+' : value < 0 ? '-' : ''}${formatted}%`
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function sameAlertType(a: AlertItem, b: AlertItem) {
  const left = a.type ?? a.title
  const right = b.type ?? b.title
  return left === right
}

function thresholdTone(alert: AlertItem) {
  if (!alert.threshold || alert.currentValue === undefined) return 'neutral' as const
  const { warn, danger } = alert.threshold
  const lowerIsWorse = danger < warn
  if (lowerIsWorse) {
    if (alert.currentValue <= danger) return 'danger' as const
    if (alert.currentValue <= warn) return 'warning' as const
    return 'good' as const
  }
  if (alert.currentValue >= danger) return 'danger' as const
  if (alert.currentValue >= warn) return 'warning' as const
  return 'good' as const
}

function thresholdDeviation(alert: AlertItem) {
  if (!alert.threshold || alert.currentValue === undefined) return null

  const { warn, danger } = alert.threshold
  const lowerIsWorse = danger < warn
  const tone = thresholdTone(alert)
  const denominator = Math.max(1, Math.abs(danger))

  if (tone === 'danger') {
    const delta = alert.currentValue - danger
    const pct = (delta / denominator) * 100
    const detail = lowerIsWorse
      ? `低于危险阈值 ${formatSignedValue(delta, alert.unit)} (${formatPercent(pct)})`
      : `超危险阈值 ${formatSignedValue(delta, alert.unit)} (${formatPercent(pct)})`
    const summary = lowerIsWorse
      ? `低于危险阈值 ${formatSignedValue(delta, alert.unit)}(${formatPercent(pct)})`
      : `超危险阈值 ${formatSignedValue(delta, alert.unit)}(${formatPercent(pct)})`

    return { tone, detail, summary }
  }

  if (tone === 'warning') {
    const gap = Math.abs(danger - alert.currentValue)
    const detail = `接近危险阈值,差 ${formatValue(gap, alert.unit)}`
    return { tone, detail, summary: `距危险阈值 ${formatValue(gap, alert.unit)}` }
  }

  return { tone, detail: '未达预警阈值', summary: '未达预警阈值' }
}

function getNeighborRows(alert: AlertItem, allAlerts: AlertItem[]) {
  const neighbors = getNeighbors(alert.segmentId)
  return [
    { label: '上游', segmentIds: neighbors.upstream },
    { label: '下游', segmentIds: neighbors.downstream },
  ].map((row) => {
    const matches = allAlerts.filter((item) =>
      row.segmentIds.includes(item.segmentId)
      && item.status !== 'closed'
      && sameAlertType(item, alert),
    )
    return { ...row, matches }
  })
}

function segmentIdsText(segmentIds: string[]) {
  return segmentIds.length > 0 ? segmentIds.join('、') : '无'
}

const SEVERITY_ORDER = ['critical', 'warning', 'info'] as const

function severityLabel(matches: AlertItem[]) {
  return SEVERITY_ORDER
    .map((severity) => {
      const count = matches.filter((item) => item.severity === severity).length
      return count > 0 ? `${severity} ${count}` : null
    })
    .filter(Boolean)
    .join(' / ')
}

function severityDotClass(severity: AlertItem['severity']) {
  if (severity === 'critical') return 'bg-rose-400'
  if (severity === 'warning') return 'bg-amber-400'
  return 'bg-slate-500'
}

function SeverityDots({ matches }: { matches: AlertItem[] }) {
  const dots = SEVERITY_ORDER.flatMap((severity) =>
    matches
      .filter((item) => item.severity === severity)
      .map((item) => ({ id: item.id, severity })),
  )

  if (dots.length === 0) return null

  return (
    <div className="flex items-center gap-1" title={severityLabel(matches)}>
      {dots.map((dot) => (
        <span key={dot.id} className={`h-1 w-1 rounded-full ${severityDotClass(dot.severity)}`} />
      ))}
    </div>
  )
}

function hasConsecutiveTopologySignal(alert: AlertItem, allAlerts: AlertItem[]) {
  const alertType = mapAlertType(alert.type ?? alert.title)
  const direction = getPropagationDirection(alertType)

  return hasConsecutiveNeighborsWithAlert(
    alert.segmentId,
    direction,
    (segmentId) => allAlerts.some((item) =>
      item.segmentId === segmentId
      && item.status !== 'closed'
      && sameAlertType(item, alert)
      && (item.severity === 'critical' || item.severity === 'warning'),
    ),
  )
}

function GradingSummary({
  alert,
  allAlerts,
  history,
}: {
  alert: AlertItem
  allAlerts: AlertItem[]
  history?: SegmentAlertHistory
}) {
  const deviation = thresholdDeviation(alert)
  const neighborRows = getNeighborRows(alert, allAlerts).filter((row) => row.matches.length > 0)
  const hasConsecutive = hasConsecutiveTopologySignal(alert, allAlerts)
  const parts: { key: string; node: ReactNode }[] = [
    {
      key: 'threshold',
      node: deviation ? (
        <span>
          本体
          <span className="font-medium text-white"> {deviation.summary}</span>
        </span>
      ) : (
        <span>本体暂无结构化阈值数据</span>
      ),
    },
  ]

  if (neighborRows.length > 0) {
    parts.push({
      key: 'neighbors',
      node: (
        <span>
          {neighborRows.map((row, idx) => (
            <span key={row.label}>
              {idx > 0 ? ' / ' : ''}
              {row.label}
              <span className="font-medium text-white"> {row.matches.length} 条</span>
              同类待处置
              <span className="text-slate-400">({severityLabel(row.matches)})</span>
            </span>
          ))}
        </span>
      ),
    })
  }

  if (hasConsecutive) {
    parts.push({
      key: 'topology',
      node: (
        <span>
          <span className="font-medium text-white">拓扑连续</span>
          同类告警已触发升级依据
        </span>
      ),
    })
  }

  if (history) {
    parts.push({
      key: 'history',
      node: (
        <span title="包含本段所有类型的告警">
          近 7 天该段共
          <span className="font-medium text-white"> {history.recent7d} 次</span>
          告警
        </span>
      ),
    })
  }

  return (
    <div className="flex gap-2 rounded-xl border border-cyan-300/15 bg-cyan-300/[0.06] px-3 py-2 text-sm text-slate-300">
      <ListChecks className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300" />
      <div className="min-w-0">
        <span className="mr-2 font-medium text-white">综合判断</span>
        {parts.map((part, idx) => (
          <span key={part.key}>
            {idx > 0 && <span className="px-1.5 text-slate-500">·</span>}
            {part.node}
          </span>
        ))}
      </div>
    </div>
  )
}

function ThresholdGauge({ alert }: { alert: AlertItem }) {
  if (!alert.threshold || alert.currentValue === undefined) {
    return (
      <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
        <div className="flex items-center gap-2 text-xs font-medium text-white">
          <Gauge className="h-3.5 w-3.5 text-cyan-300" />
          本体阈值偏离
        </div>
        <div className="mt-3 text-xs text-slate-500">暂无结构化阈值数据</div>
      </div>
    )
  }

  const { warn, danger } = alert.threshold
  const lowerIsWorse = danger < warn
  const rawMin = Math.min(alert.currentValue, warn, danger)
  const rawMax = Math.max(alert.currentValue, warn, danger)
  const span = Math.max(1, rawMax - rawMin)
  const min = lowerIsWorse ? rawMin - span * 0.25 : Math.min(0, rawMin - span * 0.15)
  const max = rawMax + span * 0.2
  const pct = (v: number) => clamp(((v - min) / (max - min)) * 100, 0, 100)
  const valuePct = pct(alert.currentValue)
  const warnPct = pct(warn)
  const dangerPct = pct(danger)
  const tone = thresholdTone(alert)
  const deviation = thresholdDeviation(alert)

  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-medium text-white">
          <Gauge className="h-3.5 w-3.5 text-cyan-300" />
          本体阈值偏离
        </div>
        <Badge tone={tone}>
          {tone === 'danger' ? '危险区间' : tone === 'warning' ? '预警区间' : '正常区间'}
        </Badge>
      </div>

      <div className="mt-3 grid grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] items-end gap-3">
        <div>
          <div className="text-[11px] text-slate-500">当前值</div>
          <div className="mt-1 text-xl font-semibold text-white">
            {formatValue(alert.currentValue, alert.unit)}
          </div>
        </div>
        <div className="min-w-0 text-right">
          <div className="text-[11px] text-slate-500">阈值偏离</div>
          <div className="mt-1 text-sm font-medium leading-5 text-white">{deviation?.detail}</div>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-end gap-3 text-[11px] leading-5 text-slate-400">
        <span>预警 {formatValue(warn, alert.unit)}</span>
        <span>危险 {formatValue(danger, alert.unit)}</span>
      </div>

      <div className="relative mt-4 h-3 rounded-full bg-slate-800">
        <div
          className={`absolute inset-y-0 left-0 rounded-full ${
            tone === 'danger' ? 'bg-rose-400/70' : tone === 'warning' ? 'bg-amber-400/70' : 'bg-emerald-400/70'
          }`}
          style={{ width: `${valuePct}%` }}
        />
        <span className="absolute top-[-5px] h-5 w-px bg-amber-300/80" style={{ left: `${warnPct}%` }} />
        <span className="absolute top-[-5px] h-5 w-px bg-rose-300/90" style={{ left: `${dangerPct}%` }} />
        <span
          className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-slate-950"
          style={{ left: `${valuePct}%` }}
        />
      </div>
    </div>
  )
}

function NeighborSegmentAlerts({
  alert,
  allAlerts,
}: {
  alert: AlertItem
  allAlerts: AlertItem[]
}) {
  const rows = getNeighborRows(alert, allAlerts)

  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
      <div className="flex items-center gap-2 text-xs font-medium text-white">
        <GitBranch className="h-3.5 w-3.5 text-cyan-300" />
        邻段同类告警
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {rows.map((row) => (
          <div key={row.label} className="rounded-lg border border-white/6 bg-slate-950/35 px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-slate-500">{row.label}</span>
              <span className="truncate text-xs font-medium text-slate-300">{segmentIdsText(row.segmentIds)}</span>
            </div>
            <div className="mt-2 flex items-end justify-between gap-2">
              <div className="flex items-end gap-1.5">
                <span className="text-lg font-semibold text-white">{row.matches.length}</span>
                <span className="pb-0.5 text-[11px] text-slate-500">条同类未关闭</span>
              </div>
              <SeverityDots matches={row.matches} />
            </div>
            {row.matches[0] && (
              <div className="mt-1 truncate text-[10px] text-slate-500">
                最近 {row.matches[0].id} · {row.matches[0].status === 'new' ? '待处置' : '已确认'}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function buildFallbackTrend(alert: AlertItem): TrendPoint[] {
  const current = alert.currentValue ?? 0
  const now = new Date(alert.latestOccurredAt ?? alert.occurredAt)
  return Array.from({ length: 6 }, (_, idx) => {
    const time = new Date(now)
    time.setMinutes(now.getMinutes() - (5 - idx) * 6)
    return {
      time: time.toISOString(),
      value: Number((current * (0.92 + idx * 0.016)).toFixed(1)),
    }
  })
}

function RecentTrend({
  alert,
}: {
  alert: AlertItem
}) {
  const points = alert.recentTrend?.length ? alert.recentTrend : buildFallbackTrend(alert)
  const values = points.map((point) => point.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = Math.max(1, max - min)
  const coords = points.map((point, idx) => {
    const x = 8 + idx * (184 / Math.max(1, points.length - 1))
    const y = 58 - ((point.value - min) / span) * 42
    return `${x},${y}`
  })

  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
      <div className="flex items-center gap-2 text-xs font-medium text-white">
        <Activity className="h-3.5 w-3.5 text-cyan-300" />
        传感器值变化
      </div>
      <svg viewBox="0 0 200 70" className="mt-2 h-[70px] w-full">
        <line x1="8" y1="58" x2="192" y2="58" stroke="rgba(148,163,184,0.16)" />
        <line x1="8" y1="16" x2="192" y2="16" stroke="rgba(148,163,184,0.08)" />
        <polyline
          points={coords.join(' ')}
          fill="none"
          stroke="#22d3ee"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {coords.map((coord, idx) => {
          const [x, y] = coord.split(',')
          return <circle key={idx} cx={x} cy={y} r="2.5" fill="#e0f2fe" />
        })}
      </svg>
      <div className="flex items-center justify-between text-[11px] text-slate-500">
        <span>{formatValue(values[0], alert.unit)}</span>
        <span>{formatValue(values.at(-1) ?? values[0], alert.unit)}</span>
      </div>
    </div>
  )
}

export function AlertGradingBasis({
  alert,
  allAlerts,
  history,
}: {
  alert: AlertItem
  allAlerts: AlertItem[]
  history?: SegmentAlertHistory
}) {
  return (
    <div className="space-y-3">
      <GradingSummary alert={alert} allAlerts={allAlerts} history={history} />
      <ThresholdGauge alert={alert} />
      <NeighborSegmentAlerts alert={alert} allAlerts={allAlerts} />
      <RecentTrend alert={alert} />
    </div>
  )
}
