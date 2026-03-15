import { AlertCircle, Bot, ShieldAlert, SquareStack } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import type { KpiMetric } from '@/types/dashboard'

const iconMap = {
  tasks: SquareStack,
  online: Bot,
  alerts: AlertCircle,
  risk: ShieldAlert,
}

export function KpiStrip({ metrics }: { metrics: KpiMetric[] }) {
  return (
    <div className="grid gap-4 xl:grid-cols-4">
      {metrics.map((metric) => {
        const Icon = iconMap[metric.id as keyof typeof iconMap] ?? SquareStack
        return (
          <Card key={metric.id} className="overflow-hidden">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="panel-eyebrow">{metric.label}</div>
                <div className="mt-4 flex items-end gap-2">
                  <div className="text-4xl font-semibold tracking-tight text-white">{metric.value}</div>
                  {metric.unit ? <div className="pb-1 text-sm text-slate-400">{metric.unit}</div> : null}
                </div>
                {metric.hint ? <p className="mt-3 text-sm leading-6 text-slate-300">{metric.hint}</p> : null}
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-3 text-cyan-300">
                <Icon className="h-5 w-5" />
              </div>
            </div>
            {metric.deltaPct !== undefined ? (
              <div className="mt-5 inline-flex rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-xs text-slate-300">
                较上一班次 {metric.deltaPct > 0 ? '+' : ''}
                {metric.deltaPct}%
              </div>
            ) : null}
          </Card>
        )
      })}
    </div>
  )
}
