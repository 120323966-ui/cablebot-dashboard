import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
  Siren,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import type { AlertItem } from '@/types/dashboard'

function toneOf(severity: AlertItem['severity']) {
  if (severity === 'critical') return 'danger' as const
  if (severity === 'warning') return 'warning' as const
  return 'neutral' as const
}

function severityLabel(severity: AlertItem['severity']) {
  if (severity === 'critical') return 'critical'
  if (severity === 'warning') return 'warning'
  return 'info'
}

export function AlertFeed({ alerts }: { alerts: AlertItem[] }) {
  const visibleAlerts = alerts.slice(0, 10)
  const criticalCount = visibleAlerts.filter((item) => item.severity === 'critical').length
  const latestAlert = visibleAlerts[0] ?? null

  return (
    <Card
      className="flex h-full min-h-0 flex-col overflow-hidden"
      eyebrow="Alert Center"
      title="最近告警"
      
    >
      <p className="mb-4 shrink-0 text-sm leading-6 text-slate-400">
        以区段热力风险为基准展示最近异常
      </p>

      <div className="mb-4 grid shrink-0 gap-3 sm:grid-cols-3">
        <div className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-3">
          <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Total</div>
          <div className="mt-2 text-2xl font-semibold text-white">{visibleAlerts.length}</div>
          <div className="mt-1 text-xs text-slate-400">当前缓存告警</div>
        </div>

        <div className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-3">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-slate-500">
            <ShieldAlert className="h-3.5 w-3.5 text-rose-300" />
            Critical
          </div>
          <div className="mt-2 text-2xl font-semibold text-white">{criticalCount}</div>
          <div className="mt-1 text-xs text-slate-400">高优先告警数量</div>
        </div>

        <div className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-3">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-slate-500">
            <Siren className="h-3.5 w-3.5 text-cyan-300" />
            Focus
          </div>
          <div className="mt-2 text-lg font-semibold text-white">
            {latestAlert?.segmentId ?? '--'}
          </div>
          <div className="mt-1 text-xs text-slate-400">最新告警区段</div>
        </div>
      </div>

      <section className="shrink-0 rounded-[24px] border border-white/8 bg-slate-950/30 p-3">
        <div className="mb-3 flex items-center justify-between gap-3 px-1">
          <div>
            <div className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
              Alert Stream
            </div>
            <div className="mt-1 text-sm text-slate-300">
              固定高度视窗，内部滚动查看告警
            </div>
          </div>

          
        </div>

        <div className="h-[800px] overflow-y-auto pr-2 pb-2 [scrollbar-gutter:stable] xl:h-[910px]">
          <div className="space-y-3">
            {visibleAlerts.map((alert) => (
              <button
                key={alert.id}
                className="group flex w-full items-start gap-4 rounded-[22px] border border-white/8 bg-white/[0.03] p-4 text-left transition hover:border-cyan-400/20 hover:bg-white/[0.05]"
              >
                <div className="mt-0.5 rounded-2xl bg-rose-500/10 p-2 text-rose-300">
                  {alert.status === 'acknowledged' ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-medium text-white">{alert.title}</div>
                    <Badge tone={toneOf(alert.severity)}>
                      {severityLabel(alert.severity)}
                    </Badge>
                  </div>

                  <div className="mt-2 text-sm leading-6 text-slate-300">
                    {alert.value}
                  </div>

                  <div className="mt-1 text-xs text-slate-500">
                    {alert.segmentId} · {alert.occurredAt} · {alert.evidence}
                  </div>
                </div>

                <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-500 transition group-hover:text-cyan-300" />
              </button>
            ))}
          </div>
        </div>
      </section>
    </Card>
  )
}