import { AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import type { AlertItem } from '@/types/dashboard'

function toneOf(severity: AlertItem['severity']) {
  if (severity === 'critical') return 'danger' as const
  if (severity === 'warning') return 'warning' as const
  return 'neutral' as const
}

export function AlertFeed({ alerts }: { alerts: AlertItem[] }) {
  return (
    <Card className="h-full" eyebrow="Alert Center" title="最近告警">
      <div className="space-y-3">
        {alerts.map((alert) => (
          <button key={alert.id} className="group flex w-full items-start gap-4 rounded-3xl border border-white/8 bg-white/[0.03] p-4 text-left transition hover:border-cyan-400/20 hover:bg-white/[0.05]">
            <div className="mt-0.5 rounded-2xl bg-rose-500/10 p-2 text-rose-300">
              {alert.status === 'acknowledged' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <div className="font-medium text-white">{alert.title}</div>
                <Badge tone={toneOf(alert.severity)}>{alert.severity}</Badge>
              </div>
              <div className="mt-2 text-sm leading-6 text-slate-300">{alert.evidence}</div>
              <div className="mt-1 text-xs text-slate-500">
                {alert.segmentId} · {new Date(alert.occurredAt).toLocaleTimeString('zh-CN')} · {alert.value}
              </div>
            </div>
            <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-500 transition group-hover:text-cyan-300" />
          </button>
        ))}
      </div>
    </Card>
  )
}
