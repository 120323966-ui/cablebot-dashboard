import {
  Activity,
  CalendarClock,
  Clock3,
  Gauge,
  MapPinned,
  PlayCircle,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import type { ActiveTask, MetaInfo } from '@/types/dashboard'

const taskStatusLabel: Record<ActiveTask['status'], string> = {
  running: '进行中',
  paused: '已暂停',
  queued: '待启动',
  completed: '已完成',
}

const taskStatusTone: Record<ActiveTask['status'], 'neutral' | 'good' | 'warning' | 'danger'> = {
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

function getDisplayProgress(task: ActiveTask) {
  if (task.checksTotal > 0) {
    return Math.round((task.checksCompleted / task.checksTotal) * 100)
  }

  return Math.max(0, Math.min(100, task.progressPct))
}

function formatTaskEta(task: ActiveTask) {
  if (task.status === 'completed') return '已完成'
  if (task.etaMinutes <= 0) return '即将完成'
  return `${task.etaMinutes} 分钟`
}

export function TaskHero({ task, meta }: { task: ActiveTask | null; meta: MetaInfo }) {
  const displayProgress = task ? getDisplayProgress(task) : 0

  return (
    <Card className="hero-card overflow-hidden" eyebrow="Mission Center" title="当前巡检态势">
      <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-cyan-400/8 blur-3xl" />
      <div className="pointer-events-none absolute right-16 top-2 h-56 w-56 rounded-full bg-sky-500/6 blur-[100px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_10%,rgba(56,189,248,0.08),transparent_24%),radial-gradient(circle_at_72%_18%,rgba(37,99,235,0.06),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_30%)]" />

      <div className="relative grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="good">网络 {meta.network.status === 'ok' ? '稳定' : '波动'}</Badge>
            <Badge tone="warning">{meta.weatherNote}</Badge>
          </div>

          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">
            {task?.title ?? '当前暂无运行任务'}
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
            首页强调“态势感知 + 快速决策”。值班员需要在一屏内快速看到任务进度、风险区段、关键告警与多模态入口。
          </p>

          {task ? (
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="hero-chip">
                <Activity className="h-4 w-4 text-cyan-300" />
                任务状态：{taskStatusLabel[task.status]}
              </div>
              <div className="hero-chip">
                <MapPinned className="h-4 w-4 text-cyan-300" />
                当前区段：{task.segmentId}
              </div>
              <div className="hero-chip">
                <Clock3 className="h-4 w-4 text-cyan-300" />
                预计完成：{formatTaskEta(task)}
              </div>
            </div>
          ) : null}

          <div className="mt-7 flex flex-wrap gap-3">
            <Button>
              <PlayCircle className="mr-2 h-4 w-4" />
              进入实时巡检页
            </Button>
            <Button variant="ghost">查看区段拓扑</Button>
          </div>
        </div>

        {task ? (
          <div className="rounded-[28px] border border-white/8 bg-slate-950/45 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/6 pb-4">
              <div>
                <div className="panel-eyebrow">任务执行状态</div>
                <div className="mt-1 text-sm text-slate-400">当前区段任务闭环与值班责任信息</div>
              </div>

              <div className="flex items-center gap-2">
                <Badge tone="neutral">{modeLabel[task.mode]}</Badge>
                <Badge tone={taskStatusTone[task.status]}>{taskStatusLabel[task.status]}</Badge>
              </div>
            </div>

            <div className="mt-5 flex items-end justify-between gap-4">
              <div>
                <div className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                  {displayProgress}%
                </div>
                <div className="mt-2 text-sm text-slate-300">
                  已完成 <span className="font-semibold text-white">{task.checksCompleted}</span> / {task.checksTotal}{' '}
                  项关键检查
                </div>
              </div>

              <div className="hidden rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2 text-right sm:block">
                <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">当前区段</div>
                <div className="mt-1 text-base font-medium text-white">{task.segmentId}</div>
              </div>
            </div>

            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
                <span>检查完成度</span>
                <span>
                  {task.checksCompleted}/{task.checksTotal}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-white/6">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#22d3ee,#60a5fa)] transition-[width] duration-500"
                  style={{ width: `${displayProgress}%` }}
                />
              </div>
            </div>

            <div className="mt-6 grid gap-x-4 gap-y-4 border-t border-white/6 pt-5 sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <div className="rounded-xl border border-white/8 bg-white/[0.03] p-2 text-cyan-300">
                  <CalendarClock className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">更新时间</div>
                  <div className="mt-1 text-sm text-white">{new Date(meta.updatedAt).toLocaleString('zh-CN')}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="rounded-xl border border-white/8 bg-white/[0.03] p-2 text-cyan-300">
                  <UserRound className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">值班员</div>
                  <div className="mt-1 text-sm text-white">{meta.operatorName}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="rounded-xl border border-white/8 bg-white/[0.03] p-2 text-cyan-300">
                  <Clock3 className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">预计完成</div>
                  <div className="mt-1 text-sm text-white">{formatTaskEta(task)}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="rounded-xl border border-white/8 bg-white/[0.03] p-2 text-cyan-300">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">执行模式</div>
                  <div className="mt-1 flex items-center gap-2 text-sm text-white">
                    <Gauge className="h-4 w-4 text-slate-400" />
                    {modeLabel[task.mode]}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  )
}