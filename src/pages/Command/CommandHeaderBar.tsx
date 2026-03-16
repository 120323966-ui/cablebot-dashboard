import { BatteryCharging, Gauge, ShieldCheck, Timer, Wifi } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import type { CommandMeta, CommandMission, CommandRobotState } from '@/types/command'

function missionTone(status: CommandMission['status']) {
  if (status === 'running') return 'good' as const
  if (status === 'paused') return 'warning' as const
  return 'danger' as const
}

function missionLabel(status: CommandMission['status']) {
  if (status === 'running') return '巡检进行中'
  if (status === 'paused') return '任务已暂停'
  return '需重点关注'
}

function modeLabel(mode: CommandMission['mode']) {
  if (mode === 'auto') return '自动'
  if (mode === 'manual') return '人工接管'
  return '半自动'
}

function networkTone(status: CommandMeta['network']['status']) {
  return status === 'ok' ? 'good' : 'warning'
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
    <section className="shrink-0 rounded-[24px] border border-white/8 bg-slate-950/38 px-4 py-3 shadow-2xl shadow-cyan-950/10 backdrop-blur-xl">
      <div className="flex min-h-[72px] flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="panel-eyebrow">Live Inspection</div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h2 className="text-[28px] font-semibold tracking-tight text-white">
              实时巡检指挥页
            </h2>
            <Badge tone={missionTone(mission.status)}>{missionLabel(mission.status)}</Badge>
            <Badge tone="neutral">{modeLabel(mission.mode)}</Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral">{mission.segmentId}</Badge>
          <Badge tone={networkTone(meta.network.status)}>
            <Wifi className="mr-1 h-3.5 w-3.5" />
            链路 {meta.network.latencyMs}ms
          </Badge>
          <Badge tone="good">
            <ShieldCheck className="mr-1 h-3.5 w-3.5" />
            安全策略启用
          </Badge>
        </div>
      </div>

      <div className="mt-3 grid gap-2 xl:grid-cols-[1.2fr_1.15fr_0.95fr_0.95fr_1.1fr_1.25fr]">
        <div className="rounded-[18px] border border-white/8 bg-white/[0.03] px-3 py-2.5">
          <div className="text-[10px] uppercase tracking-[0.24em] text-slate-500">当前区段</div>
          <div className="mt-1 text-sm font-semibold text-white">{mission.segmentId}</div>
          <div className="mt-0.5 truncate text-[11px] text-slate-400">{mission.tunnelSection}</div>
        </div>

        <div className="rounded-[18px] border border-white/8 bg-white/[0.03] px-3 py-2.5">
          <div className="text-[10px] uppercase tracking-[0.24em] text-slate-500">当前操作员</div>
          <div className="mt-1 text-sm font-semibold text-white">{meta.operatorName}</div>
          <div className="mt-0.5 text-[11px] text-slate-400">{meta.shift}</div>
        </div>

        <div className="rounded-[18px] border border-white/8 bg-white/[0.03] px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.24em] text-slate-500">
            <Timer className="h-3 w-3 text-cyan-300" />
            时长
          </div>
          <div className="mt-1 text-sm font-semibold text-white">{mission.elapsedMinutes} min</div>
          <div className="mt-0.5 text-[11px] text-slate-400">剩余 {mission.etaMinutes} min</div>
        </div>

        <div className="rounded-[18px] border border-white/8 bg-white/[0.03] px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.24em] text-slate-500">
            <Gauge className="h-3 w-3 text-cyan-300" />
            完成度
          </div>
          <div className="mt-1 text-sm font-semibold text-white">{mission.progressPct}%</div>
          <div className="mt-0.5 text-[11px] text-slate-400">
            {mission.checklistDone}/{mission.checklistTotal} 项
          </div>
        </div>

        <div className="rounded-[18px] border border-white/8 bg-white/[0.03] px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.24em] text-slate-500">
            <BatteryCharging className="h-3 w-3 text-cyan-300" />
            机器人状态
          </div>
          <div className="mt-1 text-sm font-semibold text-white">
            电量 {Math.round(robot.batteryPct)}%
          </div>
          <div className="mt-0.5 text-[11px] text-slate-400">{robot.location}</div>
        </div>

        <div className="rounded-[18px] border border-white/8 bg-white/[0.03] px-3 py-2.5">
          <div className="text-[10px] uppercase tracking-[0.24em] text-slate-500">最后刷新</div>
          <div className="mt-1 text-sm font-semibold text-white">
            {new Date(meta.updatedAt).toLocaleTimeString('zh-CN')}
          </div>
          <div className="mt-0.5 truncate text-[11px] text-slate-400">{meta.weatherNote}</div>
        </div>
      </div>
    </section>
  )
}