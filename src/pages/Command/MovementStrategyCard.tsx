import { AlertTriangle, Check, Eye, Gauge, Pause, X } from 'lucide-react'
import type { MovementStrategySuggestion } from '@/types/command'

function actionMeta(action: MovementStrategySuggestion['action']) {
  switch (action) {
    case 'stop':
      return {
        icon: <Pause className="h-4 w-4" />,
        tone: 'border-rose-400/25 bg-rose-500/10 text-rose-100',
        label: '停止',
      }
    case 'slow':
      return {
        icon: <Gauge className="h-4 w-4" />,
        tone: 'border-amber-400/25 bg-amber-400/10 text-amber-100',
        label: '减速',
      }
    case 'takeover':
      return {
        icon: <AlertTriangle className="h-4 w-4" />,
        tone: 'border-rose-400/25 bg-rose-500/10 text-rose-100',
        label: '接管',
      }
    case 'continue':
      return {
        icon: <Check className="h-4 w-4" />,
        tone: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100',
        label: '继续',
      }
  }
}

export function MovementStrategyCard({
  strategy,
  onConfirm,
  onDismiss,
  onViewAlerts,
}: {
  strategy: MovementStrategySuggestion
  onConfirm: (strategy: MovementStrategySuggestion) => void
  onDismiss: (strategy: MovementStrategySuggestion) => void
  onViewAlerts: (strategy: MovementStrategySuggestion) => void
}) {
  const meta = actionMeta(strategy.action)

  return (
    <div className="absolute inset-x-0 bottom-0 z-20 rounded-b-2xl border-t border-white/10 bg-slate-950/88 px-3 py-2.5 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${meta.tone}`}>
          {meta.icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-white">{strategy.title}</span>
            <span className="rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-slate-400">
              {meta.label}
            </span>
            {strategy.sourceAlertIds.length > 0 && (
              <span className="truncate text-[10px] text-slate-500">
                来源 {strategy.sourceAlertIds.join('、')}
              </span>
            )}
          </div>
          <div className="mt-1 truncate text-[11px] text-slate-400">
            {strategy.reason}
          </div>
        </div>

        <button
          onClick={() => onConfirm(strategy)}
          className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-emerald-400/30 bg-emerald-400/12 px-3 text-[11px] font-semibold text-emerald-200 transition hover:bg-emerald-400/20 active:scale-[0.97]"
        >
          <Check className="h-3 w-3" />
          确认执行
        </button>
        <button
          onClick={() => onViewAlerts(strategy)}
          className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-cyan-400/20 bg-cyan-400/8 px-3 text-[11px] text-cyan-200 transition hover:bg-cyan-400/15 active:scale-[0.97]"
        >
          <Eye className="h-3 w-3" />
          查看告警
        </button>
        <button
          onClick={() => onDismiss(strategy)}
          className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-white/10 bg-white/[0.05] px-3 text-[11px] text-slate-300 transition hover:bg-white/[0.08] active:scale-[0.97]"
        >
          <X className="h-3 w-3" />
          忽略
        </button>
      </div>
    </div>
  )
}
