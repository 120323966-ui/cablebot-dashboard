/* ═══════════════════════════════════════════════════
   EventTimeline — 按真实时间比例分布的事件泳道图

   论文 5.7 节:
     "时间轴显示任务开始、告警发生、人工接管、暂停恢复、
      通信中断和任务结束等关键事件,帮助操作员重建一次
      任务中的关键变化。"

   设计要点:
     - 横轴=真实时间比例,容器宽度内自适应,不横向滚动
     - 4 条 lane(任务/告警/控制/通信),按真实位置画事件点
     - 同位置同类事件聚合显示数字,避免视觉糊成一片
     - 告警 date 只到天,统一按当天 12:00 锚定;巡检带时刻
   ═══════════════════════════════════════════════════ */

import { useMemo, useState } from 'react'
import type { AlertRecord, HistoryPageResponse, InspectionRecord } from '@/types/history'

/* ─────────────────────────────────────────────
   1. 事件模型
   ───────────────────────────────────────────── */

type LaneKey = 'task' | 'alert' | 'control' | 'comm'

interface BaseEvent {
  id: string
  lane: LaneKey
  /** 事件时间(ms) */
  t: number
  segmentId?: string
  title: string
  detail: string
}

interface TaskRangeEvent extends BaseEvent {
  lane: 'task'
  /** 区间结束时间(ms) */
  tEnd: number
  status: InspectionRecord['status']
}

interface AlertEvent extends BaseEvent {
  lane: 'alert'
  severity: AlertRecord['severity']
}

interface ControlEvent extends BaseEvent {
  lane: 'control'
  kind: 'takeover' | 'pause'
}

interface CommEvent extends BaseEvent {
  lane: 'comm'
}

type AnyEvent = TaskRangeEvent | AlertEvent | ControlEvent | CommEvent

/* ─────────────────────────────────────────────
   2. 数据收集

   - 巡检:最近 N 条直接展开成 task 区间 + 衍生事件
   - 告警:全部入 alert lane(交给后续聚合阶段处理密度)
   ───────────────────────────────────────────── */

/** 把 'YYYY-MM-DD' 字符串锚定到当天 12:00 本地时间,避免时区跳天 */
function dayAnchor(dateStr: string): number {
  return new Date(`${dateStr}T12:00:00`).getTime()
}

function buildEvents(data: HistoryPageResponse): AnyEvent[] {
  const events: AnyEvent[] = []

  /* 巡检 — 取最近 12 条作为 task 区间 */
  const recentInspections = [...data.inspections]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 12)

  for (const r of recentInspections) {
    const t = new Date(r.date).getTime()
    const tEnd = t + r.durationMinutes * 60_000

    events.push({
      id: `t-${r.id}`,
      lane: 'task',
      t,
      tEnd,
      segmentId: r.segmentId,
      title: `${r.segmentId} · ${r.robotName}`,
      detail: `${r.mode} · ${r.durationMinutes}min · ${r.status}`,
      status: r.status,
    })

    /* 衍生事件:接管 / 暂停 / 通信波动 */
    if (r.mode === 'manual') {
      events.push({
        id: `c-${r.id}`,
        lane: 'control',
        kind: 'takeover',
        t: t + r.durationMinutes * 60_000 * 0.35,
        segmentId: r.segmentId,
        title: '人工接管',
        detail: `${r.segmentId} · 操作员介入运动控制`,
      })
    }
    if (r.status === 'partial') {
      events.push({
        id: `p-${r.id}`,
        lane: 'control',
        kind: 'pause',
        t: t + r.durationMinutes * 60_000 * 0.55,
        segmentId: r.segmentId,
        title: '任务暂停后恢复',
        detail: `${r.segmentId} · 巡检过程存在中断`,
      })
    }
    if (r.alertsFound > 2) {
      events.push({
        id: `m-${r.id}`,
        lane: 'comm',
        t: t + r.durationMinutes * 60_000 * 0.7,
        segmentId: r.segmentId,
        title: '通信质量波动',
        detail: `${r.segmentId} · 多告警期间链路质量需复核`,
      })
    }
  }

  /* 告警 — 全量进入 lane,后续聚合 */
  for (const a of data.alertRecords) {
    events.push({
      id: `a-${a.id}`,
      lane: 'alert',
      severity: a.severity,
      t: dayAnchor(a.date),
      segmentId: a.segmentId,
      title: `${a.segmentId} · ${a.type}`,
      detail: `${a.id} · ${a.severity}`,
    })
  }

  return events
}

