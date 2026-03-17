import { useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAlerts } from '@/hooks/useAlerts'
import { AlertDetail } from './AlertDetail'
import { AlertList } from './AlertList'
import type { AlertFilters } from '@/types/alerts'

/* ───────── KPI Card atom ───────── */

function KpiCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: number | string
  sub: string
  color: string
}) {
  return (
    <div className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-3">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-slate-500">
        <span className={color}>{icon}</span>
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
      <div className="mt-1 text-xs text-slate-400">{sub}</div>
    </div>
  )
}

/* ───────── Main page ───────── */

export function AlertsPage() {
  const { alerts, history, segments, loading, error, updateAlertStatus } = useAlerts()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filters, setFilters] = useState<AlertFilters>({
    severity: 'all',
    status: 'all',
    segmentId: 'all',
  })

  const selectedAlert = alerts.find((a) => a.id === selectedId) ?? null

  /* ---- KPI counts ---- */
  const pendingCount = alerts.filter((a) => a.status === 'new').length
  const ackCount = alerts.filter((a) => a.status === 'acknowledged').length
  const closedToday = alerts.filter((a) => {
    if (a.status !== 'closed') return false
    const t = new Date(a.occurredAt)
    const now = new Date()
    return t.toDateString() === now.toDateString()
  }).length
  const criticalPending = alerts.filter(
    (a) => a.severity === 'critical' && a.status === 'new',
  ).length

  /* ---- Loading / Error ---- */
  if (loading) {
    return <div className="panel-card min-h-[520px] animate-pulse bg-white/[0.03]" />
  }

  if (error) {
    return (
      <div className="panel-card flex min-h-[360px] items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-semibold text-white">告警数据加载失败</div>
          <p className="mt-3 text-sm text-slate-400">{error}</p>
          <Button className="mt-6" onClick={() => window.location.reload()}>
            重新加载
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-148px)] flex-col gap-4 overflow-hidden">
      {/* ===== KPI Strip ===== */}
      <div className="grid shrink-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={<AlertTriangle className="h-3.5 w-3.5" />}
          label="待处置"
          value={pendingCount}
          sub={`其中 ${criticalPending} 条 critical`}
          color="text-rose-400"
        />
        <KpiCard
          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
          label="已确认"
          value={ackCount}
          sub="等待进一步处理"
          color="text-amber-400"
        />
        <KpiCard
          icon={<ShieldAlert className="h-3.5 w-3.5" />}
          label="今日已关闭"
          value={closedToday}
          sub="处置完成"
          color="text-emerald-400"
        />
        <KpiCard
          icon={<Clock className="h-3.5 w-3.5" />}
          label="总告警数"
          value={alerts.length}
          sub="实时更新中"
          color="text-cyan-400"
        />
      </div>

      {/* ===== Main: Left list + Right detail ===== */}
      <div className="flex min-h-0 flex-1 gap-4">
        {/* Left panel */}
        <div className="flex w-[55%] shrink-0 flex-col overflow-hidden rounded-2xl border border-white/8 bg-slate-950/40">
          <AlertList
            alerts={alerts}
            segments={segments}
            filters={filters}
            selectedId={selectedId}
            onFiltersChange={setFilters}
            onSelect={setSelectedId}
          />
        </div>

        {/* Right panel */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/8 bg-slate-950/40">
          {selectedAlert ? (
            <AlertDetail
              alert={selectedAlert}
              allAlerts={alerts}
              history={history}
              onStatusChange={(id, status) => {
                updateAlertStatus(id, status)
              }}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <AlertTriangle className="mx-auto h-10 w-10 text-slate-600" />
                <div className="mt-4 text-sm text-slate-500">
                  从左侧列表选择一条告警查看详情
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
