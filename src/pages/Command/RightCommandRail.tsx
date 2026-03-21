import { useState } from 'react'
import {
  BatteryCharging,
  ChevronDown,
  Compass,
  Radio,
  Route,
  Thermometer,
  Triangle,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import type {
  AuxView,
  CommandEvent,
  CommandMission,
  CommandRobotState,
  SensorMetric,
  SensorStatus,
} from '@/types/command'

/* ── Helpers ─────────────────────────────────────────── */

function sensorTone(status: SensorStatus) {
  if (status === 'danger') return 'danger' as const
  if (status === 'watch') return 'warning' as const
  return 'good' as const
}

function trendArrow(trend: SensorMetric['trend']) {
  if (trend === 'up') return '↑'
  if (trend === 'down') return '↓'
  return '→'
}

function eventTone(severity: CommandEvent['severity']) {
  if (severity === 'critical') return 'danger' as const
  if (severity === 'warning') return 'warning' as const
  return 'neutral' as const
}

function viewTone(status: AuxView['status']) {
  if (status === 'live') return 'danger' as const
  if (status === 'queued') return 'warning' as const
  return 'neutral' as const
}

function networkLabel(quality: CommandRobotState['networkQuality']) {
  if (quality === 'excellent') return '优秀'
  if (quality === 'good') return '良好'
  return '波动'
}

function networkTone(quality: CommandRobotState['networkQuality']) {
  if (quality === 'excellent') return 'good' as const
  if (quality === 'good') return 'neutral' as const
  return 'warning' as const
}

/* ── Collapsible panel wrapper ───────────────────────── */

function Panel({
  title,
  badge,
  defaultOpen = true,
  children,
}: {
  title: string
  badge?: React.ReactNode
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-white/6 last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left transition hover:bg-white/[0.03]"
      >
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-medium text-slate-300">{title}</span>
          {badge}
        </div>
        <ChevronDown
          className={`h-3.5 w-3.5 text-slate-500 transition-transform ${open ? 'rotate-0' : '-rotate-90'}`}
        />
      </button>
      {open && <div className="px-3.5 pb-3">{children}</div>}
    </div>
  )
}

/* ── Quick stat in a mini grid ───────────────────────── */

function MiniStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-lg border border-white/6 bg-white/[0.02] px-2.5 py-2">
      <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-[15px] font-semibold leading-none text-white">{value}</div>
    </div>
  )
}

/* ── Segment Mini-Map ──────────────────────────────── */

const SEGMENT_ENDPOINTS: Record<string, [string, string]> = {
  A1: ['A区入口', '检查井 AB-1'],
  A2: ['检查井 AB-1', 'A2出口'],
  B1: ['B区入口', '检查井 B-12'],
  B2: ['检查井 B-12', '检查井 B-23'],
  B3: ['检查井 B-23', 'B3出口'],
  C1: ['C区入口', '检查井 C-12'],
  C2: ['检查井 C-12', '检查井 C-23'],
  C3: ['检查井 C-23', 'C3出口'],
}

function SegmentMiniMap({
  segmentId,
  progressPct,
  events,
}: {
  segmentId: string
  progressPct: number
  events: CommandEvent[]
}) {
  const [start, end] = SEGMENT_ENDPOINTS[segmentId] ?? ['起点', '终点']
  const robotX = 30 + (progressPct / 100) * 190  // map 0-100% → 30-220 in viewBox

  // Place event markers evenly along the pipe based on severity
  const markers = events
    .filter((e) => e.severity !== 'info')
    .slice(0, 4)
    .map((e, i, arr) => ({
      id: e.id,
      x: 30 + ((i + 1) / (arr.length + 1)) * 190,
      severity: e.severity,
      label: e.title,
    }))

  return (
    <div>
      <svg viewBox="0 0 250 56" className="w-full" style={{ height: 56 }}>
        {/* Pipe background */}
        <line x1="30" y1="24" x2="220" y2="24" stroke="rgba(148,163,184,0.2)" strokeWidth="4" strokeLinecap="round" />

        {/* Pipe progress (completed portion) */}
        <line x1="30" y1="24" x2={robotX} y2="24" stroke="rgba(34,211,238,0.35)" strokeWidth="4" strokeLinecap="round" />

        {/* Endpoint markers */}
        <circle cx="30" cy="24" r="3" fill="rgba(148,163,184,0.4)" />
        <circle cx="220" cy="24" r="3" fill="rgba(148,163,184,0.4)" />

        {/* Alert markers */}
        {markers.map((m) => (
          <g key={m.id}>
            <line x1={m.x} y1="16" x2={m.x} y2="32" stroke={m.severity === 'critical' ? 'rgba(244,63,94,0.7)' : 'rgba(245,158,11,0.6)'} strokeWidth="1.5" />
            <circle cx={m.x} cy="24" r="3.5"
              fill={m.severity === 'critical' ? 'rgba(244,63,94,0.9)' : 'rgba(245,158,11,0.8)'}
            />
          </g>
        ))}

        {/* Robot dot */}
        <circle cx={robotX} cy="24" r="5" fill="#22d3ee" />
        <circle cx={robotX} cy="24" r="2.5" fill="white" />

        {/* Labels */}
        <text x="30" y="46" textAnchor="start" fill="#64748b" fontSize="8" fontFamily="sans-serif">{start}</text>
        <text x="220" y="46" textAnchor="end" fill="#64748b" fontSize="8" fontFamily="sans-serif">{end}</text>

        {/* Segment label at top */}
        <text x="125" y="10" textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="600" fontFamily="sans-serif">{segmentId}</text>
      </svg>

      {/* Legend */}
      <div className="mt-1 flex items-center justify-center gap-3 text-[10px] text-slate-500">
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
          机器人
        </span>
        {markers.length > 0 && (
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
            故障点
          </span>
        )}
      </div>
    </div>
  )
}