/* ─────────────────────────────────────────────
   3. 时间轴范围 & 像素映射
   ───────────────────────────────────────────── */

interface TimeScale {
  tMin: number
  tMax: number
  /** ms → x 单位(viewBox 坐标) */
  toX: (t: number) => number
}

const VIEW_LEFT = 26
const VIEW_RIGHT = 988

function buildScale(events: AnyEvent[]): TimeScale {
  if (events.length === 0) {
    const now = Date.now()
    return {
      tMin: now - 86400_000,
      tMax: now,
      toX: () => (VIEW_LEFT + VIEW_RIGHT) / 2,
    }
  }
  let tMin = Infinity
  let tMax = -Infinity
  for (const e of events) {
    if (e.t < tMin) tMin = e.t
    const end = e.lane === 'task' ? e.tEnd : e.t
    if (end > tMax) tMax = end
  }
  /* 两端各留 1.5% padding,避免事件贴边 */
  const span = Math.max(tMax - tMin, 60_000)
  const pad = span * 0.015
  tMin -= pad
  tMax += pad

  const range = VIEW_RIGHT - VIEW_LEFT
  return {
    tMin,
    tMax,
    toX: (t: number) => VIEW_LEFT + ((t - tMin) / (tMax - tMin)) * range,
  }
}

/* ─────────────────────────────────────────────
   4. 同 lane 临近事件聚合
   ───────────────────────────────────────────── */

const CLUSTER_DX = 6 // viewBox 单位

interface AlertCluster {
  kind: 'cluster-alert'
  x: number
  count: number
  topSeverity: AlertRecord['severity']
  events: AlertEvent[]
}
interface ControlCluster {
  kind: 'cluster-control'
  x: number
  count: number
  events: ControlEvent[]
  hasTakeover: boolean
}
interface CommCluster {
  kind: 'cluster-comm'
  x: number
  count: number
  events: CommEvent[]
}

const SEV_RANK: Record<AlertRecord['severity'], number> = { critical: 3, warning: 2, info: 1 }

function clusterAlerts(events: AlertEvent[], scale: TimeScale): AlertCluster[] {
  const sorted = [...events].sort((a, b) => a.t - b.t)
  const clusters: AlertCluster[] = []
  for (const e of sorted) {
    const x = scale.toX(e.t)
    const last = clusters[clusters.length - 1]
    if (last && x - last.x < CLUSTER_DX) {
      last.events.push(e)
      last.count++
      if (SEV_RANK[e.severity] > SEV_RANK[last.topSeverity]) {
        last.topSeverity = e.severity
      }
      last.x = (last.x * (last.count - 1) + x) / last.count
    } else {
      clusters.push({ kind: 'cluster-alert', x, count: 1, topSeverity: e.severity, events: [e] })
    }
  }
  return clusters
}

function clusterControl(events: ControlEvent[], scale: TimeScale): ControlCluster[] {
  const sorted = [...events].sort((a, b) => a.t - b.t)
  const clusters: ControlCluster[] = []
  for (const e of sorted) {
    const x = scale.toX(e.t)
    const last = clusters[clusters.length - 1]
    if (last && x - last.x < CLUSTER_DX) {
      last.events.push(e)
      last.count++
      if (e.kind === 'takeover') last.hasTakeover = true
      last.x = (last.x * (last.count - 1) + x) / last.count
    } else {
      clusters.push({
        kind: 'cluster-control',
        x,
        count: 1,
        events: [e],
        hasTakeover: e.kind === 'takeover',
      })
    }
  }
  return clusters
}

