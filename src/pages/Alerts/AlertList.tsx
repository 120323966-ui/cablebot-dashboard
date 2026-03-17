import { AlertTriangle, CheckCircle2, Filter, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import type { AlertItem, Severity } from '@/types/dashboard'
import type { AlertFilters } from '@/types/alerts'

/* ───────── helpers ───────── */

function toneOf(severity: Severity) {
  if (severity === 'critical') return 'danger' as const
  if (severity === 'warning') return 'warning' as const
  return 'neutral' as const
}

function statusIcon(status: AlertItem['status']) {
  if (status === 'new') return <AlertTriangle className="h-4 w-4 text-rose-400" />
  if (status === 'acknowledged') return <CheckCircle2 className="h-4 w-4 text-amber-400" />
  return <XCircle className="h-4 w-4 text-slate-500" />
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return '刚刚'
  if (m < 60) return `${m}分钟前`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}小时前`
  return `${Math.floor(h / 24)}天前`
}

/* ───────── Filter chip ───────── */

function Chip({
  label,
  active,
  onClick,
  count,
}: {
  label: string
  active: boolean
  onClick: () => void
  count?: number
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition ${
        active
          ? 'border-cyan-400/30 bg-cyan-400/10 text-white'
          : 'border-white/8 bg-white/[0.03] text-slate-400 hover:border-white/15 hover:text-white'
      }`}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span className={`rounded-full px-1.5 text-[9px] ${active ? 'bg-cyan-400/20 text-cyan-200' : 'bg-white/8 text-slate-500'}`}>
          {count}
        </span>
      )}
    </button>
  )
}

/* ───────── Main component ───────── */

export function AlertList({
  alerts,
  segments,
  filters,
  selectedId,
  onFiltersChange,
  onSelect,
}: {
  alerts: AlertItem[]
  segments: string[]
  filters: AlertFilters
  selectedId: string | null
  onFiltersChange: (f: AlertFilters) => void
  onSelect: (id: string) => void
}) {
  /* ---- Apply filters ---- */
  const filtered = alerts.filter((a) => {
    if (filters.severity !== 'all' && a.severity !== filters.severity) return false
    if (filters.status !== 'all' && a.status !== filters.status) return false
    if (filters.segmentId !== 'all' && a.segmentId !== filters.segmentId) return false
    return true
  })

  /* ---- Counts for chips ---- */
  const countBySeverity = (s: Severity) => alerts.filter((a) => a.severity === s).length
  const countByStatus = (s: AlertItem['status']) => alerts.filter((a) => a.status === s).length

  return (
    <div className="flex h-full flex-col">
      {/* Filters */}
      <div className="shrink-0 space-y-3 border-b border-white/6 p-4">
        {/* Severity */}
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-slate-500">
            <Filter className="h-3 w-3" /> 严重等级
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Chip label="全部" active={filters.severity === 'all'} onClick={() => onFiltersChange({ ...filters, severity: 'all' })} />
            <Chip label="Critical" active={filters.severity === 'critical'} onClick={() => onFiltersChange({ ...filters, severity: 'critical' })} count={countBySeverity('critical')} />
            <Chip label="Warning" active={filters.severity === 'warning'} onClick={() => onFiltersChange({ ...filters, severity: 'warning' })} count={countBySeverity('warning')} />
            <Chip label="Info" active={filters.severity === 'info'} onClick={() => onFiltersChange({ ...filters, severity: 'info' })} count={countBySeverity('info')} />
          </div>
        </div>

        {/* Status */}
        <div>
          <div className="mb-2 text-[10px] uppercase tracking-[0.2em] text-slate-500">状态</div>
          <div className="flex flex-wrap gap-1.5">
            <Chip label="全部" active={filters.status === 'all'} onClick={() => onFiltersChange({ ...filters, status: 'all' })} />
            <Chip label="待处置" active={filters.status === 'new'} onClick={() => onFiltersChange({ ...filters, status: 'new' })} count={countByStatus('new')} />
            <Chip label="已确认" active={filters.status === 'acknowledged'} onClick={() => onFiltersChange({ ...filters, status: 'acknowledged' })} count={countByStatus('acknowledged')} />
            <Chip label="已关闭" active={filters.status === 'closed'} onClick={() => onFiltersChange({ ...filters, status: 'closed' })} count={countByStatus('closed')} />
          </div>
        </div>

        {/* Segment */}
        <div>
          <div className="mb-2 text-[10px] uppercase tracking-[0.2em] text-slate-500">区段</div>
          <div className="flex flex-wrap gap-1.5">
            <Chip label="全部" active={filters.segmentId === 'all'} onClick={() => onFiltersChange({ ...filters, segmentId: 'all' })} />
            {segments.map((s) => (
              <Chip key={s} label={s} active={filters.segmentId === s} onClick={() => onFiltersChange({ ...filters, segmentId: s })} />
            ))}
          </div>
        </div>
      </div>

      {/* Result count */}
      <div className="shrink-0 px-4 py-2 text-xs text-slate-500">
        共 {filtered.length} 条{filters.severity !== 'all' || filters.status !== 'all' || filters.segmentId !== 'all' ? '（已筛选）' : ''}
      </div>

      {/* List */}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 [scrollbar-gutter:stable]">
        <div className="space-y-2">
          {filtered.map((alert) => {
            const isSelected = alert.id === selectedId
            const isNew = alert.status === 'new' && alert.severity === 'critical'
            return (
              <button
                key={alert.id}
                onClick={() => onSelect(alert.id)}
                className={`group flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left transition ${
                  isSelected
                    ? 'border-cyan-400/25 bg-cyan-400/[0.06]'
                    : 'border-white/6 bg-white/[0.02] hover:border-white/12 hover:bg-white/[0.04]'
                } ${isNew ? 'animate-pulse' : ''}`}
                style={isNew ? { animationDuration: '3s' } : undefined}
              >
                <div className="mt-0.5 shrink-0">{statusIcon(alert.status)}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-medium text-white">{alert.title}</span>
                    <Badge tone={toneOf(alert.severity)}>{alert.severity}</Badge>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2 text-[11px] text-slate-500">
                    <span>{alert.segmentId}</span>
                    <span>·</span>
                    <span>{relativeTime(alert.occurredAt)}</span>
                    <span>·</span>
                    <span>{alert.evidence}</span>
                  </div>
                </div>
              </button>
            )
          })}

          {filtered.length === 0 && (
            <div className="py-12 text-center text-sm text-slate-500">
              无匹配告警
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
