import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Battery,
  Box,
  Clock,
  Crosshair,
  EyeOff,
  Gauge,
  GitBranch,
  MapPin,
  Thermometer,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import type { PipeAlert, PipeSegment, PropagationChain, PropagationLink, RobotOnMap } from '@/types/spatial'
import { getAlertTypeLabel, getPropagationDirectionLabel } from '@/utils/propagation'

/* ───────── helpers ───────── */

function riskTone(risk: number) {
  if (risk >= 0.8) return 'danger' as const
  if (risk >= 0.6) return 'warning' as const
  return 'neutral' as const
}

function riskLabel(risk: number) {
  if (risk >= 0.8) return '高风险'
  if (risk >= 0.6) return '中风险'
  if (risk >= 0.4) return '低风险'
  return '正常'
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return '刚刚'
  if (m < 60) return `${m}分钟前`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}小时前`
  return `${Math.floor(h / 24)}天前`
}

function alertTone(severity: PipeAlert['severity']) {
  if (severity === 'critical') return 'danger' as const
  if (severity === 'warning') return 'warning' as const
  return 'neutral' as const
}

/* ───────── Propagation link row ───────── */

function PropagationLinkRow({
  link,
  variant,
  onClick,
}: {
  link: PropagationLink
  variant: 'related' | 'inferred'
  onClick?: () => void
}) {
  const isRelated = variant === 'related'
  const tone = isRelated && link.severity ? alertTone(link.severity) : 'neutral'
  const dirIcon = link.direction === 'downstream'
    ? <ArrowDownToLine className="h-3 w-3" />
    : <ArrowUpFromLine className="h-3 w-3" />

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`group flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left transition ${
        isRelated
          ? 'border-violet-400/20 bg-violet-400/[0.04] hover:border-violet-400/35 hover:bg-violet-400/[0.08]'
          : 'border-white/6 bg-white/[0.02] opacity-75'
      } ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
    >
      <span className={`shrink-0 ${isRelated ? 'text-violet-300' : 'text-slate-500'}`}>
        {dirIcon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-white">{link.segmentId}</span>
          <span className="text-[10px] text-slate-500">
            {link.direction === 'downstream' ? '下游' : '上游'} · {link.hopDistance} 跳
          </span>
        </div>
        {!isRelated && (
          <div className="mt-0.5 text-[10px] text-slate-500">推测影响范围,暂无同类告警</div>
        )}
      </div>
      {isRelated && link.severity && (
        <Badge tone={tone}>{link.severity}</Badge>
      )}
    </button>
  )
}

/* ───────── Component ───────── */

