import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ChevronRight,
  Flame,
  Info,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import type { AlertItem, Severity } from '@/types/dashboard'

/* ── helpers ── */

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return '刚刚'
  if (m < 60) return `${m} 分钟前`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} 小时前`
  return `${Math.floor(h / 24)} 天前`
}

const severityConfig: Record<Severity, {
  tone: 'danger' | 'warning' | 'neutral'
  label: string
  iconBg: string
  iconColor: string
  Icon: React.ComponentType<{ className?: string }>
}> = {
  critical: {
    tone: 'danger',
    label: '严重',
    iconBg: 'bg-rose-500/12',
    iconColor: 'text-rose-400',
    Icon: Flame,
  },
  warning: {
    tone: 'warning',
    label: '警告',
    iconBg: 'bg-amber-500/12',
    iconColor: 'text-amber-400',
    Icon: AlertTriangle,
  },
  info: {
    tone: 'neutral',
    label: '提示',
    iconBg: 'bg-sky-500/12',
    iconColor: 'text-sky-400',
    Icon: Info,
  },
}

/* ── component ── */

export function AlertStream({ alerts }: { alerts: AlertItem[] }) {
  const navigate = useNavigate()
  const visible = alerts.slice(0, 8)
  const criticalCount = visible.filter((a) => a.severity === 'critical').length

  return (
    <Card
      className="flex h-full flex-col overflow-hidden"
      eyebrow="Alert Center"
      title="实时告警"
      action={
        criticalCount > 0 ? (
          <span className="rounded-full border border-rose-400/20 bg-rose-500/10 px-2.5 py-1 text-[11px] font-medium text-rose-200">
            {criticalCount} 条严重
          </span>
        ) : null
      }
    >
      {/* List */}
      <div className="flex-1 space-y-2 overflow-y-auto pr-1 [scrollbar-gutter:stable]">
        {visible.map((alert) => {
          const cfg = severityConfig[alert.severity]
          const SevIcon = cfg.Icon

          return (
            <button
              key={alert.id}
              className="group flex w-full items-start gap-3 rounded-xl border border-white/6 bg-white/[0.02] p-3 text-left transition hover:border-cyan-400/18 hover:bg-white/[0.04]"
            >
              <div className={`mt-0.5 shrink-0 rounded-lg p-1.5 ${cfg.iconBg}`}>
                <SevIcon className={`h-3.5 w-3.5 ${cfg.iconColor}`} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-white">{alert.title}</span>
                  <Badge tone={cfg.tone}>{cfg.label}</Badge>
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-medium text-slate-400">{alert.segmentId}</span>
                  <span>·</span>
                  <span>{timeAgo(alert.occurredAt)}</span>
                  <span>·</span>
                  <span className="truncate">{alert.evidence}</span>
                </div>
              </div>

              <ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-slate-600 transition group-hover:text-cyan-400" />
            </button>
          )
        })}
      </div>

      {/* Footer link */}
      <button
        onClick={() => navigate('/alerts')}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/6 bg-white/[0.02] py-2 text-xs text-slate-400 transition hover:border-cyan-400/18 hover:text-cyan-300"
      >
        查看全部告警
        <ChevronRight className="h-3 w-3" />
      </button>
    </Card>
  )
}