/* ── Main component ──────────────────────────────────── */

export function RightCommandRail({
  robot,
  mission,
  sensors,
  auxViews,
  events,
  activeAux,
  onToggleAux,
}: {
  robot: CommandRobotState
  mission: CommandMission
  sensors: SensorMetric[]
  auxViews: AuxView[]
  events: CommandEvent[]
  activeAux: Set<string>
  onToggleAux: (id: string) => void
}) {
  const abnormalSensors = sensors.filter((s) => s.status !== 'normal')
  const recentEvents = events

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-white/8 bg-slate-950/50 backdrop-blur-xl">
      {/* Robot identity header (always visible) */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/6 px-3.5 py-3">
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold text-white">{robot.name}</div>
          <div className="mt-0.5 truncate text-[11px] text-slate-400">{robot.location}</div>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge tone={robot.onlineState === 'online' ? 'good' : 'warning'}>
            {robot.onlineState}
          </Badge>
          <Badge tone={networkTone(robot.networkQuality)}>
            {networkLabel(robot.networkQuality)}
          </Badge>
        </div>
      </div>

      {/* Scrollable panels */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* 1. Robot telemetry */}
        <Panel title="遥测数据">
          <div className="grid grid-cols-2 gap-1.5">
            <MiniStat
              icon={<BatteryCharging className="h-3 w-3 text-cyan-300" />}
              label="电量"
              value={`${Math.round(robot.batteryPct)}%`}
            />
            <MiniStat
              icon={<Route className="h-3 w-3 text-cyan-300" />}
              label="区段"
              value={mission.segmentId}
            />
            <MiniStat
              icon={<Thermometer className="h-3 w-3 text-cyan-300" />}
              label="相机温度"
              value={`${robot.cameraTempC}°C`}
            />
            <MiniStat
              icon={<Compass className="h-3 w-3 text-cyan-300" />}
              label="朝向"
              value={`${robot.headingDeg}°`}
            />
          </div>
          <div className="mt-1.5 flex items-center gap-3 rounded-lg border border-white/6 bg-white/[0.02] px-2.5 py-2 text-[12px]">
            <span className="text-slate-400">速度</span>
            <span className="font-medium text-white">{robot.speedKmh} km/h</span>
            <span className="text-slate-400 ml-auto">姿态</span>
            <span className="font-medium text-white">P{robot.pitchDeg}° R{robot.rollDeg}°</span>
          </div>
        </Panel>

        {/* 2. Sensors — show abnormal first, then collapsed normal */}
        <Panel
          title="传感器"
          badge={
            abnormalSensors.length > 0 ? (
              <Badge tone="warning">{abnormalSensors.length} 异常</Badge>
            ) : (
              <Badge tone="good">正常</Badge>
            )
          }
        >
          <div className="space-y-1.5">
            {sensors.map((sensor) => (
              <div
                key={sensor.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-white/6 bg-white/[0.02] px-2.5 py-2"
              >
                <div className="min-w-0">
                  <div className="truncate text-[12px] font-medium text-white">{sensor.label}</div>
                  <div className="mt-0.5 truncate text-[10px] text-slate-500">{sensor.hint}</div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-[13px] font-semibold text-white">
                    {sensor.value}
                    <span className="ml-0.5 text-[10px] font-normal text-slate-400">{sensor.unit}</span>
                  </span>
                  <span className="text-[11px] text-slate-400">{trendArrow(sensor)}</span>
                  <Badge tone={sensorTone(sensor.status)}>
                    {sensor.status === 'normal' ? 'ok' : sensor.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {/* 3. Segment mini-map */}
        <Panel title="区段定位" defaultOpen={true}>
          <SegmentMiniMap
            segmentId={mission.segmentId}
            progressPct={mission.progressPct}
            events={events}
          />
        </Panel>

        {/* 4. Aux camera views — toggle buttons */}
        <Panel title="辅助画面" defaultOpen={true}>
          <div className="space-y-1.5">
            {auxViews.map((view) => {
              const isActive = activeAux.has(view.id)
              return (
                <button
                  key={view.id}
                  onClick={() => onToggleAux(view.id)}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left transition ${
                    isActive
                      ? 'border-cyan-400/30 bg-cyan-400/10'
                      : 'border-white/6 bg-white/[0.02] hover:border-white/12 hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="truncate text-[12px] font-medium text-white">{view.title}</div>
                    <div className="mt-0.5 truncate text-[10px] text-slate-400">{view.subtitle}</div>
                  </div>
                  <Badge tone={isActive ? 'good' : 'neutral'}>
                    {isActive ? '开启' : '关闭'}
                  </Badge>
                </button>
              )
            })}
          </div>
        </Panel>

        {/* 5. Event stream */}
        <Panel
          title="事件"
          badge={<Badge tone="neutral">{events.length}</Badge>}
        >
          <div className="space-y-1.5">
            {recentEvents.map((event) => (
              <div
                key={event.id}
                className="rounded-lg border border-white/6 bg-white/[0.02] px-2.5 py-2"
              >
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-[12px] font-medium text-white">{event.title}</span>
                  <Badge tone={eventTone(event.severity)}>{event.severity}</Badge>
                </div>
                <div className="mt-1 line-clamp-1 text-[10px] leading-4 text-slate-400">
                  {event.detail}
                </div>
                <div className="mt-1 text-[10px] text-slate-500">
                  {event.segmentId} · {new Date(event.occurredAt).toLocaleTimeString('zh-CN')}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  )
}