function clusterComm(events: CommEvent[], scale: TimeScale): CommCluster[] {
  const sorted = [...events].sort((a, b) => a.t - b.t)
  const clusters: CommCluster[] = []
  for (const e of sorted) {
    const x = scale.toX(e.t)
    const last = clusters[clusters.length - 1]
    if (last && x - last.x < CLUSTER_DX) {
      last.events.push(e)
      last.count++
      last.x = (last.x * (last.count - 1) + x) / last.count
    } else {
      clusters.push({ kind: 'cluster-comm', x, count: 1, events: [e] })
    }
  }
  return clusters
}

/* ─────────────────────────────────────────────
   5. 时间刻度

   范围 ≤ 8 天:每天一刻度
   范围 > 8 天:每 5 天一刻度
   ───────────────────────────────────────────── */

interface TickLabel {
  x: number
  label: string
  emphasized: boolean
}

function buildTicks(scale: TimeScale): TickLabel[] {
  const spanDays = (scale.tMax - scale.tMin) / 86400_000
  const stepDays = spanDays <= 8 ? 1 : 5

  const ticks: TickLabel[] = []
  const cursor = new Date(scale.tMin)
  cursor.setHours(0, 0, 0, 0)
  while (cursor.getTime() < scale.tMin) {
    cursor.setDate(cursor.getDate() + 1)
  }

  while (cursor.getTime() <= scale.tMax) {
    const x = scale.toX(cursor.getTime())
    const day = cursor.getDate()
    const month = cursor.getMonth() + 1
    const emphasized = day === 1
    const label = day === 1 ? `${month}/${day}` : `${day}`
    ticks.push({ x, label, emphasized })
    cursor.setDate(cursor.getDate() + stepDays)
  }
  return ticks
}

/* ─────────────────────────────────────────────
   6. 颜色规范(沿用项目色板)
   ───────────────────────────────────────────── */

const COLORS = {
  axis: 'rgba(255,255,255,0.06)',
  axisStrong: 'rgba(255,255,255,0.14)',
  laneBg: 'rgba(255,255,255,0.02)',
  laneLabel: 'rgba(148,163,184,0.65)',
  tickLabel: 'rgba(148,163,184,0.55)',
  tickLabelStrong: 'rgba(226,232,240,0.85)',
  task: {
    completed: 'rgba(52,211,153,0.7)',
    partial: 'rgba(251,191,36,0.75)',
    aborted: 'rgba(244,63,94,0.7)',
  },
  alert: {
    critical: 'rgb(244,63,94)',
    warning: 'rgb(251,191,36)',
    info: 'rgb(34,211,238)',
  },
  control: {
    takeover: 'rgb(167,139,250)',
    pause: 'rgb(251,191,36)',
  },
  comm: 'rgb(125,211,252)',
}

/* ─────────────────────────────────────────────
   7. Lane 几何
   ───────────────────────────────────────────── */

const LANE_HEIGHT = 26
const LANE_GAP = 4
const TICK_AREA_H = 22
const TOP_PAD = 4

const LANES: { key: LaneKey; label: string }[] = [
  { key: 'task', label: '任务' },
  { key: 'alert', label: '告警' },
  { key: 'control', label: '控制' },
  { key: 'comm', label: '通信' },
]

function laneY(index: number): number {
  return TOP_PAD + TICK_AREA_H + index * (LANE_HEIGHT + LANE_GAP)
}

const TOTAL_HEIGHT = TOP_PAD + TICK_AREA_H + LANES.length * (LANE_HEIGHT + LANE_GAP) - LANE_GAP + 4

/* ─────────────────────────────────────────────
   8. Hover 状态
   ───────────────────────────────────────────── */

interface HoverInfo {
  x: number
  y: number
  title: string
  detail: string
  meta: string
  segmentId?: string
}

/* ─────────────────────────────────────────────
   9. 主组件
   ───────────────────────────────────────────── */

