import { Card } from '@/components/ui/Card'
import type { ActiveTask, AlertItem, HeatCell, RiskHeatmap } from '@/types/dashboard'

type RiskTone = 'critical' | 'watch' | 'warning' | 'stable'

type CellWithRow = HeatCell & {
  rowLabel: string
}

type SegmentSummary = {
  segmentId: string
  cells: CellWithRow[]
  peak: number
  average: number
  dominant: CellWithRow
  alertCount: number
  criticalAlertCount: number
  isActive: boolean
}

function toneOf(risk: number): RiskTone {
  if (risk >= 0.8) return 'critical'
  if (risk >= 0.55) return 'watch'
  if (risk >= 0.35) return 'warning'
  return 'stable'
}

function toneLabel(risk: number) {
  if (risk >= 0.8) return '高风险'
  if (risk >= 0.55) return '关注'
  if (risk >= 0.35) return '预警'
  return '稳定'
}

function scoreOf(risk: number) {
  return Math.round(risk * 100)
}

function rowShortLabel(label: string) {
  if (label === '北侧') return '北'
  if (label === '中段') return '中'
  if (label === '南侧') return '南'
  return label.slice(0, 1)
}

function toneStyles(tone: RiskTone) {
  switch (tone) {
    case 'critical':
      return {
        dot: 'bg-rose-400',
        text: 'text-rose-100',
        softText: 'text-rose-200',
        ring: 'border-rose-400/22',
        chip: 'border-rose-400/25 bg-rose-500/10 text-rose-100',
        bar: 'from-rose-500 to-pink-300',
        glow: 'from-rose-500/18 via-fuchsia-500/10 to-transparent',
      }
    case 'watch':
      return {
        dot: 'bg-amber-300',
        text: 'text-amber-50',
        softText: 'text-amber-100',
        ring: 'border-amber-300/18',
        chip: 'border-amber-300/20 bg-amber-400/10 text-amber-100',
        bar: 'from-amber-400 to-yellow-200',
        glow: 'from-amber-400/18 via-amber-300/10 to-transparent',
      }
    case 'warning':
      return {
        dot: 'bg-sky-300',
        text: 'text-sky-50',
        softText: 'text-sky-100',
        ring: 'border-sky-300/18',
        chip: 'border-sky-300/20 bg-sky-400/10 text-sky-100',
        bar: 'from-sky-400 to-cyan-200',
        glow: 'from-sky-400/16 via-cyan-300/8 to-transparent',
      }
    case 'stable':
    default:
      return {
        dot: 'bg-emerald-300',
        text: 'text-emerald-50',
        softText: 'text-emerald-100',
        ring: 'border-emerald-300/16',
        chip: 'border-emerald-300/18 bg-emerald-400/10 text-emerald-100',
        bar: 'from-emerald-400 to-emerald-200',
        glow: 'from-emerald-400/16 via-emerald-300/8 to-transparent',
      }
  }
}

function buildSegments(
  risk: RiskHeatmap,
  alerts: AlertItem[],
  activeTask: ActiveTask | null,
): SegmentSummary[] {
  return risk.columns.map((segmentId, colIndex) => {
    const cells: CellWithRow[] = risk.rows.map((rowLabel, rowIndex) => {
      const matched = risk.cells.find((item) => item.x === colIndex && item.y === rowIndex)

      return {
        x: colIndex,
        y: rowIndex,
        risk: matched?.risk ?? 0,
        label: matched?.label ?? '无数据',
        rowLabel,
      }
    })

    const sorted = [...cells].sort((a, b) => b.risk - a.risk)
    const dominant =
      sorted[0] ??
      ({
        x: colIndex,
        y: 0,
        risk: 0,
        label: '无数据',
        rowLabel: risk.rows[0] ?? '区段',
      } satisfies CellWithRow)

    const relatedAlerts = alerts.filter((alert) => alert.segmentId === segmentId)
    const average = cells.reduce((sum, cell) => sum + cell.risk, 0) / (cells.length || 1)

    return {
      segmentId,
      cells,
      peak: dominant.risk,
      average,
      dominant,
      alertCount: relatedAlerts.length,
      criticalAlertCount: relatedAlerts.filter((alert) => alert.severity === 'critical').length,
      isActive: activeTask?.segmentId === segmentId,
    }
  })
}

