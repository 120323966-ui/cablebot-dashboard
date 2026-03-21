import ReactECharts from 'echarts-for-react'
import { BatteryCharging, MapPin, Radio, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import type { RobotOverview, TrendSeries } from '@/types/dashboard'

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

/* ── Sparkline ── */

function Sparkline({ series }: { series: TrendSeries }) {
  const pts = [...series.points].sort(
    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
  )
  const values = pts.map((p) => p.value)
  const current = values.at(-1) ?? 0
  const overThreshold = series.threshold != null && current >= series.threshold

  const option = {
    backgroundColor: 'transparent',
    grid: { left: 0, right: 0, top: 2, bottom: 2 },
    xAxis: { type: 'category', show: false, data: pts.map((p) => p.time) },
    yAxis: { type: 'value', show: false },
    series: [
      {
        type: 'line',
        data: values,
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 2, color: overThreshold ? '#f87171' : '#22d3ee' },
        areaStyle: { color: overThreshold ? 'rgba(248,113,113,0.08)' : 'rgba(34,211,238,0.08)' },
      },
      ...(series.threshold != null
        ? [
            {
              type: 'line',
              data: pts.map(() => series.threshold),
              showSymbol: false,
              lineStyle: { width: 1, type: 'dashed' as const, color: 'rgba(248,113,113,0.35)' },
            },
          ]
        : []),
    ],
    tooltip: { show: false },
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2">
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-500">{series.label}</span>
          <span className={`text-sm font-semibold tabular-nums ${overThreshold ? 'text-rose-300' : 'text-white'}`}>
            {current}{series.unit}
          </span>
        </div>
        <ReactECharts option={option} style={{ height: 32, width: '100%' }} opts={{ renderer: 'svg' }} />
      </div>
    </div>
  )
}

/* ── Main ── */

export function FleetPanel({
  robots,
  trends,
}: {
  robots: RobotOverview[]
  trends: TrendSeries[]
}) {
  return (
    <Card className="flex h-full flex-col overflow-hidden" eyebrow="Fleet & Trend" title="机器人与趋势">
      {/* Robot list */}
      <div className="space-y-2">
        {robots.map((r) => {
          const bpct = Math.round(r.batteryPct)
          return (
            <div
              key={r.id}
              className="flex items-center gap-3 rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2.5"
            >
              {/* Identity */}
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

              {/* Stats */}
              <div className="flex items-center gap-3 text-xs text-slate-300">
                {/* Battery bar */}
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
            </div>
          )
        })}
      </div>

      {/* Trend sparklines */}
      <div className="mt-auto space-y-2 pt-3">
        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">关键趋势</div>
        {trends.map((s) => (
          <Sparkline key={s.id} series={s} />
        ))}
      </div>
    </Card>
  )
}
