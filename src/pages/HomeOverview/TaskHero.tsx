import { Activity, Clock3, MapPinned, PlayCircle } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import type { ActiveTask, MetaInfo } from '@/types/dashboard'

export function TaskHero({ task, meta }: { task: ActiveTask | null; meta: MetaInfo }) {
  return (
    <Card className="hero-card overflow-hidden" eyebrow="Mission Center" title="当前巡检态势">
      <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.22),transparent_45%)]" />
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
                任务状态：运行中
              </div>
              <div className="hero-chip">
                <MapPinned className="h-4 w-4 text-cyan-300" />
                当前区段：{task.segmentId}
              </div>
              <div className="hero-chip">
                <Clock3 className="h-4 w-4 text-cyan-300" />
                预计完成：{task.etaMinutes} 分钟
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
            <div className="panel-eyebrow">任务进度</div>
            <div className="mt-3 flex items-end justify-between gap-4">
              <div>
                <div className="text-5xl font-semibold tracking-tight text-white">{task.progressPct}%</div>
                <div className="mt-2 text-sm text-slate-400">
                  已完成 {task.checksCompleted}/{task.checksTotal} 项关键检查
                </div>
              </div>
              <Badge tone="neutral">{task.mode}</Badge>
            </div>
            <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/6">
              <div className="h-full rounded-full bg-[linear-gradient(90deg,#22d3ee,#60a5fa)]" style={{ width: `${task.progressPct}%` }} />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">更新时间</div>
                <div className="mt-2 text-sm text-white">{new Date(meta.updatedAt).toLocaleString('zh-CN')}</div>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">值班员</div>
                <div className="mt-2 text-sm text-white">{meta.operatorName}</div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  )
}