function recommendationText(
  topRisk: SegmentSummary | null,
  secondRisk: SegmentSummary | null,
  activeSegment: SegmentSummary | null,
) {
  if (!topRisk) return '当前暂无明显异常区段，可继续按既定路线巡检。'

  if (activeSegment && activeSegment.segmentId === topRisk.segmentId) {
    return `建议优先复核 ${topRisk.segmentId}${topRisk.dominant.rowLabel}，重点关注“${topRisk.dominant.label}”，并保持当前巡检焦点。`
  }

  if (secondRisk) {
    return `建议先检查 ${topRisk.segmentId}${topRisk.dominant.rowLabel}，随后转检 ${secondRisk.segmentId}${secondRisk.dominant.rowLabel}。`
  }

  return `建议立即复核 ${topRisk.segmentId}${topRisk.dominant.rowLabel}，重点关注“${topRisk.dominant.label}”。`
}

function LegendChip({
  label,
  dotClass,
}: {
  label: string
  dotClass: string
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-[11px] text-slate-300">
      <span className={`h-2.5 w-2.5 rounded-full ${dotClass}`} />
      <span>{label}</span>
    </span>
  )
}

function OverviewChip({
  label,
  value,
  detail,
}: {
  label: string
  value: string
  detail: string
}) {
  return (
    <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.28em] text-slate-500">{label}</div>
      <div className="mt-3 text-2xl font-semibold tracking-tight text-white">{value}</div>
      <div className="mt-2 text-xs leading-5 text-slate-400">{detail}</div>
    </div>
  )
}

function SegmentTile({ segment }: { segment: SegmentSummary }) {
  const tone = toneOf(segment.peak)
  const styles = toneStyles(tone)

  return (
    <article
      className={`relative overflow-hidden rounded-[26px] border p-4 ${
        segment.isActive
          ? 'border-cyan-400/28 bg-cyan-500/[0.06] shadow-[0_0_0_1px_rgba(34,211,238,0.08)]'
          : `${styles.ring} bg-white/[0.03]`
      }`}
    >
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${styles.glow}`} />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_62%)] opacity-45" />

      {segment.alertCount > 0 ? (
        <div className="absolute right-3.5 top-11 z-10">
          <span className="inline-flex whitespace-nowrap rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-white/85">
            告警 {segment.alertCount}
          </span>
        </div>
      ) : null}

      <div className="relative">
        <div className="pr-24">
          <div className="text-[11px] uppercase tracking-[0.32em] text-slate-500">SEGMENT</div>
          <div className="mt-2 text-3xl font-semibold tracking-tight text-white">
            {segment.segmentId}
          </div>
        </div>

        <div className="mt-4 flex items-end justify-between gap-4">
          <div>
            <div className={`text-5xl font-semibold leading-none ${styles.text}`}>
              {scoreOf(segment.peak)}
            </div>
            <div className={`mt-2 text-sm font-medium ${styles.softText}`}>
              {toneLabel(segment.peak)}
            </div>
          </div>

          <div className="max-w-[110px] text-right text-xs leading-5 text-slate-300">
            <div className="text-slate-400">主风险段</div>
            <div className="mt-1 text-white">
              {segment.dominant.rowLabel} · {segment.dominant.label}
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-2.5">
          {segment.cells.map((cell) => {
            const cellTone = toneStyles(toneOf(cell.risk))

            return (
              <div
                key={`${segment.segmentId}-${cell.rowLabel}`}
                className="grid grid-cols-[26px_minmax(0,1fr)_34px] items-center gap-2 text-xs"
              >
                <span className="text-slate-400">{rowShortLabel(cell.rowLabel)}</span>
                <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${cellTone.bar}`}
                    style={{ width: `${Math.max(12, scoreOf(cell.risk))}%` }}
                  />
                </div>
                <span className="text-right text-slate-300">{scoreOf(cell.risk)}</span>
              </div>
            )
          })}
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/8 pt-4 text-xs">
          <span className="text-slate-400">均值 {scoreOf(segment.average)}</span>
          <span className="text-slate-300">
            {segment.criticalAlertCount > 0
              ? `${segment.criticalAlertCount} 条高优先告警`
              : '无高优先告警'}
          </span>
        </div>
      </div>
    </article>
  )
}

function RiskBriefCard({
  label,
  value,
  description,
}: {
  label: string
  value: string
  description: string
}) {
  return (
    <section className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
      <div className="text-[11px] uppercase tracking-[0.28em] text-slate-500">{label}</div>
      <div className="mt-3 text-3xl font-semibold tracking-tight text-white">{value}</div>
      <div className="mt-2 text-sm leading-6 text-slate-300">{description}</div>
    </section>
  )
}

