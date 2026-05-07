import { AlertCircle, Bot, ShieldAlert, SquareStack, TrendingDown, TrendingUp, Minus } from 'lucide-react'
import type { KpiMetric } from '@/types/dashboard'

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  tasks: SquareStack,
  online: Bot,
  alerts: AlertCircle,
  risk: ShieldAlert,
}

const toneAccent: Record<string, string> = {
  neutral: 'text-slate-300 border-white/8',
  good: 'text-emerald-300 border-emerald-400/15',
  warning: 'text-amber-300 border-amber-400/15',
  danger: 'text-rose-300 border-rose-400/15',
}

function DeltaChip({ deltaPct }: { deltaPct: number }) {
  if (deltaPct === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-slate-500">
        <Minus className="h-3 w-3" />
        持平
      </span>
    )
  }
  const up = deltaPct > 0
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${up ? 'text-amber-300' : 'text-emerald-300'}`}>
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {up ? '+' : ''}{deltaPct}%
    </span>
  )
}

export function KpiStrip({ metrics }: { metrics: KpiMetric[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {metrics.map((m) => {
        const Icon = iconMap[m.id] ?? SquareStack
        const accent = toneAccent[m.tone] ?? toneAccent.neutral

        return (
          <div
            key={m.id}
            className={`flex items-center gap-4 rounded-2xl border bg-white/[0.03] px-4 py-3 ${accent.split(' ').filter(c => c.startsWith('border')).join(' ')}`}
          >
            <div className="rounded-xl border border-white/8 bg-white/[0.04] p-2.5">
              <Icon className={`h-4 w-4 ${accent.split(' ').filter(c => c.startsWith('text')).join(' ')}`} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{m.label}</div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-semibold tabular-nums tracking-tight text-white">{m.value}</span>
                {m.unit ? <span className="text-xs text-slate-400">{m.unit}</span> : null}
              </div>
            </div>

            {m.deltaPct !== undefined ? <DeltaChip deltaPct={m.deltaPct} /> : null}
          </div>
        )
      })}
    </div>
  )
}
