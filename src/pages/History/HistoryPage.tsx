import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactECharts from 'echarts-for-react'
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Filter,
  List,
  Percent,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useHistory } from '@/hooks/useHistory'
import type { AlertRecord, HistoryPageResponse, InspectionRecord, TimeRange } from '@/types/history'

/* ═══════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════ */

function formatDate(iso: string) {
  return iso.slice(5, 10).replace('-', '/')
}

function statusLabel(s: InspectionRecord['status']) {
  if (s === 'completed') return '已完成'
  if (s === 'partial') return '部分完成'
  return '已中止'
}

function statusTone(s: InspectionRecord['status']) {
  if (s === 'completed') return 'good' as const
  if (s === 'partial') return 'warning' as const
  return 'danger' as const
}

function modeLabel(m: InspectionRecord['mode']) {
  if (m === 'auto') return '自动'
  if (m === 'semi-auto') return '半自动'
  return '手动'
}

function sevTone(s: AlertRecord['severity']) {
  if (s === 'critical') return 'danger' as const
  if (s === 'warning') return 'warning' as const
  return 'neutral' as const
}

/* ═══════════════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════════════ */

/* ── Time range selector ── */
function TimeRangeBar({
  range,
  onChange,
}: {
  range: TimeRange
  onChange: (r: TimeRange) => void
}) {
  const options: { value: TimeRange; label: string }[] = [
    { value: '7d', label: '近 7 天' },
    { value: '30d', label: '近 30 天' },
  ]

  return (
    <div className="flex items-center gap-2">
      <Calendar className="h-4 w-4 text-slate-500" />
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
            range === opt.value
              ? 'border-cyan-400/30 bg-cyan-400/10 text-white'
              : 'border-white/8 bg-white/[0.03] text-slate-400 hover:border-white/15 hover:text-white'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

/* ── KPI Card ── */
function KpiCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: number | string
  sub: string
  color: string
}) {
  return (
    <div className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-3">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-slate-500">
        <span className={color}>{icon}</span>
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
      <div className="mt-1 text-xs text-slate-400">{sub}</div>
    </div>
  )
}

/* ── Alert Trend Chart (line) ── */
function AlertTrendChart({ data }: { data: HistoryPageResponse }) {
  const dates = data.dailyStats.map((d) => formatDate(d.date))

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(15,23,42,0.92)',
      borderColor: 'rgba(255,255,255,0.1)',
      textStyle: { color: '#e2e8f0' },
    },
    legend: {
      top: 4,
      right: 0,
      textStyle: { color: '#94a3b8', fontSize: 11 },
    },
    grid: { left: 12, right: 16, top: 40, bottom: 24, containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates,
      axisLabel: { color: '#64748b', fontSize: 10 },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#64748b', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
    },
    series: [
      {
        name: 'Critical',
        type: 'line',
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 2.5 },
        areaStyle: { opacity: 0.1 },
        data: data.dailyStats.map((d) => d.critical),
        color: '#f43f5e',
      },
      {
        name: 'Warning',
        type: 'line',
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 2.5 },
        areaStyle: { opacity: 0.1 },
        data: data.dailyStats.map((d) => d.warning),
        color: '#f59e0b',
      },
      {
        name: 'Info',
        type: 'line',
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 2 },
        areaStyle: { opacity: 0.08 },
        data: data.dailyStats.map((d) => d.info),
        color: '#38bdf8',
      },
    ],
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
      <div className="mb-1 text-[11px] uppercase tracking-[0.2em] text-slate-500">
        告警趋势
      </div>
      <ReactECharts option={option} style={{ height: 260 }} />
    </div>
  )
}