export function EventTimeline({
  data,
  onSelectSegment,
}: {
  data: HistoryPageResponse
  onSelectSegment: (segmentId: string) => void
}) {
  const events = useMemo(() => buildEvents(data), [data])
  const scale = useMemo(() => buildScale(events), [events])
  const ticks = useMemo(() => buildTicks(scale), [scale])

  const taskEvents = useMemo(
    () => events.filter((e): e is TaskRangeEvent => e.lane === 'task'),
    [events],
  )
  const alertClusters = useMemo(
    () => clusterAlerts(events.filter((e): e is AlertEvent => e.lane === 'alert'), scale),
    [events, scale],
  )
  const controlClusters = useMemo(
    () => clusterControl(events.filter((e): e is ControlEvent => e.lane === 'control'), scale),
    [events, scale],
  )
  const commClusters = useMemo(
    () => clusterComm(events.filter((e): e is CommEvent => e.lane === 'comm'), scale),
    [events, scale],
  )

  const [hover, setHover] = useState<HoverInfo | null>(null)

  const totals = {
    task: taskEvents.length,
    alert: events.filter((e) => e.lane === 'alert').length,
    control: events.filter((e) => e.lane === 'control').length,
    comm: events.filter((e) => e.lane === 'comm').length,
  }

  const handleHover = (
    e: React.MouseEvent<SVGElement>,
    info: Omit<HoverInfo, 'x' | 'y'>,
  ) => {
    const svg = (e.currentTarget.ownerSVGElement ?? e.currentTarget) as SVGSVGElement
    const rect = svg.getBoundingClientRect()
    const px = e.clientX - rect.left
    const py = e.clientY - rect.top
    /* 接近右边界时让 tooltip 向左偏移 */
    const containerWidth = rect.width
    const TOOLTIP_W = 260
    const flipLeft = px + 12 + TOOLTIP_W > containerWidth - 8
    setHover({
      x: flipLeft ? px - TOOLTIP_W - 12 : px + 12,
      y: Math.max(py - 8, 0),
      ...info,
    })
  }

  const handleLeave = () => setHover(null)
  const handleClick = (segmentId?: string) => {
    if (segmentId) onSelectSegment(segmentId)
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
      {/* Header */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-[0.2em] text-slate-500">事件时间轴</span>
          <span className="text-[10px] text-slate-600">
            {new Date(scale.tMin).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}
            <span className="px-1 text-slate-700">→</span>
            {new Date(scale.tMax).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-400">
          <LegendDot color={COLORS.task.completed} label={`任务 ${totals.task}`} shape="bar" />
          <LegendDot color={COLORS.alert.critical} label={`告警 ${totals.alert}`} />
          <LegendDot color={COLORS.control.takeover} label={`控制 ${totals.control}`} shape="tri" />
          <LegendDot color={COLORS.comm} label={`通信 ${totals.comm}`} shape="wave" />
        </div>
      </div>

      {/* SVG 主体 */}
      <div className="relative">
        <svg
          viewBox={`0 0 1000 ${TOTAL_HEIGHT}`}
          preserveAspectRatio="xMidYMid meet"
          className="block w-full"
          onMouseLeave={handleLeave}
        >
          {/* Lane 背景 + 标签 */}
          {LANES.map((lane, i) => {
            const y = laneY(i)
            return (
              <g key={lane.key}>
                <rect
                  x={VIEW_LEFT}
                  y={y}
                  width={VIEW_RIGHT - VIEW_LEFT}
                  height={LANE_HEIGHT}
                  rx={4}
                  fill={COLORS.laneBg}
                />
                <text
                  x={VIEW_LEFT - 6}
                  y={y + LANE_HEIGHT / 2}
                  textAnchor="end"
                  dominantBaseline="central"
                  fontSize="9"
                  fill={COLORS.laneLabel}
                >
                  {lane.label}
                </text>
              </g>
            )
          })}

          {/* 时间刻度 */}
          {ticks.map((tick, i) => (
            <g key={`tick-${i}`}>
              <line
                x1={tick.x}
                x2={tick.x}
                y1={TOP_PAD + TICK_AREA_H - 4}
                y2={TOTAL_HEIGHT - 4}
                stroke={tick.emphasized ? COLORS.axisStrong : COLORS.axis}
                strokeWidth={tick.emphasized ? 1 : 0.5}
              />
              <text
                x={tick.x}
                y={TOP_PAD + 10}
                textAnchor="middle"
                fontSize={tick.emphasized ? 10 : 9}
                fill={tick.emphasized ? COLORS.tickLabelStrong : COLORS.tickLabel}
                fontWeight={tick.emphasized ? 600 : 400}
              >
                {tick.label}
              </text>
            </g>
          ))}

          {/* Lane 1: 任务区间条 */}
          <g>
            {taskEvents.map((task) => {
              const x1 = scale.toX(task.t)
              const x2 = Math.max(scale.toX(task.tEnd), x1 + 1.5)
              const y = laneY(0)
              const fill = COLORS.task[task.status] ?? COLORS.task.completed
              return (
                <g
                  key={task.id}
                  className="cursor-pointer"
                  onMouseMove={(e) =>
                    handleHover(e, {
                      title: task.title,
                      detail: task.detail,
                      meta: `${formatTime(task.t)} → ${formatTime(task.tEnd)}`,
                      segmentId: task.segmentId,
                    })
                  }
                  onClick={() => handleClick(task.segmentId)}
                >
                  <rect
                    x={x1 - 1}
                    y={y}
                    width={Math.max(x2 - x1 + 2, 4)}
                    height={LANE_HEIGHT}
                    fill="transparent"
                  />
                  <rect
                    x={x1}
                    y={y + LANE_HEIGHT / 2 - 4}
                    width={x2 - x1}
                    height={8}
                    rx={2}
                    fill={fill}
                    opacity={0.85}
                  />
                  <circle cx={x1} cy={y + LANE_HEIGHT / 2} r={2.5} fill={fill} />
                  <circle cx={x2} cy={y + LANE_HEIGHT / 2} r={2.5} fill={fill} opacity={0.6} />
                </g>
              )
            })}
          </g>

          {/* Lane 2: 告警 */}
          <g>
            {alertClusters.map((c, i) => {
              const y = laneY(1) + LANE_HEIGHT / 2
              const color = COLORS.alert[c.topSeverity]
              const r = c.count === 1 ? 3 : Math.min(3 + Math.log2(c.count) * 1.4, 7)
              const showCount = c.count > 1
              const top = c.events.reduce(
                (acc, e) => (SEV_RANK[e.severity] > SEV_RANK[acc.severity] ? e : acc),
                c.events[0],
              )
              return (
                <g
                  key={`ac-${i}`}
                  className="cursor-pointer"
                  onMouseMove={(e) => {
                    if (c.count === 1) {
                      handleHover(e, {
                        title: top.title,
                        detail: top.detail,
                        meta: formatDate(top.t),
                        segmentId: top.segmentId,
                      })
                    } else {
                      const counts = c.events.reduce(
                        (acc, ev) => {
                          acc[ev.severity]++
                          return acc
                        },
                        { critical: 0, warning: 0, info: 0 },
                      )
                      const segs = Array.from(new Set(c.events.map((ev) => ev.segmentId).filter(Boolean)))
                      handleHover(e, {
                        title: `${c.count} 条告警 · ${formatDate(c.events[0].t)}`,
                        detail: `critical ${counts.critical} · warning ${counts.warning} · info ${counts.info}`,
                        meta: `涉及区段:${segs.join(', ') || '—'}`,
                        segmentId: top.segmentId,
                      })
                    }
                  }}
                  onClick={() => handleClick(top.segmentId)}
                >
                  <circle cx={c.x} cy={y} r={r + 2} fill={color} opacity={0.18} />
                  <circle cx={c.x} cy={y} r={r} fill={color} />
                  {showCount && (
                    <text
                      x={c.x}
                      y={y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={r >= 5 ? 8 : 7}
                      fontWeight="600"
                      fill="white"
                    >
                      {c.count}
                    </text>
                  )}
                </g>
              )
            })}
          </g>

          {/* Lane 3: 控制 */}
          <g>
            {controlClusters.map((c, i) => {
              const y = laneY(2) + LANE_HEIGHT / 2
              const color = c.hasTakeover ? COLORS.control.takeover : COLORS.control.pause
              const top = c.events[0]
              const isTakeover = c.hasTakeover
              return (
                <g
                  key={`cc-${i}`}
                  className="cursor-pointer"
                  onMouseMove={(e) =>
                    handleHover(e, {
                      title: c.count === 1 ? top.title : `${c.count} 次控制变更`,
                      detail: top.detail,
                      meta: formatTime(top.t),
                      segmentId: top.segmentId,
                    })
                  }
                  onClick={() => handleClick(top.segmentId)}
                >
                  <rect x={c.x - 6} y={y - 6} width={12} height={12} fill="transparent" />
                  {isTakeover ? (
                    <polygon
                      points={`${c.x},${y - 4} ${c.x + 4},${y + 3} ${c.x - 4},${y + 3}`}
                      fill={color}
                    />
                  ) : (
                    <rect x={c.x - 3} y={y - 3} width={6} height={6} rx={1} fill={color} />
                  )}
                  {c.count > 1 && (
                    <text x={c.x + 6} y={y - 4} fontSize="7" fontWeight="600" fill={color}>
                      ×{c.count}
                    </text>
                  )}
                </g>
              )
            })}
          </g>

          {/* Lane 4: 通信 */}
          <g>
            {commClusters.map((c, i) => {
              const y = laneY(3) + LANE_HEIGHT / 2
              const top = c.events[0]
              return (
                <g
                  key={`mc-${i}`}
                  className="cursor-pointer"
                  onMouseMove={(e) =>
                    handleHover(e, {
                      title: c.count === 1 ? top.title : `${c.count} 次通信波动`,
                      detail: top.detail,
                      meta: formatTime(top.t),
                      segmentId: top.segmentId,
                    })
                  }
                  onClick={() => handleClick(top.segmentId)}
                >
                  <rect x={c.x - 6} y={y - 6} width={12} height={12} fill="transparent" />
                  <path
                    d={`M ${c.x - 4} ${y} q 1 -3 2 0 t 2 0 t 2 0`}
                    fill="none"
                    stroke={COLORS.comm}
                    strokeWidth={1.4}
                    strokeLinecap="round"
                  />
                  {c.count > 1 && (
                    <text x={c.x + 6} y={y - 4} fontSize="7" fontWeight="600" fill={COLORS.comm}>
                      ×{c.count}
                    </text>
                  )}
                </g>
              )
            })}
          </g>

          {/* 空数据提示 */}
          {events.length === 0 && (
            <text
              x={500}
              y={TOTAL_HEIGHT / 2 + 4}
              textAnchor="middle"
              fontSize="11"
              fill={COLORS.tickLabel}
            >
              当前时间范围内暂无事件
            </text>
          )}
        </svg>

        {/* Tooltip */}
        {hover && (
          <div
            className="pointer-events-none absolute z-20 w-[260px] rounded-xl border border-white/10 bg-slate-950/95 px-3 py-2 shadow-xl shadow-black/40 backdrop-blur"
            style={{ left: hover.x, top: hover.y }}
          >
            <div className="text-[11px] font-medium text-white">{hover.title}</div>
            <div className="mt-0.5 text-[10px] text-slate-400">{hover.meta}</div>
            <div className="mt-1 text-[10px] leading-4 text-slate-300">{hover.detail}</div>
            {hover.segmentId && (
              <div className="mt-1.5 text-[9px] text-cyan-300">
                点击跳转到空间定位 · {hover.segmentId}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Legend
   ───────────────────────────────────────────── */

function LegendDot({
  color,
  label,
  shape = 'dot',
}: {
  color: string
  label: string
  shape?: 'dot' | 'bar' | 'tri' | 'wave'
}) {
  return (
    <span className="inline-flex items-center gap-1">
      <svg width="14" height="10" viewBox="0 0 14 10">
        {shape === 'dot' && <circle cx="7" cy="5" r="3" fill={color} />}
        {shape === 'bar' && (
          <rect x="2" y="3" width="10" height="4" rx="1" fill={color} opacity={0.85} />
        )}
        {shape === 'tri' && <polygon points="7,1 12,8 2,8" fill={color} />}
        {shape === 'wave' && (
          <path
            d="M 2 5 q 1.5 -3 3 0 t 3 0 t 3 0"
            fill="none"
            stroke={color}
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        )}
      </svg>
      <span>{label}</span>
    </span>
  )
}

/* ─────────────────────────────────────────────
   时间格式化
   ───────────────────────────────────────────── */

function formatTime(t: number): string {
  const d = new Date(t)
  return d.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDate(t: number): string {
  const d = new Date(t)
  return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
}
