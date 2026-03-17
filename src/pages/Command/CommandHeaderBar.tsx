import { BatteryCharging, Gauge, ShieldCheck, Timer, Wifi } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import type { CommandMeta, CommandMission, CommandRobotState } from '@/types/command'

function missionTone(status: CommandMission['status']) {
  if (status === 'running') return 'good' as const
  if (status === 'paused') return 'warning' as const
  return 'danger' as const
}

function missionLabel(status: CommandMission['status']) {
  if (status === 'running') return '巡检中'
  if (status === 'paused') return '已暂停'
  return '需关注'
}

function modeLabel(mode: CommandMission['mode']) {
  if (mode === 'auto') return '自动'
  if (mode === 'manual') return '接管'
  return '半自动'
}

function Separator() {
  return <span className="mx-1 text-slate-600">·</span>
}

function Stat({
  icon,
  children,
}: {
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] text-slate-300">
      {icon}
      {children}
    </span>
  )
}

export function CommandHeaderBar({
  meta,
  mission,
  robot,
}: {
  meta: CommandMeta
  mission: CommandMission
  robot: CommandRobotState
}) {
  return (
    <section className="flex shrink-0 items-center gap-3 rounded-2xl border border-white/8 bg-slate-950/50 px-4 py-2.5 backdrop-blur-xl">
      {/* Left: mission status */}
      <div className="flex items-center gap-2">
        <Badge tone={missionTone(mission.status)}>
          {missionLabel(mission.status)}
        </Badge>
        <Badge tone="neutral">{modeLabel(mission.mode)}</Badge>
      </div>

      {/* Divider */}
      <div className="h-5 w-px bg-white/10" />

      {/* Center: key stats in a single line */}
      <div className="flex flex-1 flex-wrap items-center gap-x-1 gap-y-1">
        <Stat>区段 <span className="font-medium text-white">{mission.segmentId}</span></Stat>
        <Separator />
        <Stat>{mission.tunnelSection}</Stat>
        <Separator />
        <Stat>操作员 <span className="font-medium text-white">{meta.operatorName}</span></Stat>
        <Separator />
        <Stat icon={<Timer className="h-3.5 w-3.5 text-cyan-300" />}>
          <span className="font-medium text-white">{mission.elapsedMinutes}</span>min
          {mission.etaMinutes > 0 && (
            <span className="text-slate-500 ml-0.5">/ 剩{mission.etaMinutes}min</span>
          )}
        </Stat>
        <Separator />
        <Stat icon={<Gauge className="h-3.5 w-3.5 text-cyan-300" />}>
          <span className="font-medium text-white">{mission.progressPct}%</span>
          <span className="text-slate-500 ml-0.5">
            ({mission.checklistDone}/{mission.checklistTotal})
          </span>
        </Stat>
        <Separator />
        <Stat icon={<BatteryCharging className="h-3.5 w-3.5 text-cyan-300" />}>
          <span className="font-medium text-white">{Math.round(robot.batteryPct)}%</span>
        </Stat>
      </div>

      {/* Right: network & safety */}
      <div className="flex items-center gap-2">
        <Badge tone={meta.network.status === 'ok' ? 'good' : 'warning'}>
          <Wifi className="mr-1 h-3 w-3" />
          {meta.network.latencyMs}ms
        </Badge>
        <Badge tone="good">
          <ShieldCheck className="mr-1 h-3 w-3" />
          安全
        </Badge>
      </div>
    </section>
  )
}
