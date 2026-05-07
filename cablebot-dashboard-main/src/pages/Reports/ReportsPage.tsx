import { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Download,
  Eye,
  EyeOff,
  FileText,
  Loader2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useReports } from '@/hooks/useReports'
import type { HistoryPageResponse, InspectionRecord } from '@/types/history'
import type {
  ReportAnalysis,
  ReportConfig,
  ReportsPageResponse,
  RiskLevel,
} from '@/types/reports'

/* ===================================================================
   Helpers
   =================================================================== */

const CN_NUM = ['一', '二', '三', '四', '五', '六', '七', '八']

function fmtDate(iso: string) {
  return iso.slice(5, 10).replace('-', '/')
}

function statusLabel(s: InspectionRecord['status']) {
  if (s === 'completed') return '已完成'
  if (s === 'partial') return '部分完成'
  return '已中止'
}

function nowString() {
  return new Date().toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function riskBadgeProps(level: RiskLevel): { tone: 'good' | 'warning' | 'danger' | 'neutral'; text: string } {
  const map: Record<RiskLevel, { tone: 'good' | 'warning' | 'danger' | 'neutral'; text: string }> = {
    low: { tone: 'good', text: '低风险' },
    medium: { tone: 'neutral', text: '中风险' },
    high: { tone: 'warning', text: '高风险' },
    critical: { tone: 'danger', text: '严重' },
  }
  return map[level]
}

/* -- Print-style section heading with dynamic numbering -- */
function SectionHeading({ index, title }: { index: number; title: string }) {
  return (
    <h3 className="flex items-center gap-2 text-[14px] font-bold text-slate-800">
      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-800 text-[11px] font-bold text-white">
        {CN_NUM[index] ?? index + 1}
      </span>
      {title}
    </h3>
  )
}

/* ===================================================================
   Left Sidebar -- Config Panel
   =================================================================== */

function ConfigSidebar({
  config,
  activeModuleCount,
  exportStatus,
  onUpdate,
  onToggleModule,
  onExport,
}: {
  config: ReportConfig
  activeModuleCount: number
  exportStatus: string
  onUpdate: (patch: Partial<ReportConfig>) => void
  onToggleModule: (key: keyof ReportConfig['modules']) => void
  onExport: () => void
}) {
  const moduleItems: { key: keyof ReportConfig['modules']; label: string; desc: string }[] = [
    { key: 'executiveSummary', label: '执行摘要', desc: '态势评估、关键发现、数据概览' },
    { key: 'alertCharts', label: '告警分析', desc: '趋势图表 + 文字解读 + 类型排名' },
    { key: 'segmentRisk', label: '区段风险评估', desc: '逐段评估叙述 + 热力图' },
    { key: 'inspectionTable', label: '巡检记录', desc: '近期记录 + 异常高亮' },
  ]

  return (
    <div className="flex w-[296px] shrink-0 flex-col gap-5 overflow-y-auto rounded-[28px] border border-white/8 bg-slate-950/50 p-5 shadow-2xl shadow-cyan-950/10 backdrop-blur-xl xl:w-[312px]">
      <div>
        <div className="panel-eyebrow">报告配置</div>
        <div className="mt-1 text-lg font-semibold tracking-tight text-white">生成巡检报告</div>
      </div>

      {/* Title */}
      <label className="block">
        <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">报告标题</span>
        <input
          className="mt-1.5 w-full rounded-xl border border-white/8 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/30"
          value={config.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="输入报告标题"
        />
      </label>

      {/* Time range */}
      <div>
        <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">时间范围</span>
        <div className="mt-1.5 flex gap-2">
          {(['7d', '30d'] as const).map((r) => (
            <button
              key={r}
              onClick={() => onUpdate({ timeRange: r })}
              className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-medium transition ${
                config.timeRange === r
                  ? 'border-cyan-400/30 bg-cyan-400/10 text-white'
                  : 'border-white/8 bg-white/[0.03] text-slate-400 hover:border-white/15 hover:text-white'
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              {r === '7d' ? '近 7 天' : '近 30 天'}
            </button>
          ))}
        </div>
      </div>

      {/* Module toggles */}
      <div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">报告模块</span>
          <span className="text-[10px] text-slate-600">{activeModuleCount}/4 已启用</span>
        </div>
        <div className="mt-2 space-y-2">
          {moduleItems.map((m) => {
            const on = config.modules[m.key]
            return (
              <button
                key={m.key}
                onClick={() => onToggleModule(m.key)}
                className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition ${
                  on
                    ? 'border-cyan-400/20 bg-cyan-400/[0.06]'
                    : 'border-white/6 bg-white/[0.02] opacity-50'
                }`}
              >
                {on ? (
                  <Eye className="h-4 w-4 shrink-0 text-cyan-400" />
                ) : (
                  <EyeOff className="h-4 w-4 shrink-0 text-slate-600" />
                )}
                <div className="min-w-0">
                  <div className="text-xs font-medium text-white">{m.label}</div>
                  <div className="text-[10px] text-slate-500">{m.desc}</div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Author */}
      <label className="block">
        <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">报告作者</span>
        <div className="relative mt-1.5">
          <User className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-600" />
          <input
            className="w-full rounded-xl border border-white/8 bg-white/[0.04] py-2.5 pl-9 pr-3.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/30"
            value={config.author}
            onChange={(e) => onUpdate({ author: e.target.value })}
            placeholder="作者姓名"
          />
        </div>
      </label>

      {/* Remark */}
      <label className="block">
        <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">备注说明</span>
        <textarea
          className="mt-1.5 w-full resize-none rounded-xl border border-white/8 bg-white/[0.04] px-3.5 py-2.5 text-sm leading-relaxed text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/30"
          rows={3}
          value={config.remark}
          onChange={(e) => onUpdate({ remark: e.target.value })}
          placeholder="可选：添加备注或说明"
        />
      </label>

      <div className="flex-1" />

      {/* Export */}
      <Button
        className="w-full gap-2"
        disabled={activeModuleCount === 0 || exportStatus === 'generating'}
        onClick={onExport}
      >
        {exportStatus === 'generating' ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            正在生成 PDF...
          </>
        ) : exportStatus === 'success' ? (
          <>
            <CheckCircle2 className="h-4 w-4" />
            导出成功
          </>
        ) : (
          <>
            <Download className="h-4 w-4" />
            导出 PDF 报告
          </>
        )}
      </Button>
      {activeModuleCount === 0 && (
        <p className="text-center text-[10px] text-amber-400/80">请至少启用一个报告模块</p>
      )}
    </div>
  )
}

/* ===================================================================
   Preview Sections
   =================================================================== */

/* -- Executive Summary -- */
function SectionExecutive({
  idx,
  analysis,
}: {
  idx: number
  analysis: ReportAnalysis
}) {
  const { executive } = analysis
  const badge = riskBadgeProps(executive.overallLevel)

  return (
    <div className="space-y-3">
      <SectionHeading index={idx} title="执行摘要" />

      {/* Overall */}
      <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3.5">
        {executive.overallLevel === 'critical' || executive.overallLevel === 'high' ? (
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
        ) : executive.overallLevel === 'medium' ? (
          <Shield className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
        ) : (
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">整体态势</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                badge.tone === 'danger'
                  ? 'bg-rose-100 text-rose-700'
                  : badge.tone === 'warning'
                    ? 'bg-amber-100 text-amber-700'
                    : badge.tone === 'good'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-200 text-slate-600'
              }`}
            >
              {badge.text}
            </span>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
            {executive.overallStatement}
          </p>
        </div>
      </div>

      {/* Key Findings */}
      <div>
        <div className="mb-1.5 text-[11px] font-semibold text-slate-700">关键发现</div>
        <div className="space-y-1.5">
          {executive.keyFindings.map((f, i) => (
            <div key={i} className="flex items-start gap-2 text-xs leading-relaxed text-slate-600">
              <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" />
              <span>{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Data overview */}
      <div className="rounded-lg border border-slate-200 px-3.5 py-2.5">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          数据概览
        </div>
        <p className="text-xs leading-relaxed text-slate-600">{executive.dataOverview}</p>
      </div>
    </div>
  )
}

/* -- Alert Analysis (charts + text) -- */
function SectionAlertCharts({
  idx,
  analysis,
  raw,
}: {
  idx: number
  analysis: ReportAnalysis
  raw: HistoryPageResponse
}) {
  const { trend } = analysis
  const dates = raw.dailyStats.map((d) => fmtDate(d.date))

  const trendOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#fff',
      borderColor: '#e2e8f0',
      textStyle: { color: '#334155', fontSize: 10 },
    },
    legend: {
      top: 0,
      right: 0,
      textStyle: { color: '#64748b', fontSize: 9 },
      itemWidth: 12,
      itemHeight: 3,
    },
    grid: { left: 8, right: 8, top: 28, bottom: 4, containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates,
      axisLabel: { color: '#94a3b8', fontSize: 8 },
      axisLine: { lineStyle: { color: '#e2e8f0' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#94a3b8', fontSize: 8 },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
    },
    series: [
      {
        name: 'Critical',
        type: 'line',
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 1.5 },
        areaStyle: { opacity: 0.08 },
        data: raw.dailyStats.map((d) => d.critical),
        color: '#ef4444',
      },
      {
        name: 'Warning',
        type: 'line',
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 1.5 },
        areaStyle: { opacity: 0.08 },
        data: raw.dailyStats.map((d) => d.warning),
        color: '#f59e0b',
      },
      {
        name: 'Info',
        type: 'line',
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 1.5 },
        areaStyle: { opacity: 0.05 },
        data: raw.dailyStats.map((d) => d.info),
        color: '#3b82f6',
      },
    ],
  }

  return (
    <div className="space-y-3">
      <SectionHeading index={idx} title="告警分析" />

      {/* Trend narrative */}
      <p className="text-xs leading-relaxed text-slate-600">{trend.trendStatement}</p>

      {/* Chart */}
      <div className="rounded-lg border border-slate-200 p-2">
        <div className="mb-1 text-[10px] font-medium text-slate-500">告警趋势</div>
        <ReactECharts option={trendOption} style={{ height: 180 }} />
      </div>

      {/* Type ranking */}
      <div>
        <div className="mb-1.5 text-[11px] font-semibold text-slate-700">告警类型排名</div>
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[9px] uppercase tracking-wider text-slate-500">
                <th className="px-3 py-1.5 text-left font-medium">排名</th>
                <th className="px-3 py-1.5 text-left font-medium">类型</th>
                <th className="px-3 py-1.5 text-right font-medium">数量</th>
                <th className="px-3 py-1.5 text-right font-medium">占比</th>
              </tr>
            </thead>
            <tbody>
              {trend.alertTypeRanking.map((t, i) => (
                <tr key={t.type} className="border-b border-slate-100">
                  <td className="px-3 py-1.5 font-medium text-slate-500">{i + 1}</td>
                  <td className="px-3 py-1.5 font-medium text-slate-700">{t.type}</td>
                  <td className="px-3 py-1.5 text-right text-slate-600">{t.count}</td>
                  <td className="px-3 py-1.5 text-right text-slate-500">{t.pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* -- Segment Risk Assessment -- */
function SectionSegmentRisk({
  idx,
  analysis,
  raw,
}: {
  idx: number
  analysis: ReportAnalysis
  raw: HistoryPageResponse
}) {
  const segments = ['A1', 'A2', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3']
  const dates = [...new Set(raw.segmentRisks.map((r) => r.date))].sort()
  const dateLabels = dates.map((d) => fmtDate(d))

  const heatData = raw.segmentRisks.map((r) => {
    const xi = dates.indexOf(r.date)
    const yi = segments.indexOf(r.segmentId)
    return [xi, yi, Number(r.risk.toFixed(2))]
  })

  const heatOption = {
    backgroundColor: 'transparent',
    tooltip: {
      backgroundColor: '#fff',
      borderColor: '#e2e8f0',
      textStyle: { color: '#334155', fontSize: 10 },
      formatter: (params: { value: number[] }) => {
        const [xi, yi, v] = params.value
        return `${segments[yi]} ${dateLabels[xi]}<br/>风险指数: <b>${(v * 100).toFixed(0)}</b>`
      },
    },
    grid: { left: 36, right: 12, top: 8, bottom: 28, containLabel: false },
    xAxis: {
      type: 'category',
      data: dateLabels,
      axisLabel: { color: '#94a3b8', fontSize: 8, interval: Math.floor(dates.length / 7) },
      axisLine: { lineStyle: { color: '#e2e8f0' } },
    },
    yAxis: {
      type: 'category',
      data: segments,
      axisLabel: { color: '#64748b', fontSize: 9 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    visualMap: {
      min: 0,
      max: 1,
      show: true,
      orient: 'horizontal' as const,
      left: 'center',
      bottom: 0,
      itemWidth: 10,
      itemHeight: 80,
      textStyle: { color: '#94a3b8', fontSize: 8 },
      inRange: {
        color: ['#f0fdf4', '#86efac', '#fbbf24', '#f87171', '#dc2626'],
      },
    },
    series: [
      {
        type: 'heatmap',
        data: heatData,
        itemStyle: { borderWidth: 1, borderColor: '#fff', borderRadius: 2 },
      },
    ],
  }

  const highRisk = analysis.segments.filter(
    (s) => s.riskLevel === 'critical' || s.riskLevel === 'high',
  )
  const medRisk = analysis.segments.filter((s) => s.riskLevel === 'medium')
  const lowRisk = analysis.segments.filter((s) => s.riskLevel === 'low')

  return (
    <div className="space-y-3">
      <SectionHeading index={idx} title="区段风险评估" />

      {/* Heatmap */}
      <div className="rounded-lg border border-slate-200 p-2">
        <div className="mb-1 text-[10px] font-medium text-slate-500">区段 x 日期 风险矩阵</div>
        <ReactECharts option={heatOption} style={{ height: 220 }} />
      </div>

      {/* Segment narratives */}
      {highRisk.length > 0 && (
        <div>
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-rose-700">
            <AlertTriangle className="h-3 w-3" />
            高风险区段
          </div>
          <div className="space-y-2">
            {highRisk.map((seg) => (
              <div
                key={seg.segmentId}
                className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-rose-800">{seg.segmentId}</span>
                  <span className="rounded-full bg-rose-200 px-1.5 py-0.5 text-[9px] font-semibold text-rose-700">
                    风险 {(seg.avgRisk * 100).toFixed(0)}
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-rose-900/70">{seg.narrative}</p>
                <p className="mt-1 text-[10px] text-rose-700/60">
                  <span className="font-semibold">建议：</span>
                  {seg.suggestion}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {medRisk.length > 0 && (
        <div>
          <div className="mb-1.5 text-[11px] font-semibold text-amber-700">关注区段</div>
          <div className="space-y-2">
            {medRisk.map((seg) => (
              <div
                key={seg.segmentId}
                className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-amber-800">{seg.segmentId}</span>
                  <span className="rounded-full bg-amber-200 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700">
                    风险 {(seg.avgRisk * 100).toFixed(0)}
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-amber-900/70">{seg.narrative}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {lowRisk.length > 0 && (
        <div className="rounded-lg border border-slate-200 px-3.5 py-2.5">
          <span className="text-[11px] font-semibold text-emerald-700">正常区段：</span>
          <span className="text-[11px] text-slate-500">
            {lowRisk.map((s) => s.segmentId).join('、')} 风险较低，运行正常，保持常规巡检即可。
          </span>
        </div>
      )}
    </div>
  )
}

/* -- Inspection Table (trimmed) -- */
function SectionInspectionTable({
  idx,
  records,
}: {
  idx: number
  records: InspectionRecord[]
}) {
  const display = records.slice(0, 15)

  return (
    <div className="space-y-3">
      <SectionHeading index={idx} title="巡检记录" />
      <p className="text-xs text-slate-500">
        共 {records.length} 条记录，以下展示最近 {display.length} 条。
      </p>
      <div className="overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[9px] uppercase tracking-wider text-slate-500">
              <th className="px-2.5 py-2 text-left font-medium">任务</th>
              <th className="px-2 py-2 text-left font-medium">时间</th>
              <th className="px-2 py-2 text-left font-medium">区段</th>
              <th className="px-2 py-2 text-left font-medium">机器人</th>
              <th className="px-2 py-2 text-left font-medium">完成率</th>
              <th className="px-2 py-2 text-left font-medium">告警</th>
              <th className="px-2 py-2 text-left font-medium">耗时</th>
              <th className="px-2 py-2 text-left font-medium">状态</th>
            </tr>
          </thead>
          <tbody>
            {display.map((r) => {
              const abnormal = r.status !== 'completed' || r.alertsFound > 2
              return (
                <tr
                  key={r.id}
                  className={`border-b border-slate-100 ${abnormal ? 'bg-rose-50/50' : ''}`}
                >
                  <td className="px-2.5 py-1.5 font-mono text-slate-700">{r.id}</td>
                  <td className="px-2 py-1.5 text-slate-500">
                    {new Date(r.date).toLocaleDateString('zh-CN', {
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-2 py-1.5 font-medium text-slate-700">{r.segmentId}</td>
                  <td className="px-2 py-1.5 text-slate-500">{r.robotName}</td>
                  <td className="px-2 py-1.5 text-slate-600">
                    {Math.round((r.checksDone / r.checksTotal) * 100)}%
                  </td>
                  <td className="px-2 py-1.5">
                    <span
                      className={`font-medium ${
                        r.alertsFound > 2
                          ? 'text-red-600'
                          : r.alertsFound > 0
                            ? 'text-amber-600'
                            : 'text-slate-400'
                      }`}
                    >
                      {r.alertsFound}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-slate-500">{r.durationMinutes}min</td>
                  <td className="px-2 py-1.5">
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
                        r.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-700'
                          : r.status === 'partial'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {statusLabel(r.status)}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* -- Recommendations (always at the end) -- */
function SectionRecommendations({
  idx,
  analysis,
}: {
  idx: number
  analysis: ReportAnalysis
}) {
  const priorityStyle: Record<string, { bg: string; text: string; label: string }> = {
    urgent: { bg: 'bg-rose-100', text: 'text-rose-700', label: '紧急' },
    suggested: { bg: 'bg-amber-100', text: 'text-amber-700', label: '建议' },
    routine: { bg: 'bg-slate-100', text: 'text-slate-600', label: '常规' },
  }

  return (
    <div className="space-y-3">
      <SectionHeading index={idx} title="运维建议" />
      <div className="space-y-2">
        {analysis.recommendations.map((rec, i) => {
          const style = priorityStyle[rec.priority] ?? priorityStyle.routine
          return (
            <div key={i} className="flex items-start gap-2.5 text-xs leading-relaxed text-slate-600">
              <span
                className={`mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold ${style.bg} ${style.text}`}
              >
                {style.label}
              </span>
              <span>{rec.content}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ===================================================================
   Report Preview -- assembles sections with dynamic numbering
   =================================================================== */

function ReportPreview({
  config,
  data,
}: {
  config: ReportConfig
  data: ReportsPageResponse
}) {
  const raw = data.raw
  const analysis = data.analysis

  const dateRange = useMemo(() => {
    const stats = raw?.dailyStats
    if (!stats?.length) return ''
    return `${stats[0].date} — ${stats[stats.length - 1].date}`
  }, [raw])

  const { executiveSummary, alertCharts, segmentRisk, inspectionTable } = config.modules
  const noModule = !executiveSummary && !alertCharts && !segmentRisk && !inspectionTable

  /* Dynamic section index counter */
  const sections = useMemo(() => {
    if (!raw || !analysis) return []
    const list: { key: string; render: (idx: number) => React.ReactNode }[] = []

    if (executiveSummary) {
      list.push({
        key: 'exec',
        render: (idx) => <SectionExecutive idx={idx} analysis={analysis} />,
      })
    }
    if (alertCharts) {
      list.push({
        key: 'alert',
        render: (idx) => (
          <SectionAlertCharts idx={idx} analysis={analysis} raw={raw} />
        ),
      })
    }
    if (segmentRisk) {
      list.push({
        key: 'risk',
        render: (idx) => (
          <SectionSegmentRisk idx={idx} analysis={analysis} raw={raw} />
        ),
      })
    }
    if (inspectionTable) {
      list.push({
        key: 'table',
        render: (idx) => (
          <SectionInspectionTable idx={idx} records={raw.inspections} />
        ),
      })
    }

    /* Recommendations always at the end when any module is on */
    if (!noModule) {
      list.push({
        key: 'recs',
        render: (idx) => <SectionRecommendations idx={idx} analysis={analysis} />,
      })
    }

    return list
  }, [executiveSummary, alertCharts, segmentRisk, inspectionTable, raw, analysis, noModule])

  return (
    <div className="mx-auto w-full max-w-[780px]">
      <div className="rounded-lg bg-white px-10 py-8 shadow-xl shadow-black/20 ring-1 ring-slate-200/50">
        {/* Page Header */}
        <div className="mb-6 border-b-2 border-slate-800 pb-4">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-900">{config.title || '巡检报告'}</h1>
              <p className="mt-1 text-xs text-slate-500">
                Cablebot HMI - 城市地下电缆排管巡检机器人 PC 监控端
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-600">
                <FileText className="h-3 w-3" />
                自动化巡检报告
              </div>
              <div className="mt-0.5 text-[10px] text-slate-400">{dateRange}</div>
            </div>
          </div>
        </div>

        {/* Body */}
        {noModule ? (
          <div className="flex h-64 items-center justify-center text-sm text-slate-400">
            请在左侧至少启用一个报告模块
          </div>
        ) : (
          <div className="space-y-8">
            {sections.map((sec, i) => (
              <div key={sec.key}>{sec.render(i)}</div>
            ))}
          </div>
        )}

        {/* Remark */}
        {config.remark && (
          <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
              备注
            </div>
            <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-slate-600">
              {config.remark}
            </p>
          </div>
        )}

        {/* Page Footer */}
        <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-3 text-[10px] text-slate-400">
          <span>生成时间：{nowString()}</span>
          <span>作者：{config.author || '—'}</span>
          <span>Cablebot HMI - 第 1 页</span>
        </div>
      </div>
    </div>
  )
}

/* ===================================================================
   Export Overlay
   =================================================================== */

function ExportOverlay({ status }: { status: string }) {
  if (status === 'idle') return null

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
      <div className="pointer-events-auto flex flex-col items-center gap-4 rounded-[28px] border border-white/10 bg-slate-950/90 px-10 py-8 shadow-2xl backdrop-blur-xl">
        {status === 'generating' ? (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
            <div className="text-sm font-medium text-white">正在生成 PDF 报告...</div>
            <div className="h-1.5 w-48 overflow-hidden rounded-full bg-white/10">
              <div className="h-full animate-[progress_2s_ease-in-out] rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" />
            </div>
          </>
        ) : (
          <>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-400/15">
              <Sparkles className="h-6 w-6 text-emerald-400" />
            </div>
            <div className="text-sm font-medium text-white">报告导出成功</div>
            <div className="text-[11px] text-slate-400">文件已保存至本地下载目录</div>
          </>
        )}
      </div>
    </div>
  )
}

/* ===================================================================
   Main Page
   =================================================================== */

export function ReportsPage() {
  const {
    config,
    updateConfig,
    toggleModule,
    data,
    loading,
    error,
    exportStatus,
    startExport,
    activeModuleCount,
  } = useReports()

  if (loading) {
    return (
      <div className="flex h-[520px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="panel-card flex min-h-[360px] items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-semibold text-white">报告数据加载失败</div>
          <p className="mt-3 text-sm text-slate-400">{error ?? '未知错误'}</p>
          <Button className="mt-6" onClick={() => window.location.reload()}>
            重新加载
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <ExportOverlay status={exportStatus} />

      <div className="mb-4 flex items-center gap-3">
        <Badge tone="neutral">
          <span className="flex items-center gap-1.5">
            <FileText className="h-3 w-3" />
            报告生成
          </span>
        </Badge>
        <span className="text-xs text-slate-500">配置报告内容 - 实时预览 - 导出 PDF</span>
      </div>

      <div className="flex gap-5">
        <ConfigSidebar
          config={config}
          activeModuleCount={activeModuleCount}
          exportStatus={exportStatus}
          onUpdate={updateConfig}
          onToggleModule={toggleModule}
          onExport={startExport}
        />

        <div className="min-w-0 flex-1 overflow-y-auto rounded-[28px] border border-white/8 bg-slate-900/40 p-6 shadow-inner backdrop-blur">
          <div className="mb-3 flex items-center justify-between">
            <span className="panel-eyebrow">报告预览</span>
            <span className="text-[10px] text-slate-600">
              {config.timeRange === '7d' ? '近 7 天' : '近 30 天'} - {activeModuleCount} 个模块
            </span>
          </div>
          <ReportPreview config={config} data={data} />
        </div>
      </div>
    </>
  )
}
