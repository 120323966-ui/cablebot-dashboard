import { Activity, Gauge, GitBranch } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import type { AlertItem, TrendPoint } from '@/types/dashboard'
import type { SegmentAlertHistory } from '@/types/alerts'

const PIPE_GROUPS = [
  ['A1', 'A2'],
  ['B1', 'B2', 'B3'],
  ['C1', 'C2', 'C3'],
]

function formatValue(value: number, unit?: string) {
  return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)}${unit ?? ''}`
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function sameAlertType(a: AlertItem, b: AlertItem) {
  const left = a.type ?? a.title
  const right = b.type ?? b.title
  return left === right
}

function neighborSegments(segmentId: string) {
  const group = PIPE_GROUPS.find((items) => items.includes(segmentId))
  if (!group) return { upstream: null, downstream: null }
  const index = group.indexOf(segmentId)
  return {
    upstream: index > 0 ? group[index - 1] : null,
    downstream: index < group.length - 1 ? group[index + 1] : null,
  }
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

function ThresholdGauge({ alert }: { alert: AlertItem }) {
  if (!alert.threshold || alert.currentValue === undefined) {
    return (
      <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
        <div className="flex items-center gap-2 text-xs font-medium text-white">
          <Gauge className="h-3.5 w-3.5 text-cyan-300" />
          本体阈值
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

  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-medium text-white">
          <Gauge className="h-3.5 w-3.5 text-cyan-300" />
          本体阈值
        </div>
        <Badge tone={tone}>
          {tone === 'danger' ? '危险区间' : tone === 'warning' ? '预警区间' : '正常区间'}
        </Badge>
      </div>

      <div className="mt-3 flex items-end justify-between">
        <div>
          <div className="text-[11px] text-slate-500">当前值</div>
          <div className="mt-1 text-xl font-semibold text-white">
            {formatValue(alert.currentValue, alert.unit)}
          </div>
        </div>
        <div className="text-right text-[11px] leading-5 text-slate-400">
          <div>预警 {formatValue(warn, alert.unit)}</div>
          <div>危险 {formatValue(danger, alert.unit)}</div>
        </div>
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
  const neighbors = neighborSegments(alert.segmentId)
  const rows = [
    { label: '上游', segmentId: neighbors.upstream },
    { label: '下游', segmentId: neighbors.downstream },
  ].map((row) => {
    const matches = row.segmentId
      ? allAlerts.filter((item) =>
          item.segmentId === row.segmentId
          && item.status !== 'closed'
          && sameAlertType(item, alert),
        )
      : []
    return { ...row, matches }
  })

  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
      <div className="flex items-center gap-2 text-xs font-medium text-white">
        <GitBranch className="h-3.5 w-3.5 text-cyan-300" />
        上下游同类告警
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {rows.map((row) => (
          <div key={row.label} className="rounded-lg border border-white/6 bg-slate-950/35 px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-slate-500">{row.label}</span>
              <span className="text-xs font-medium text-slate-300">{row.segmentId ?? '无'}</span>
            </div>
            <div className="mt-2 flex items-end gap-1.5">
              <span className="text-lg font-semibold text-white">{row.matches.length}</span>
              <span className="pb-0.5 text-[11px] text-slate-500">条同类未关闭</span>
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
  history,
}: {
  alert: AlertItem
  history?: SegmentAlertHistory
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
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-medium text-white">
          <Activity className="h-3.5 w-3.5 text-cyan-300" />
          历史趋势
        </div>
        {history && (
          <span className="text-[11px] text-slate-500">
            近 7 天 {history.recent7d} 次
          </span>
        )}
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
      <ThresholdGauge alert={alert} />
      <NeighborSegmentAlerts alert={alert} allAlerts={allAlerts} />
      <RecentTrend alert={alert} history={history} />
    </div>
  )
}
