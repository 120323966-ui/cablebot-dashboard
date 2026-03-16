import {
  BatteryCharging,
  Compass,
  Radio,
  Route,
  Thermometer,
  Triangle,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import type {
  CommandMission,
  CommandRobotState,
  SensorMetric,
  SensorStatus,
} from '@/types/command'

function onlineTone(state: CommandRobotState['onlineState']) {
  return state === 'online' ? 'good' : 'warning'
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

function sensorTone(status: SensorStatus) {
  if (status === 'danger') return 'danger' as const
  if (status === 'watch') return 'warning' as const
  return 'good' as const
}

function sensorLabel(status: SensorStatus) {
  if (status === 'danger') return 'danger'
  if (status === 'watch') return 'watch'
  return 'normal'
}

function trendSymbol(sensor: SensorMetric) {
  if (sensor.trend === 'up') return '↑'
  if (sensor.trend === 'down') return '↓'
  return '→'
}

function modeLabel(mode: CommandMission['mode']) {
  if (mode === 'auto') return '自动'
  if (mode === 'manual') return '接管'
  return '半自动'
}

function QuickStat({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="rounded-[14px] border border-white/8 bg-white/[0.03] px-3 py-2.5">
      <div className="flex items-center gap-2 text-[11px] text-slate-400">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-1.5 text-[22px] font-semibold leading-none tracking-tight text-white">
        {value}
      </div>
      {sub ? <div className="mt-1 text-[11px] text-slate-500">{sub}</div> : null}
    </div>
  )
}

export function LeftStatusRail({
  mission,
  robot,
  sensors,
}: {
  mission: CommandMission
  robot: CommandRobotState
  sensors: SensorMetric[]
}) {
  return (
    <Card className="h-full min-h-0 flex flex-col" eyebrow="Telemetry" title="机器人状态">
      <div className="min-h-0 flex flex-1 flex-col">
        <div className="shrink-0 rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-[16px] font-semibold tracking-tight text-white">
                {robot.name}
              </div>
              <div className="mt-1 truncate text-sm text-slate-400">{robot.location}</div>
            </div>

            <Badge tone={onlineTone(robot.onlineState)}>
              {robot.onlineState === 'online' ? 'online' : 'warning'}
            </Badge>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone="neutral">{mission.segmentId}</Badge>
            <Badge tone="neutral">{modeLabel(mission.mode)}</Badge>
            <Badge tone={networkTone(robot.networkQuality)}>
              链路 {networkLabel(robot.networkQuality)}
            </Badge>
          </div>
        </div>

        <div className="mt-3 grid shrink-0 grid-cols-2 gap-2">
          <QuickStat
            icon={<BatteryCharging className="h-3.5 w-3.5 text-cyan-300" />}
            label="电量"
            value={`${Math.round(robot.batteryPct)}%`}
          />
          <QuickStat
            icon={<Route className="h-3.5 w-3.5 text-cyan-300" />}
            label="区段"
            value={mission.segmentId}
            sub={`${mission.checklistDone}/${mission.checklistTotal} 项`}
          />
          <QuickStat
            icon={<Thermometer className="h-3.5 w-3.5 text-cyan-300" />}
            label="相机温度"
            value={`${robot.cameraTempC}°C`}
          />
          <QuickStat
            icon={<Compass className="h-3.5 w-3.5 text-cyan-300" />}
            label="朝向"
            value={`${robot.headingDeg}°`}
          />
        </div>

        <div className="mt-3 mb-4 grid shrink-0 grid-cols-2 gap-2">
          <div className="rounded-[14px] border border-white/8 bg-white/[0.03] px-3 py-2.5">
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">速度</div>
            <div className="mt-1.5 text-[22px] font-semibold leading-none tracking-tight text-white">
              {robot.speedKmh}
            </div>
            <div className="mt-1 text-[11px] text-slate-500">km/h</div>
          </div>

          <div className="rounded-[14px] border border-white/8 bg-white/[0.03] px-3 py-2.5">
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">姿态</div>
            <div className="mt-1.5 text-sm font-semibold text-white">
              P {robot.pitchDeg}° / R {robot.rollDeg}°
            </div>
          </div>
        </div>

        <div className="mb-2 shrink-0 border-t border-white/8 pt-3">
          <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
            Critical Sensors
          </div>
          <div className="mt-1 text-sm text-slate-300">关键传感器联动</div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1 pb-2">
          <div className="space-y-2">
            {sensors.map((sensor) => (
              <div
                key={sensor.id}
                className="rounded-[14px] border border-white/8 bg-white/[0.03] px-3 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white">{sensor.label}</div>
                    <div className="mt-1 truncate text-[11px] text-slate-400">{sensor.hint}</div>
                  </div>

                  <Badge tone={sensorTone(sensor.status)}>{sensorLabel(sensor.status)}</Badge>
                </div>

                <div className="mt-2 flex items-end justify-between gap-3">
                  <div className="text-lg font-semibold tracking-tight text-white">
                    {sensor.value}
                    <span className="ml-1 text-sm text-slate-400">{sensor.unit}</span>
                  </div>

                  <div className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-xs text-slate-300">
                    <Triangle className="h-3 w-3 fill-current stroke-none text-cyan-300" />
                    {trendSymbol(sensor)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  )
}