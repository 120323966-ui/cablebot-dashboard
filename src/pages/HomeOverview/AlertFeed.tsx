import { AlertTriangle, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import type { AlertItem } from '@/types/dashboard'

const severityTone: Record<AlertItem['severity'], 'danger' | 'warning' | 'neutral'> = {
  critical: 'danger',
  warning: 'warning',
  info: 'neutral',
}

const severityLabel: Record<AlertItem['severity'], string> = {
  critical: 'critical',
  warning: 'warning',
  info: 'info',
}

export function AlertFeed({ alerts }: { alerts: AlertItem[] }) {
  return (
    <Card className="h-full min-h-0 overflow-hidden" eyebrow="Alert Center" title="最近告警">
      <div className="flex h-full min-h-0 flex-col">
        <div className="shrink-0">
          <p className="mt-1 text-sm text-slate-400">
            以区段热力风险为基准展示最近异常，滚动查看完整告警流。
          </p>
        </div>

        <div className="relative mt-5 flex-1 min-h-0">
          <div className="alert-scroll h-full min-h-0 space-y-4 overflow-y-auto pr-2 pb-6 overscroll-contain">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="rounded-[22px] border border-white/8 bg-white/[0.02] px-4 py-3.5 transition-colors hover:border-cyan-400/20 hover:bg-white/[0.035]"
              >
                <div className="flex items-start gap-4">
                  <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-500/10 text-rose-300">
                    <AlertTriangle className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="truncate text-[15px] font-semibold text-white">{alert.title}</div>
                      <Badge tone={severityTone[alert.severity]}>{severityLabel[alert.severity]}</Badge>
                    </div>

                    <div className="mt-2 text-[15px] text-slate-200">{alert.value}</div>

                    <div className="mt-2 text-sm text-slate-500">
                      {alert.segmentId} · {alert.occurredAt} · {alert.evidence}
                    </div>
                  </div>

                  <button
                    className="mt-1 shrink-0 text-slate-500 transition-colors hover:text-cyan-300"
                    aria-label={`查看告警 ${alert.title}`}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#07111f] via-[#07111f]/85 to-transparent" />
        </div>
      </div>
    </Card>
  )
}