/* ── Risk Heatmap ── */
function RiskHeatmapChart({
  data,
  onCellClick,
}: {
  data: HistoryPageResponse
  onCellClick: (segmentId: string) => void
}) {
  const segments = ['A1', 'A2', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3']
  const dates = [...new Set(data.segmentRisks.map((r) => r.date))].sort()
  const dateLabels = dates.map((d) => formatDate(d))

  const heatData = data.segmentRisks.map((r) => {
    const xi = dates.indexOf(r.date)
    const yi = segments.indexOf(r.segmentId)
    return [xi, yi, Number(r.risk.toFixed(2))]
  })

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      backgroundColor: 'rgba(15,23,42,0.92)',
      borderColor: 'rgba(255,255,255,0.1)',
      textStyle: { color: '#e2e8f0' },
      formatter: (params: { value: number[] }) => {
        const [xi, yi, v] = params.value
        return `${segments[yi]} · ${dateLabels[xi]}<br/>风险指数: <b>${(v * 100).toFixed(0)}</b>`
      },
    },
    grid: { left: 40, right: 16, top: 8, bottom: 28, containLabel: false },
    xAxis: {
      type: 'category',
      data: dateLabels,
      axisLabel: { color: '#64748b', fontSize: 9, interval: Math.floor(dates.length / 7) },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
      splitArea: { show: false },
    },
    yAxis: {
      type: 'category',
      data: segments,
      axisLabel: { color: '#94a3b8', fontSize: 11 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    visualMap: {
      min: 0,
      max: 1,
      show: false,
      inRange: {
        color: ['#0f172a', '#164e63', '#0e7490', '#f59e0b', '#ef4444'],
      },
    },
    series: [
      {
        type: 'heatmap',
        data: heatData,
        itemStyle: { borderWidth: 1.5, borderColor: '#0f172a', borderRadius: 3 },
        emphasis: { itemStyle: { borderColor: '#22d3ee', borderWidth: 2 } },
      },
    ],
  }

  const onEvents = {
    click: (params: { value?: number[] }) => {
      if (params.value) {
        const yi = params.value[1]
        onCellClick(segments[yi])
      }
    },
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
          区段风险热力图
        </span>
        <span className="text-[9px] text-slate-600">点击区段行跳转空间定位</span>
      </div>
      <ReactECharts option={option} style={{ height: 260 }} onEvents={onEvents} />
    </div>
  )
}

/* ── Alert Type Donut ── */
function AlertTypeDonut({ data }: { data: HistoryPageResponse }) {
  const total = data.alertTypes.reduce((s, t) => s + t.count, 0)

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      backgroundColor: 'rgba(15,23,42,0.92)',
      borderColor: 'rgba(255,255,255,0.1)',
      textStyle: { color: '#e2e8f0' },
      formatter: (params: { name: string; value: number; percent: number }) =>
        `${params.name}<br/>数量: <b>${params.value}</b> (${params.percent}%)`,
    },
    legend: {
      orient: 'vertical',
      right: 8,
      top: 'center',
      textStyle: { color: '#94a3b8', fontSize: 10 },
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 8,
    },
    color: ['#f43f5e', '#38bdf8', '#f59e0b', '#22d3ee', '#a78bfa', '#34d399', '#fb923c', '#818cf8'],
    series: [
      {
        type: 'pie',
        radius: ['42%', '70%'],
        center: ['35%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: { borderColor: '#0f172a', borderWidth: 2, borderRadius: 4 },
        label: { show: false },
        emphasis: {
          label: { show: true, color: '#fff', fontSize: 12, fontWeight: 600 },
          scaleSize: 6,
        },
        data: data.alertTypes.map((t) => ({ name: t.type, value: t.count })),
      },
    ],
    graphic: {
      type: 'text',
      left: '32.5%',
      top: '46%',
      style: {
        text: `${total}`,
        textAlign: 'center',
        fill: '#fff',
        fontSize: 22,
        fontWeight: 600,
      },
    },
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
      <div className="mb-1 text-[11px] uppercase tracking-[0.2em] text-slate-500">
        告警类型分布
      </div>
      <ReactECharts option={option} style={{ height: 260 }} />
    </div>
  )
}

