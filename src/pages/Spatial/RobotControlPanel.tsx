import { useState } from 'react'
import {
  Battery,
  Bot,
  Gauge,
  MapPin,
  Navigation,
  Pause,
  Play,
  Search,
  Send,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import type { PipeSegment, RobotOnMap } from '@/types/spatial'

/* ───────── helpers ───────── */

function statusLabel(s: RobotOnMap['status']) {
  if (s === 'inspecting') return '巡检中'
  if (s === 'moving') return '移动中'
  if (s === 'emergency') return '已急停'
  return '已停止'
}

function statusTone(s: RobotOnMap['status']) {
  if (s === 'inspecting') return 'good' as const
  if (s === 'moving') return 'neutral' as const
  if (s === 'emergency') return 'danger' as const
  return 'warning' as const
}

function batteryColor(pct: number) {
  if (pct > 50) return 'text-emerald-400'
  if (pct > 25) return 'text-amber-400'
  return 'text-rose-400'
}

/* ───────── Component ───────── */

export function RobotControlPanel({
  robot,
  segments,
  onStatusChange,
  onMoveToSegment,
  onSpeedChange,
}: {
  robot: RobotOnMap
  segments: PipeSegment[]
  onStatusChange: (robotId: string, status: RobotOnMap['status']) => void
  onMoveToSegment: (robotId: string, segmentId: string) => void
  onSpeedChange: (robotId: string, speed: number) => void
}) {
  const [targetSegment, setTargetSegment] = useState(robot.segmentId)
  const currentSeg = segments.find((s) => s.id === robot.segmentId)

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* ═══ Header ═══ */}
      <div className="shrink-0 border-b border-white/6 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10">
            <Bot className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <div className="text-lg font-semibold text-white">{robot.name}</div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>{robot.id}</span>
              <Badge tone={statusTone(robot.status)}>{statusLabel(robot.status)}</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Status overview ═══ */}
      <div className="shrink-0 border-b border-white/6 p-5">
        <div className="mb-3 text-[11px] uppercase tracking-[0.2em] text-slate-500">
          实时状态
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <Battery className="h-3 w-3" /> 电量
            </div>
            <div className={`mt-1 text-xl font-semibold ${batteryColor(robot.batteryPct)}`}>
              {robot.batteryPct.toFixed(0)}%
            </div>
          </div>
          <div className="rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <Gauge className="h-3 w-3" /> 速度
            </div>
            <div className="mt-1 text-xl font-semibold text-white">
              {robot.speedKmh} km/h
            </div>
          </div>
          <div className="rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <MapPin className="h-3 w-3" /> 当前区段
            </div>
            <div className="mt-1 text-xl font-semibold text-white">
              {robot.segmentId}
            </div>
          </div>
          <div className="rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <Navigation className="h-3 w-3" /> 区段进度
            </div>
            <div className="mt-1 text-xl font-semibold text-white">
              {(robot.progress * 100).toFixed(0)}%
            </div>
          </div>
        </div>
        {currentSeg && (
          <div className="mt-3 text-xs text-slate-500">
            区段环境：{currentSeg.temperatureC}°C · {currentSeg.humidityPct}% 湿度 · 风险 {(currentSeg.riskLevel * 100).toFixed(0)}
          </div>
        )}
      </div>

      {/* ═══ Work status control ═══ */}
      <div className="shrink-0 border-b border-white/6 p-5">
        <div className="mb-3 text-[11px] uppercase tracking-[0.2em] text-slate-500">
          工作状态
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onStatusChange(robot.id, 'inspecting')}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-medium transition ${
              robot.status === 'inspecting'
                ? 'border-emerald-400/30 bg-emerald-400/12 text-emerald-300'
                : 'border-white/8 bg-white/[0.03] text-slate-400 hover:border-white/15 hover:text-white'
            }`}
          >
            <Search className="h-3.5 w-3.5" />
            巡检
          </button>
          <button
            onClick={() => onStatusChange(robot.id, 'moving')}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-medium transition ${
              robot.status === 'moving'
                ? 'border-cyan-400/30 bg-cyan-400/12 text-cyan-300'
                : 'border-white/8 bg-white/[0.03] text-slate-400 hover:border-white/15 hover:text-white'
            }`}
          >
            <Play className="h-3.5 w-3.5" />
            移动
          </button>
          <button
            onClick={() => onStatusChange(robot.id, 'idle')}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-medium transition ${
              robot.status === 'idle'
                ? 'border-amber-400/30 bg-amber-400/12 text-amber-300'
                : 'border-white/8 bg-white/[0.03] text-slate-400 hover:border-white/15 hover:text-white'
            }`}
          >
            <Pause className="h-3.5 w-3.5" />
            停止
          </button>
        </div>
      </div>

      {/* ═══ Dispatch to segment ═══ */}
      <div className="shrink-0 border-b border-white/6 p-5">
        <div className="mb-3 text-[11px] uppercase tracking-[0.2em] text-slate-500">
          调度至区段
        </div>
        <div className="flex gap-2">
          <select
            value={targetSegment}
            onChange={(e) => setTargetSegment(e.target.value)}
            className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white focus:border-cyan-400/30 focus:outline-none"
          >
            {segments.map((s) => (
              <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                {s.id} — {s.temperatureC}°C · 风险{(s.riskLevel * 100).toFixed(0)}
              </option>
            ))}
          </select>
          <Button
            variant="primary"
            className="shrink-0 gap-1.5 text-xs"
            onClick={() => onMoveToSegment(robot.id, targetSegment)}
            disabled={targetSegment === robot.segmentId}
          >
            <Send className="h-3.5 w-3.5" />
            派遣
          </Button>
        </div>
        {targetSegment === robot.segmentId && (
          <div className="mt-2 text-[10px] text-slate-600">机器人已在该区段</div>
        )}
      </div>

      {/* ═══ Speed control ═══ */}
      <div className="shrink-0 p-5">
        <div className="mb-3 text-[11px] uppercase tracking-[0.2em] text-slate-500">
          速度调节
        </div>
        <div className="flex gap-2">
          {[
            { label: '慢速', speed: 0.5 },
            { label: '标准', speed: 1.2 },
            { label: '快速', speed: 2.0 },
          ].map((opt) => {
            const isActive = Math.abs(robot.speedKmh - opt.speed) < 0.2
            return (
              <button
                key={opt.label}
                onClick={() => onSpeedChange(robot.id, opt.speed)}
                disabled={robot.status === 'idle'}
                className={`flex-1 rounded-xl border px-3 py-2 text-xs font-medium transition ${
                  isActive
                    ? 'border-cyan-400/30 bg-cyan-400/12 text-cyan-300'
                    : 'border-white/8 bg-white/[0.03] text-slate-400 hover:border-white/15 hover:text-white disabled:opacity-40 disabled:hover:border-white/8 disabled:hover:text-slate-400'
                }`}
              >
                {opt.label}
                <div className="mt-0.5 text-[9px] opacity-60">{opt.speed} km/h</div>
              </button>
            )
          })}
        </div>
        {robot.status === 'idle' && (
          <div className="mt-2 text-[10px] text-slate-600">请先启动机器人再调节速度</div>
        )}
      </div>
    </div>
  )
}
