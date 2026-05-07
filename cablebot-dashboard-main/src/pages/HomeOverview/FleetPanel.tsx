import { useNavigate } from 'react-router-dom'
import ReactECharts from 'echarts-for-react'
import { BatteryCharging, ChevronRight, MapPin, Radio, TrendingDown, TrendingUp, Minus, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import type { ActiveTask, RobotOverview, TrendSeries } from '@/types/dashboard'

/* ── Robot helpers ── */

function healthTone(health: RobotOverview['health']) {
  if (health === 'good') return 'good' as const
  if (health === 'warning') return 'warning' as const
  if (health === 'danger') return 'danger' as const
  return 'neutral' as const
}

function healthLabel(health: RobotOverview['health']) {
  if (health === 'good') return '正常'
  if (health === 'warning') return '注意'
  if (health === 'danger') return '异常'
  return '离线'
}

function batteryColor(pct: number) {
  if (pct >= 60) return 'bg-emerald-400'
  if (pct >= 30) return 'bg-amber-400'
  return 'bg-rose-400'
}

/* ── Trend helpers ── */

function computeDelta(points: { value: number }[]) {
  if (points.length < 2) return { delta: 0, direction: 'steady' as const }
  const current = points[points.length - 1].value
  const prev = points[Math.max(0, points.length - 4)].value
  const delta = Number((current - prev).toFixed(1))
  if (Math.abs(delta) < 0.3) return { delta: 0, direction: 'steady' as const }
  return { delta, direction: delta > 0 ? ('up' as const) : ('down' as const) }
}

/** 判断该趋势在语义上"上升是否危险" */
function isRisingDangerous(label: string) {
  const dangerous = ['温度', 'temperature', '气体', 'gas']
  return dangerous.some((kw) => label.toLowerCase().includes(kw))
}

/* ── Enhanced Sparkline ── */

function TrendCard({ series }: { series: TrendSeries }) {
  const pts = [...series.points].sort(
    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
  )
  const values = pts.map((p) => p.value)
  const current = values.at(-1) ?? 0
  const overThreshold = series.threshold != null && current >= series.threshold
  const { delta, direction } = computeDelta(pts)
  const risingDangerous = isRisingDangerous(series.label)

  /* delta 颜色逻辑：温度上升 → 红色，湿度上升 → 琥珀色，下降 → 绿色，持平 → 灰色 */
  const deltaColor =
    direction === 'steady'
      ? 'text-slate-500'
      : direction === 'up'
        ? risingDangerous
          ? 'text-rose-400'
          : 'text-amber-400'
        : 'text-emerald-400'

  const DirIcon =
    direction === 'up' ? TrendingUp : direction === 'down' ? TrendingDown : Minus

  /* ECharts option */
  const yMin = Math.min(...values) - 2
  const yMax = Math.max(...values, series.threshold ?? 0) + 2

  const option = {
    backgroundColor: 'transparent',
    grid: { left: 0, right: 0, top: 4, bottom: 4 },
    xAxis: { type: 'category', show: false, data: pts.map((p) => p.time) },
    yAxis: { type: 'value', show: false, min: yMin, max: yMax },
    series: [
      /* 阈值以上区域的背景色带 */
      ...(series.threshold != null
        ? [
            {
              type: 'line',
              data: pts.map(() => yMax),
              showSymbol: false,
              lineStyle: { width: 0 },
              areaStyle: { color: 'transparent' },
              markArea: {
                silent: true,
                data: [
                  [
                    { yAxis: series.threshold, itemStyle: { color: overThreshold ? 'rgba(248,113,113,0.06)' : 'rgba(248,113,113,0.02)' } },
                    { yAxis: yMax },
                  ],
                ],
              },
            },
          ]
        : []),
      /* 阈值线 */
      ...(series.threshold != null
        ? [
            {
              type: 'line',
              data: pts.map(() => series.threshold),
              showSymbol: false,
              lineStyle: {
                width: 1,
                type: 'dashed' as const,
                color: overThreshold ? 'rgba(248,113,113,0.4)' : 'rgba(248,113,113,0.2)',
              },
              areaStyle: undefined,
            },
          ]
        : []),
      /* 主数据线 */
      {
        type: 'line',
        data: values.map((v, i) =>
          i === values.length - 1
            ? { value: v, symbol: 'circle', symbolSize: 6, itemStyle: { color: overThreshold ? '#f87171' : '#22d3ee', borderWidth: 0 } }
            : { value: v, symbol: 'none', symbolSize: 0 },
        ),
        smooth: true,
        showSymbol: true,
        lineStyle: {
          width: 2,
          color: overThreshold ? '#f87171' : '#22d3ee',
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: overThreshold ? 'rgba(248,113,113,0.12)' : 'rgba(34,211,238,0.12)' },
              { offset: 1, color: 'rgba(0,0,0,0)' },
            ],
          },
        },
      },
    ],
    tooltip: { show: false },
  }

  return (
    <div
      className={`rounded-xl border p-3 transition ${
        overThreshold
          ? 'border-rose-400/15 bg-rose-400/[0.03]'
          : 'border-white/6 bg-white/[0.02]'
      }`}
    >
      {/* Header: label + value + delta + threshold tag */}
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[11px] text-slate-500">{series.label}</span>
        <span
          className={`text-[15px] font-semibold tabular-nums ${
            overThreshold ? 'text-rose-300' : 'text-white'
          }`}
        >
          {current.toFixed(1)}{series.unit}
        </span>

        {/* Delta indicator */}
        {direction !== 'steady' && (
          <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${deltaColor}`}>
            <DirIcon className="h-3 w-3" />
            {delta > 0 ? '+' : ''}{delta}
          </span>
        )}

        {/* Threshold tag */}
        {series.threshold != null && (
          <span
            className={`ml-auto rounded px-1.5 py-0.5 text-[10px] ${
              overThreshold
                ? 'bg-rose-400/15 text-rose-300'
                : 'text-slate-600'
            }`}
          >
            阈值 {series.threshold}{series.unit}
          </span>
        )}
      </div>

      {/* Chart — 56px height */}
      <ReactECharts
        option={option}
        style={{ height: 56, width: '100%' }}
        opts={{ renderer: 'svg' }}
      />
    </div>
  )
}

/* ── Main ── */

export function FleetPanel({
  robots,
  trends,
  activeTask,
}: {
  robots: RobotOverview[]
  trends: TrendSeries[]
  activeTask?: ActiveTask | null
}) {
  const navigate = useNavigate()

  return (
    <Card className="flex h-full flex-col overflow-hidden" eyebrow="Fleet & Trend" title="机器人与趋势">
      {/* Robot list (scrollable) */}
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 [scrollbar-gutter:stable]">
        {robots.map((r) => {
          const bpct = Math.round(r.batteryPct)
          const isOffline = r.health === 'neutral'
          const isIdle = r.taskStatus === 'idle' || r.taskStatus === 'emergency'
          const taskLabel = r.taskStatus === 'emergency' ? '已急停' : r.taskStatus === 'inspecting' ? '巡检中' : r.taskStatus === 'moving' ? '移动中' : '待命'

          /* ── 与 activeTask 实时进度同步 ── */
          const isActiveRobot = !!activeTask && activeTask.segmentId === r.segmentId && !isIdle
          const progressPct = isActiveRobot
            ? (activeTask.checksTotal > 0
                ? Math.round((activeTask.checksCompleted / activeTask.checksTotal) * 100)
                : activeTask.progressPct)
            : r.taskProgressPct
          const isPaused = isActiveRobot && activeTask.status === 'paused'

          return (
            <button
              key={r.id}
              onClick={() => navigate(`/command?robot=${r.id}`)}
              className={`group flex w-full flex-col gap-2 rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2.5 text-left transition hover:border-cyan-400/18 hover:bg-white/[0.04] ${
                isOffline ? 'opacity-50' : ''
              }`}
            >
              {/* Row 1: identity + stats + chevron */}
              <div className="flex w-full items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{r.name}</span>
                    <Badge tone={healthTone(r.health)}>{healthLabel(r.health)}</Badge>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                    <MapPin className="h-3 w-3 text-slate-600" />
                    {r.location}
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-300">
                  <div className="flex items-center gap-1.5" title={`电量 ${bpct}%`}>
                    <BatteryCharging className="h-3.5 w-3.5 text-slate-500" />
                    <div className="h-1.5 w-12 overflow-hidden rounded-full bg-white/8">
                      <div
                        className={`h-full rounded-full ${batteryColor(bpct)}`}
                        style={{ width: `${bpct}%` }}
                      />
                    </div>
                    <span className="w-8 tabular-nums">{bpct}%</span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-slate-400" title="信号强度">
                    <Radio className="h-3 w-3" />
                    {r.signalRssi}
                  </span>
                  <span className="inline-flex items-center gap-1 text-slate-400" title="速度">
                    <Zap className="h-3 w-3" />
                    {r.speedKmh}
                  </span>
                </div>

                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-700 transition group-hover:text-cyan-400" />
              </div>

              {/* Row 2: task progress — 独占整行宽度 */}
              <div className="flex w-full items-center gap-2.5">
                <span className={`shrink-0 text-[11px] font-medium ${
                  isIdle ? 'text-slate-500'
                  : isPaused ? 'text-amber-400'
                  : r.taskStatus === 'inspecting' ? 'text-cyan-400'
                  : 'text-amber-400'
                }`}>
                  {isPaused ? '已暂停' : taskLabel}
                  {!isIdle && <span className="ml-1 text-slate-500">{r.segmentId}</span>}
                </span>
                {!isIdle && (
                  <>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/8">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isPaused
                            ? 'bg-[linear-gradient(90deg,#f59e0b,#d97706)] animate-pulse'
                            : r.taskStatus === 'inspecting'
                              ? 'bg-[linear-gradient(90deg,#22d3ee,#60a5fa)]'
                              : 'bg-amber-400/60'
                        }`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                    <span className={`shrink-0 text-xs font-semibold tabular-nums ${
                      isPaused ? 'text-amber-300' : 'text-slate-300'
                    }`}>{progressPct}%</span>
                  </>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Environment trend sparklines (always visible) */}
      <div className="shrink-0 space-y-2 border-t border-white/6 pt-3">
        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">环境监测</div>
        {trends.map((s) => (
          <TrendCard key={s.id} series={s} />
        ))}
      </div>
    </Card>
  )
}
