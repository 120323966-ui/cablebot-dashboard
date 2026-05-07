import { useNavigate } from 'react-router-dom'
import ReactECharts from 'echarts-for-react'
import { Card } from '@/components/ui/Card'
import type { ActiveTask, AlertItem, RiskHeatmap } from '@/types/dashboard'

function toneLabel(risk: number) {
  if (risk >= 0.8) return '高风险'
  if (risk >= 0.55) return '关注'
  if (risk >= 0.35) return '预警'
  return '稳定'
}

export function HeatmapChart({
  risk,
  alerts,
  activeTask,
}: {
  risk: RiskHeatmap
  alerts: AlertItem[]
  activeTask: ActiveTask | null
}) {
  const navigate = useNavigate()

  /* ── derive summary ── */
  const segmentPeaks = risk.columns.map((seg, ci) => {
    const cells = risk.cells.filter((c) => c.x === ci)
    const peak = Math.max(...cells.map((c) => c.risk), 0)
    const peakCell = cells.find((c) => c.risk === peak)
    const alertCount = alerts.filter((a) => a.segmentId === seg).length
    return { seg, peak, label: peakCell?.label ?? '', alertCount }
  })

  const topSeg = [...segmentPeaks].sort((a, b) => b.peak - a.peak)[0]
  const highCount = segmentPeaks.filter((s) => s.peak >= 0.8).length

  /* ── ECharts data ── */
  const yLabels = [...risk.rows].reverse() // ECharts y-axis bottom to top
  const heatData = risk.cells.map((c) => [c.x, risk.rows.length - 1 - c.y, Number(c.risk.toFixed(2))])

  const option: Record<string, unknown> = {
    backgroundColor: 'transparent',
    tooltip: {
      backgroundColor: 'rgba(15,23,42,0.92)',
      borderColor: 'rgba(255,255,255,0.08)',
      textStyle: { color: '#e5eefc', fontSize: 12 },
      formatter: (params: { data: number[] }) => {
        const [xi, yi, val] = params.data
        const seg = risk.columns[xi]
        const row = yLabels[yi]
        const cell = risk.cells.find((c) => c.x === xi && c.y === (risk.rows.length - 1 - yi))
        const alertCount = alerts.filter((a) => a.segmentId === seg).length
        return `<div style="font-weight:600">${seg} · ${row}</div>
          <div style="margin-top:4px">风险值 <b>${Math.round(val * 100)}</b> · ${toneLabel(val)}</div>
          ${cell?.label ? `<div style="color:#94a3b8">${cell.label}</div>` : ''}
          ${alertCount ? `<div style="color:#fca5a5">关联告警 ${alertCount} 条</div>` : ''}`
      },
    },
    grid: { left: 44, right: 12, top: 8, bottom: 30, containLabel: false },
    xAxis: {
      type: 'category',
      data: risk.columns,
      splitArea: { show: false },
      axisLabel: {
        color: '#64748b',
        fontSize: 11,
        fontWeight: 600,
        interval: 0,
      },
      axisTick: { show: false },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
    },
    yAxis: {
      type: 'category',
      data: yLabels,
      splitArea: { show: false },
      axisLabel: { color: '#64748b', fontSize: 11 },
      axisTick: { show: false },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
    },
    visualMap: {
      min: 0,
      max: 1,
      calculable: false,
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      itemWidth: 12,
      itemHeight: 120,
      textStyle: { color: '#64748b', fontSize: 10 },
      text: ['高风险', '稳定'],
      inRange: {
        color: ['#065f46', '#059669', '#d97706', '#dc2626', '#be123c'],
      },
      show: false,
    },
    series: [
      {
        type: 'heatmap',
        data: heatData,
        itemStyle: {
          borderWidth: 3,
          borderColor: 'rgba(7,17,31,0.9)',
          borderRadius: 6,
        },
        label: {
          show: true,
          color: '#fff',
          fontSize: 13,
          fontWeight: 700,
          formatter: (params: { data: number[] }) => String(Math.round(params.data[2] * 100)),
        },
        emphasis: {
          itemStyle: {
            borderColor: '#22d3ee',
            borderWidth: 2,
            shadowBlur: 12,
            shadowColor: 'rgba(34,211,238,0.35)',
          },
        },
      },
    ],
  }

  const onChartClick = (params: { data?: number[] }) => {
    if (params.data) {
      const seg = risk.columns[params.data[0]]
      if (seg) navigate(`/spatial?segment=${seg}`)
    }
  }

  return (
    <Card
      className="flex h-full flex-col overflow-hidden"
      eyebrow="Risk Map"
      title="风险热力图"
      action={
        highCount > 0 ? (
          <span className="rounded-full border border-rose-400/20 bg-rose-500/10 px-2.5 py-1 text-[11px] font-medium text-rose-200">
            {highCount} 个高风险
          </span>
        ) : null
      }
    >
      {/* Chart */}
      <div className="flex-1">
        <ReactECharts
          option={option}
          style={{ height: '100%', minHeight: 220 }}
          onEvents={{ click: onChartClick }}
        />
      </div>

      {/* Summary strip */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-white/6 bg-white/[0.02] px-4 py-2.5 text-xs text-slate-300">
        <span>
          最高风险 <span className="font-semibold text-rose-300">{topSeg?.seg}</span>{' '}
          <span className="text-slate-500">({Math.round((topSeg?.peak ?? 0) * 100)})</span>
        </span>
        <span className="h-3 w-px bg-white/8" />
        <span>
          高风险 <span className="font-medium text-white">{highCount}</span> 段
        </span>
        {activeTask ? (
          <>
            <span className="h-3 w-px bg-white/8" />
            <span>
              巡检焦点 <span className="font-medium text-cyan-300">{activeTask.segmentId}</span>
            </span>
          </>
        ) : null}
        <span className="h-3 w-px bg-white/8" />
        <span className="text-slate-500">点击区段查看空间定位</span>
      </div>

      {/* Legend */}
      <div className="mt-2 flex items-center justify-center gap-3">
        {[
          { label: '稳定', color: 'bg-emerald-700' },
          { label: '预警', color: 'bg-emerald-500' },
          { label: '关注', color: 'bg-amber-600' },
          { label: '高风险', color: 'bg-rose-600' },
          { label: '严重', color: 'bg-rose-800' },
        ].map((l) => (
          <span key={l.label} className="inline-flex items-center gap-1.5 text-[10px] text-slate-500">
            <span className={`h-2 w-2 rounded-sm ${l.color}`} />
            {l.label}
          </span>
        ))}
      </div>
    </Card>
  )
}
