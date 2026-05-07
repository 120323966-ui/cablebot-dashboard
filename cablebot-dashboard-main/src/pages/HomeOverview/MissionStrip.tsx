import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Clock3, Gauge, MapPinned, PlayCircle } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import type { ActiveTask } from '@/types/dashboard'

const statusLabel: Record<ActiveTask['status'], string> = {
  running: '进行中',
  paused: '已暂停',
  queued: '待启动',
  completed: '已完成',
}

const statusTone: Record<ActiveTask['status'], 'good' | 'warning' | 'neutral' | 'danger'> = {
  running: 'good',
  paused: 'warning',
  queued: 'neutral',
  completed: 'good',
}

const modeLabel: Record<ActiveTask['mode'], string> = {
  auto: '自动',
  'semi-auto': '半自动',
  manual: '人工接管',
}

export function MissionStrip({ task }: { task: ActiveTask | null }) {
  const navigate = useNavigate()
  const pct = task
    ? task.checksTotal > 0
      ? Math.round((task.checksCompleted / task.checksTotal) * 100)
      : task.progressPct
    : 0

  if (!task) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-5 py-3 text-sm text-slate-400">
        <CheckCircle2 className="h-4 w-4 text-slate-500" />
        当前暂无运行中的巡检任务
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-white/8 bg-white/[0.03] px-5 py-3">
      {/* Title + badges */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-white">{task.title}</span>
        <Badge tone={statusTone[task.status]}>{statusLabel[task.status]}</Badge>
        <Badge tone="neutral">{modeLabel[task.mode]}</Badge>
      </div>

      <span className="hidden h-4 w-px bg-white/10 sm:block" />

      {/* Key metrics inline */}
      <div className="flex items-center gap-4 text-sm text-slate-300">
        <span className="inline-flex items-center gap-1.5">
          <MapPinned className="h-3.5 w-3.5 text-cyan-400" />
          {task.segmentId}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Gauge className="h-3.5 w-3.5 text-cyan-400" />
          {task.checksCompleted}/{task.checksTotal} 项
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock3 className="h-3.5 w-3.5 text-cyan-400" />
          {task.status === 'completed' ? '已完成' : task.etaMinutes <= 0 ? '即将完成' : `${task.etaMinutes} 分钟`}
        </span>
      </div>

      {/* Progress bar */}
      <div className="flex min-w-[140px] flex-1 items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/6">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              task.status === 'paused'
                ? 'bg-[linear-gradient(90deg,#f59e0b,#d97706)] animate-pulse'
                : 'bg-[linear-gradient(90deg,#22d3ee,#60a5fa)]'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className={`text-sm font-semibold tabular-nums ${
          task.status === 'paused' ? 'text-amber-300' : 'text-white'
        }`}>{pct}%</span>
      </div>

      {/* CTA */}
      <button
        onClick={() => navigate('/command')}
        className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-cyan-400/10 px-3 py-1.5 text-xs font-medium text-cyan-300 transition hover:bg-cyan-400/20"
      >
        <PlayCircle className="h-3.5 w-3.5" />
        进入实时巡检
      </button>
    </div>
  )
}