export function RiskHeatmapPanel({
  risk,
  alerts,
  activeTask,
}: {
  risk: RiskHeatmap
  alerts: AlertItem[]
  activeTask: ActiveTask | null
}) {
  const segments = buildSegments(risk, alerts, activeTask)
  const rankedByRisk = [...segments].sort(
    (a, b) => b.peak - a.peak || b.alertCount - a.alertCount,
  )
  const rankedByAlerts = [...segments].sort(
    (a, b) => b.alertCount - a.alertCount || b.peak - a.peak,
  )

  const topRisk = rankedByRisk[0] ?? null
  const secondRisk = rankedByRisk[1] ?? null
  const topAlertSegment = rankedByAlerts[0] ?? null
  const activeSegment = segments.find((item) => item.isActive) ?? null

  const highRiskCount = segments.filter((item) => item.peak >= 0.8).length
  const watchCount = segments.filter((item) => item.peak >= 0.55 && item.peak < 0.8).length
  const totalAlerts = alerts.length
  const recommendation = recommendationText(topRisk, secondRisk, activeSegment)

  return (
    <Card
      className="h-full"
      eyebrow="Risk Map"
      title="区段风险态势图"
      action={
        <div className="rounded-full border border-rose-400/20 bg-rose-500/10 px-3 py-1 text-xs text-rose-100">
          {highRiskCount} 个高风险区段
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-[11px] text-slate-400">
            综合风险、关联告警与当前巡检焦点联动展示
          </span>
          <LegendChip label="高风险" dotClass="bg-rose-400" />
          <LegendChip label="关注" dotClass="bg-amber-300" />
          <LegendChip label="预警" dotClass="bg-sky-300" />
          <LegendChip label="稳定" dotClass="bg-emerald-300" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <OverviewChip
            label="最高风险"
            value={topRisk?.segmentId ?? '--'}
            detail={
              topRisk
                ? `${topRisk.dominant.rowLabel} · ${topRisk.dominant.label} · ${scoreOf(topRisk.peak)}`
                : '暂无重点区段'
            }
          />
          <OverviewChip
            label="当前巡检焦点"
            value={activeTask?.segmentId ?? '--'}
            detail={
              activeTask
                ? `${activeTask.title} · 已完成 ${activeTask.checksCompleted}/${activeTask.checksTotal}`
                : '当前无进行中的巡检任务'
            }
          />
          <OverviewChip
            label="关联告警"
            value={String(totalAlerts)}
            detail={
              topAlertSegment && topAlertSegment.alertCount > 0
                ? `${topAlertSegment.segmentId} 告警最多，共 ${topAlertSegment.alertCount} 条`
                : '当前无关联告警'
            }
          />
          <OverviewChip
            label="风险分布"
            value={`${highRiskCount}/${watchCount}`}
            detail="前者为高风险区段数，后者为关注区段数"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {segments.map((segment) => (
            <SegmentTile key={segment.segmentId} segment={segment} />
          ))}
        </div>

        <div className="grid gap-3 xl:grid-cols-[0.92fr_0.92fr_1.16fr]">
          <RiskBriefCard
            label="Top Risk"
            value={topRisk?.segmentId ?? '--'}
            description={
              topRisk
                ? `当前最高优先巡检区段，${topRisk.dominant.rowLabel}“${topRisk.dominant.label}”最值得关注。`
                : '当前没有识别到重点区段。'
            }
          />

          <RiskBriefCard
            label="Linked Alerts"
            value={String(totalAlerts)}
            description={
              totalAlerts > 0
                ? `最近告警主要分布在 ${topAlertSegment?.segmentId ?? '--'}，建议结合告警列表交叉复核。`
                : '暂无需要联动关注的告警。'
            }
          />

          <section className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
                Risk Brief
              </div>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] text-white/80">
                优先排查
              </span>
            </div>

            <div className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
              <div>
                <span className="text-white">建议：</span>
                {recommendation}
              </div>
              <div>
                <span className="text-white">分布：</span>
                高风险 {highRiskCount} 段，关注 {watchCount} 段，其余区段整体平稳。
              </div>
              <div>
                <span className="text-white">联动：</span>
                当前任务焦点为 {activeTask?.segmentId ?? '--'}，可与风险最高段{' '}
                {topRisk?.segmentId ?? '--'} 联合判断。
              </div>
            </div>
          </section>
        </div>
      </div>
    </Card>
  )
}