export function SpatialInfoPanel({
  segment,
  alerts,
  robots,
  propagationChain,
  pointCloudVisible,
  onAlertClick,
  onOpenPointCloud,
  onClosePointCloud,
}: {
  segment: PipeSegment
  alerts: PipeAlert[]
  robots: RobotOnMap[]
  propagationChain: PropagationChain | null
  /** 三维剖面视图当前是否显示 */
  pointCloudVisible?: boolean
  onAlertClick?: (alertId: string) => void
  /** 打开三维剖面视图 */
  onOpenPointCloud?: () => void
  /** 关闭三维剖面视图 */
  onClosePointCloud?: () => void
}) {
  const segAlerts = alerts.filter((a) => a.segmentId === segment.id && a.status !== 'closed')
  const segRobots = robots.filter((r) => r.segmentId === segment.id)

  /* 传播链激活时,把上下游分组,给侧栏渲染做准备 */
  const propGroups = propagationChain ? {
    upstream: propagationChain.related.filter((l) => l.direction === 'upstream'),
    downstream: propagationChain.related.filter((l) => l.direction === 'downstream'),
    inferredUpstream: propagationChain.inferred.filter((l) => l.direction === 'upstream'),
    inferredDownstream: propagationChain.inferred.filter((l) => l.direction === 'downstream'),
  } : null

  /* 机器人是否在传播链上(用于风险提示) */
  const robotOnChain = propagationChain
    ? robots.find((r) => {
        if (r.status === 'idle') return false
        if (r.segmentId === propagationChain.originSegmentId) return true
        return propagationChain.related.some((l) => l.segmentId === r.segmentId)
            || propagationChain.inferred.some((l) => l.segmentId === r.segmentId)
      })
    : null

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* ── Header ── */}
      <div className="shrink-0 border-b border-white/6 p-5">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-white">{segment.id} 区段</span>
          <Badge tone={riskTone(segment.riskLevel)}>{riskLabel(segment.riskLevel)}</Badge>
          {propagationChain?.originSegmentId === segment.id && (
            <Badge tone="neutral">
              <span className="text-violet-300">传播链起点</span>
            </Badge>
          )}
        </div>
        <div className="mt-1 text-xs text-slate-500">
          长度 {segment.length}m · 最近巡检 {relativeTime(segment.lastInspected)}
        </div>

        {/* ── 三维剖面视图开关 ── */}
        {(onOpenPointCloud || onClosePointCloud) && (
          <button
            onClick={pointCloudVisible ? onClosePointCloud : onOpenPointCloud}
            className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition ${
              pointCloudVisible
                ? 'border-cyan-400/30 bg-cyan-400/[0.08] text-cyan-200 hover:bg-cyan-400/[0.12]'
                : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-cyan-400/25 hover:bg-cyan-400/[0.05] hover:text-white'
            }`}
          >
            {pointCloudVisible ? (
              <>
                <EyeOff className="h-4 w-4" />
                关闭三维剖面
              </>
            ) : (
              <>
                <Box className="h-4 w-4" />
                查看三维剖面
              </>
            )}
          </button>
        )}
      </div>

      {/* ═══════════════════════════════════════════
          拓扑传播链 — 论文 5.4 节核心信息组
         ═══════════════════════════════════════════ */}
      {propagationChain && propGroups && (
        <div className="shrink-0 border-b border-white/6 bg-violet-400/[0.02] p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-violet-300">
              <GitBranch className="h-3 w-3" />
              拓扑传播链
            </div>
            <span className="text-[10px] text-slate-500">
              {getPropagationDirectionLabel(propagationChain.direction)}
            </span>
          </div>

          <div className="rounded-xl border border-violet-400/15 bg-violet-400/[0.05] px-3 py-2">
            <div className="text-[11px] text-slate-400">异常类型</div>
            <div className="mt-0.5 text-sm font-medium text-white">
              {getAlertTypeLabel(propagationChain.alertType)}
            </div>
          </div>

          {/* 机器人在风险路径上的提示 */}
          {robotOnChain && (
            <div className="mt-3 rounded-xl border border-amber-400/25 bg-amber-400/[0.06] px-3 py-2">
              <div className="flex items-center gap-1.5 text-[11px] text-amber-300">
                <AlertTriangle className="h-3 w-3" />
                {robotOnChain.name} 当前位于传播链上
              </div>
              <div className="mt-0.5 text-[10px] text-slate-400">
                建议在告警处置页查看行进策略
              </div>
            </div>
          )}

          {/* 上游关联 */}
          {(propagationChain.direction === 'both' || propagationChain.direction === 'upstream') && (
            <div className="mt-3">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[10px] text-slate-500">上游关联</span>
                <span className="text-[10px] text-slate-600">
                  {propGroups.upstream.length} 段
                </span>
              </div>
              {propGroups.upstream.length > 0 ? (
                <div className="space-y-1.5">
                  {propGroups.upstream.map((link) => (
                    <PropagationLinkRow
                      key={`up-rel-${link.segmentId}`}
                      link={link}
                      variant="related"
                      onClick={link.alertId && onAlertClick
                        ? () => onAlertClick(link.alertId!)
                        : undefined}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-white/4 bg-white/[0.01] px-3 py-2 text-[10px] text-slate-600">
                  上游 {propGroups.inferredUpstream.length > 0 ? '暂无同类告警' : '无可追溯区段'}
                </div>
              )}
            </div>
          )}

          {/* 下游关联 */}
          {(propagationChain.direction === 'both' || propagationChain.direction === 'downstream') && (
            <div className="mt-3">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[10px] text-slate-500">下游关联</span>
                <span className="text-[10px] text-slate-600">
                  {propGroups.downstream.length} 段
                </span>
              </div>
              {propGroups.downstream.length > 0 ? (
                <div className="space-y-1.5">
                  {propGroups.downstream.map((link) => (
                    <PropagationLinkRow
                      key={`down-rel-${link.segmentId}`}
                      link={link}
                      variant="related"
                      onClick={link.alertId && onAlertClick
                        ? () => onAlertClick(link.alertId!)
                        : undefined}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-white/4 bg-white/[0.01] px-3 py-2 text-[10px] text-slate-600">
                  下游 {propGroups.inferredDownstream.length > 0 ? '暂无同类告警' : '无可追溯区段'}
                </div>
              )}
            </div>
          )}

          {/* 推测影响范围 */}
          {propagationChain.inferred.length > 0 && (
            <div className="mt-3">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[10px] text-slate-500">推测影响范围</span>
                <span className="text-[10px] text-slate-600">
                  {propagationChain.inferred.length} 段
                </span>
              </div>
              <div className="space-y-1.5">
                {propagationChain.inferred.map((link) => (
                  <PropagationLinkRow
                    key={`inf-${link.segmentId}`}
                    link={link}
                    variant="inferred"
                  />
                ))}
              </div>
            </div>
          )}

          {/* direction === 'none' 时的提示 */}
          {propagationChain.direction === 'none' && (
            <div className="mt-3 rounded-lg border border-white/4 bg-white/[0.02] px-3 py-2 text-[10px] text-slate-500">
              该类型异常仅在本段产生影响,不向上下游传播。
            </div>
          )}
        </div>
      )}

      {/* ── Environment data ── */}
      <div className="shrink-0 border-b border-white/6 p-5">
        <div className="mb-3 text-[11px] uppercase tracking-[0.2em] text-slate-500">
          环境数据
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <Thermometer className="h-3 w-3" /> 温度
            </div>
            <div className={`mt-1 text-xl font-semibold ${segment.temperatureC > 60 ? 'text-rose-400' : segment.temperatureC > 40 ? 'text-amber-400' : 'text-white'}`}>
              {segment.temperatureC}°C
            </div>
          </div>
          <div className="rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <Gauge className="h-3 w-3" /> 湿度
            </div>
            <div className={`mt-1 text-xl font-semibold ${segment.humidityPct > 80 ? 'text-amber-400' : 'text-white'}`}>
              {segment.humidityPct}%
            </div>
          </div>
          <div className="rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <AlertTriangle className="h-3 w-3" /> 活跃告警
            </div>
            <div className={`mt-1 text-xl font-semibold ${segment.activeAlerts > 0 ? 'text-rose-400' : 'text-white'}`}>
              {segment.activeAlerts}
            </div>
          </div>
          <div className="rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <Clock className="h-3 w-3" /> 风险指数
            </div>
            <div className="mt-1 text-xl font-semibold text-white">
              {(segment.riskLevel * 100).toFixed(0)}
            </div>
          </div>
        </div>
      </div>

      {/* ── Robots in segment ── */}
      {segRobots.length > 0 && (
        <div className="shrink-0 border-b border-white/6 p-5">
          <div className="mb-3 text-[11px] uppercase tracking-[0.2em] text-slate-500">
            区段内机器人
          </div>
          <div className="space-y-2">
            {segRobots.map((r) => (
              <div key={r.id} className="rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white">{r.name}</span>
                  <Badge tone={r.status === 'inspecting' ? 'good' : r.status === 'moving' ? 'neutral' : 'warning'}>
                    {r.status === 'inspecting' ? '巡检中' : r.status === 'moving' ? '移动中' : '待命'}
                  </Badge>
                </div>
                <div className="mt-2 flex items-center gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Battery className="h-3 w-3" /> {r.batteryPct.toFixed(0)}%
                  </span>
                  <span className="flex items-center gap-1">
                    <Gauge className="h-3 w-3" /> {r.speedKmh}km/h
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {(r.progress * 100).toFixed(0)}%处
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Alerts in segment ── */}
      {segAlerts.length > 0 && (
        <div className="shrink-0 p-5">
          <div className="mb-3 text-[11px] uppercase tracking-[0.2em] text-slate-500">
            告警标记 · {segAlerts.length} 条
          </div>
          <div className="space-y-2">
            {segAlerts.map((a) => (
              <button
                key={a.id}
                onClick={() => onAlertClick?.(a.id)}
                className="group flex w-full items-center gap-3 rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2 text-left transition hover:border-cyan-400/25 hover:bg-cyan-400/[0.04]"
              >
                <AlertTriangle className={`h-3.5 w-3.5 shrink-0 ${
                  a.severity === 'critical' ? 'text-rose-400' : a.severity === 'warning' ? 'text-amber-400' : 'text-slate-400'
                }`} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-white">{a.label}</div>
                  <div className="text-[10px] text-slate-500">
                    位置 {(a.progress * 100).toFixed(0)}%
                    {propagationChain?.originAlertId === a.id && (
                      <span className="ml-1.5 text-violet-300">· 当前传播链起点</span>
                    )}
                  </div>
                </div>
                <Crosshair className="h-3.5 w-3.5 shrink-0 text-slate-600 transition group-hover:text-cyan-400" />
                <Badge tone={alertTone(a.severity)}>{a.severity}</Badge>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── No alerts ── */}
      {segAlerts.length === 0 && (
        <div className="p-5 text-center text-sm text-slate-600">
          该区段暂无告警标记
        </div>
      )}
    </div>
  )
}