/* ── Segment Comparison Bar ── */
function SegmentCompareBar({
  data,
  selectedSegment,
  onSegmentClick,
}: {
  data: HistoryPageResponse
  selectedSegment: string | null
  onSegmentClick: (segmentId: string) => void
}) {
  const segments = data.segmentSummaries.map((s) => s.segmentId)

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(15,23,42,0.92)',
      borderColor: 'rgba(255,255,255,0.1)',
      textStyle: { color: '#e2e8f0' },
      axisPointer: { type: 'shadow' },
    },
    legend: {
      top: 4,
      right: 0,
      textStyle: { color: '#94a3b8', fontSize: 11 },
    },
    grid: { left: 12, right: 16, top: 40, bottom: 24, containLabel: true },
    xAxis: {
      type: 'category',
      data: segments,
      axisLabel: { color: '#94a3b8', fontSize: 11 },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#64748b', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
    },
    series: [
      {
        name: '告警数',
        type: 'bar',
        barWidth: '28%',
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: (params: { dataIndex: number }) =>
            segments[params.dataIndex] === selectedSegment ? '#fff' : '#f43f5e',
        },
        data: data.segmentSummaries.map((s) => s.alertCount),
      },
      {
        name: '巡检次数',
        type: 'bar',
        barWidth: '28%',
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: (params: { dataIndex: number }) =>
            segments[params.dataIndex] === selectedSegment ? '#94a3b8' : '#22d3ee',
        },
        data: data.segmentSummaries.map((s) => s.inspectionCount),
      },
    ],
  }

  const onEvents = {
    click: (params: { dataIndex?: number }) => {
      if (params.dataIndex !== undefined) {
        onSegmentClick(segments[params.dataIndex])
      }
    },
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
          区段对比
        </span>
        <span className="text-[9px] text-slate-600">点击柱状查看区段详情</span>
      </div>
      <ReactECharts option={option} style={{ height: 260 }} onEvents={onEvents} />
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   Segment Detail Panel (expandable below bar chart)
   ═══════════════════════════════════════════════════ */

function SegmentDetailPanel({
  segmentId,
  alertRecords,
  inspections,
  summary,
  onClose,
}: {
  segmentId: string
  alertRecords: AlertRecord[]
  inspections: InspectionRecord[]
  summary: { alertCount: number; inspectionCount: number; avgRisk: number; topAlertType: string }
  onClose: () => void
}) {
  const [tab, setTab] = useState<'alerts' | 'inspections'>('alerts')

  const segAlerts = useMemo(
    () => alertRecords.filter((a) => a.segmentId === segmentId).sort((a, b) => b.date.localeCompare(a.date)),
    [alertRecords, segmentId],
  )
  const segInspections = useMemo(
    () => inspections.filter((r) => r.segmentId === segmentId),
    [inspections, segmentId],
  )

  return (
    <div className="rounded-2xl border border-cyan-400/20 bg-slate-950/60 backdrop-blur">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/6 px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold text-white">{segmentId} 区段详情</span>
          <Badge tone={summary.avgRisk >= 0.6 ? 'danger' : summary.avgRisk >= 0.35 ? 'warning' : 'good'}>
            风险 {(summary.avgRisk * 100).toFixed(0)}
          </Badge>
        </div>
        <div className="flex items-center gap-4">
          {/* Summary chips */}
          <div className="hidden items-center gap-3 text-xs text-slate-400 lg:flex">
            <span>告警 <b className="text-rose-400">{summary.alertCount}</b></span>
            <span>巡检 <b className="text-cyan-400">{summary.inspectionCount}</b></span>
            <span>高频类型 <Badge tone="neutral">{summary.topAlertType}</Badge></span>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-slate-400 transition hover:border-white/20 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-white/6 px-5">
        <button
          onClick={() => setTab('alerts')}
          className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-medium transition ${
            tab === 'alerts'
              ? 'border-cyan-400 text-white'
              : 'border-transparent text-slate-500 hover:text-white'
          }`}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          告警明细 ({segAlerts.length})
        </button>
        <button
          onClick={() => setTab('inspections')}
          className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-medium transition ${
            tab === 'inspections'
              ? 'border-cyan-400 text-white'
              : 'border-transparent text-slate-500 hover:text-white'
          }`}
        >
          <List className="h-3.5 w-3.5" />
          巡检记录 ({segInspections.length})
        </button>
      </div>

      {/* Tab content */}
      <div className="max-h-[320px] overflow-y-auto p-4 [scrollbar-gutter:stable]">
        {tab === 'alerts' && (
          <div className="space-y-1.5">
            {segAlerts.length === 0 && (
              <div className="py-8 text-center text-sm text-slate-600">该区段暂无告警记录</div>
            )}
            {segAlerts.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-3 rounded-xl border border-white/6 bg-white/[0.02] px-4 py-2.5 transition hover:bg-white/[0.04]"
              >
                <AlertTriangle
                  className={`h-3.5 w-3.5 shrink-0 ${
                    a.severity === 'critical'
                      ? 'text-rose-400'
                      : a.severity === 'warning'
                        ? 'text-amber-400'
                        : 'text-slate-400'
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-white">{a.type}</div>
                  <div className="text-[10px] text-slate-500">{a.date} · {a.id}</div>
                </div>
                <Badge tone={sevTone(a.severity)}>{a.severity}</Badge>
              </div>
            ))}
          </div>
        )}

        {tab === 'inspections' && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/6 text-[10px] uppercase tracking-[0.18em] text-slate-500">
                <th className="px-3 py-2 text-left font-medium">任务</th>
                <th className="px-3 py-2 text-left font-medium">时间</th>
                <th className="px-3 py-2 text-left font-medium">机器人</th>
                <th className="px-3 py-2 text-left font-medium">模式</th>
                <th className="px-3 py-2 text-left font-medium">完成率</th>
                <th className="px-3 py-2 text-left font-medium">告警</th>
                <th className="px-3 py-2 text-left font-medium">耗时</th>
                <th className="px-3 py-2 text-left font-medium">状态</th>
              </tr>
            </thead>
            <tbody>
              {segInspections.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-sm text-slate-600">
                    该区段暂无巡检记录
                  </td>
                </tr>
              )}
              {segInspections.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-white/[0.03] transition hover:bg-white/[0.02]"
                >
                  <td className="px-3 py-2 font-mono text-xs text-slate-300">{r.id}</td>
                  <td className="px-3 py-2 text-xs text-slate-400">
                    {new Date(r.date).toLocaleDateString('zh-CN', {
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-400">{r.robotName}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">{modeLabel(r.mode)}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-white/[0.06]">
                        <div
                          className="h-full rounded-full bg-cyan-400/60"
                          style={{ width: `${Math.round((r.checksDone / r.checksTotal) * 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {r.checksDone}/{r.checksTotal}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`text-xs font-medium ${
                        r.alertsFound > 2 ? 'text-rose-400' : r.alertsFound > 0 ? 'text-amber-400' : 'text-slate-500'
                      }`}
                    >
                      {r.alertsFound}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-400">{r.durationMinutes}min</td>
                  <td className="px-3 py-2">
                    <Badge tone={statusTone(r.status)}>{statusLabel(r.status)}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   Inspection Table
   ═══════════════════════════════════════════════════ */

function InspectionTable({
  records,
  segmentFilter,
  onSegmentFilter,
}: {
  records: InspectionRecord[]
  segmentFilter: string | null
  onSegmentFilter: (seg: string | null) => void
}) {
  const SEGMENTS = ['A1', 'A2', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3']
  const filtered = segmentFilter ? records.filter((r) => r.segmentId === segmentFilter) : records

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02]">
      <div className="flex items-center justify-between border-b border-white/6 px-5 py-3">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-500">
          <BarChart3 className="h-3.5 w-3.5" />
          巡检记录 · {filtered.length} 条
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="h-3 w-3 text-slate-600" />
          <button
            onClick={() => onSegmentFilter(null)}
            className={`rounded-md px-2 py-0.5 text-[10px] transition ${
              !segmentFilter ? 'bg-cyan-400/10 text-cyan-300' : 'text-slate-500 hover:text-white'
            }`}
          >
            全部
          </button>
          {SEGMENTS.map((s) => (
            <button
              key={s}
              onClick={() => onSegmentFilter(s)}
              className={`rounded-md px-2 py-0.5 text-[10px] transition ${
                segmentFilter === s ? 'bg-cyan-400/10 text-cyan-300' : 'text-slate-500 hover:text-white'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="max-h-[280px] overflow-y-auto [scrollbar-gutter:stable]">
        <table className="w-full text-sm">
          <thead>
            <tr className="sticky top-0 z-10 border-b border-white/6 bg-slate-950/80 text-[10px] uppercase tracking-[0.18em] text-slate-500 backdrop-blur">
              <th className="px-4 py-2.5 text-left font-medium">任务</th>
              <th className="px-3 py-2.5 text-left font-medium">时间</th>
              <th className="px-3 py-2.5 text-left font-medium">区段</th>
              <th className="px-3 py-2.5 text-left font-medium">机器人</th>
              <th className="px-3 py-2.5 text-left font-medium">模式</th>
              <th className="px-3 py-2.5 text-left font-medium">完成率</th>
              <th className="px-3 py-2.5 text-left font-medium">告警</th>
              <th className="px-3 py-2.5 text-left font-medium">耗时</th>
              <th className="px-3 py-2.5 text-left font-medium">状态</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 60).map((r) => (
              <tr key={r.id} className="border-b border-white/[0.03] transition hover:bg-white/[0.02]">
                <td className="px-4 py-2 font-mono text-xs text-slate-300">{r.id}</td>
                <td className="px-3 py-2 text-xs text-slate-400">
                  {new Date(r.date).toLocaleDateString('zh-CN', {
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </td>
                <td className="px-3 py-2">
                  <button onClick={() => onSegmentFilter(r.segmentId)} className="text-xs text-cyan-400 hover:underline">
                    {r.segmentId}
                  </button>
                </td>
                <td className="px-3 py-2 text-xs text-slate-400">{r.robotName}</td>
                <td className="px-3 py-2 text-xs text-slate-500">{modeLabel(r.mode)}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full bg-cyan-400/60"
                        style={{ width: `${Math.round((r.checksDone / r.checksTotal) * 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-500">{r.checksDone}/{r.checksTotal}</span>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`text-xs font-medium ${
                      r.alertsFound > 2 ? 'text-rose-400' : r.alertsFound > 0 ? 'text-amber-400' : 'text-slate-500'
                    }`}
                  >
                    {r.alertsFound}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs text-slate-400">{r.durationMinutes}min</td>
                <td className="px-3 py-2">
                  <Badge tone={statusTone(r.status)}>{statusLabel(r.status)}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   Main Page
   ═══════════════════════════════════════════════════ */

export function HistoryPage() {
  const { data, loading, error, range, setRange } = useHistory()
  const navigate = useNavigate()

  const [segmentFilter, setSegmentFilter] = useState<string | null>(null)
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null)

  const handleHeatmapClick = useCallback(
    (segmentId: string) => {
      navigate('/spatial')
    },
    [navigate],
  )

  const handleBarClick = useCallback((segmentId: string) => {
    setSelectedSegment((prev) => (prev === segmentId ? null : segmentId))
  }, [])

  const selectedSummary = useMemo(() => {
    if (!data || !selectedSegment) return null
    return data.segmentSummaries.find((s) => s.segmentId === selectedSegment) ?? null
  }, [data, selectedSegment])

  if (loading) {
    return <div className="panel-card min-h-[520px] animate-pulse bg-white/[0.03]" />
  }

  if (error || !data) {
    return (
      <div className="panel-card flex min-h-[360px] items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-semibold text-white">历史数据加载失败</div>
          <p className="mt-3 text-sm text-slate-400">{error ?? '未知错误'}</p>
          <Button className="mt-6" onClick={() => window.location.reload()}>重新加载</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* ═══ Layer 1: Time range + KPI strip ═══ */}
      <TimeRangeBar range={range} onChange={setRange} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
          label="总巡检次数"
          value={data.totalInspections}
          sub={`${range === '7d' ? '近 7 天' : '近 30 天'}累计`}
          color="text-cyan-400"
        />
        <KpiCard
          icon={<AlertTriangle className="h-3.5 w-3.5" />}
          label="总告警数"
          value={data.totalAlerts}
          sub="critical + warning + info"
          color="text-rose-400"
        />
        <KpiCard
          icon={<Clock className="h-3.5 w-3.5" />}
          label="平均处置时长"
          value={`${data.avgHandleMinutes}min`}
          sub="从告警到关闭"
          color="text-amber-400"
        />
        <KpiCard
          icon={<Percent className="h-3.5 w-3.5" />}
          label="巡检覆盖率"
          value={`${data.coveragePct}%`}
          sub="已覆盖区段占比"
          color="text-emerald-400"
        />
      </div>

      {/* ═══ Layer 2: Charts 2×2 ═══ */}
      <div className="grid gap-4 xl:grid-cols-[1.15fr_1fr]">
        <AlertTrendChart data={data} />
        <AlertTypeDonut data={data} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_1fr]">
        <RiskHeatmapChart data={data} onCellClick={handleHeatmapClick} />
        <SegmentCompareBar
          data={data}
          selectedSegment={selectedSegment}
          onSegmentClick={handleBarClick}
        />
      </div>

      {/* ═══ Expandable segment detail panel ═══ */}
      {selectedSegment && selectedSummary && (
        <SegmentDetailPanel
          segmentId={selectedSegment}
          alertRecords={data.alertRecords}
          inspections={data.inspections}
          summary={selectedSummary}
          onClose={() => setSelectedSegment(null)}
        />
      )}

      {/* ═══ Layer 3: Inspection Table ═══ */}
      <InspectionTable
        records={data.inspections}
        segmentFilter={segmentFilter}
        onSegmentFilter={setSegmentFilter}
      />
    </div>
  )
}
