import { useCallback, useEffect, useMemo, useState } from 'react'
import { StatusBar } from './StatusBar'
import { MissionStrip } from './MissionStrip'
import { KpiStrip } from './KpiStrip'
import { AlertStream } from './AlertStream'
import { HeatmapChart } from './HeatmapChart'
import { FleetPanel } from './FleetPanel'
import { ActionDock } from './ActionDock'
import { useDashboardHome } from '@/hooks/useDashboardHome'
import { applyRealtime, useRealtimeDashboard } from '@/hooks/useRealtimeDashboard'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Button } from '@/components/ui/Button'
import type { HomeOverviewResponse, QuickAction } from '@/types/dashboard'

export function HomeOverviewPage() {
  const { data, loading, error } = useDashboardHome()
  const [liveData, setLiveData] = useState<HomeOverviewResponse | null>(null)
  const [pendingAction, setPendingAction] = useState<QuickAction | null>(null)

  const merged = useMemo(() => liveData ?? data, [data, liveData])

  const handleMessage = useCallback(
    (message: Parameters<typeof applyRealtime>[1]) => {
      setLiveData((current) => {
        if (!current) return current
        return applyRealtime(current, message)
      })
    },
    [],
  )

  useEffect(() => {
    if (data && !liveData) setLiveData(data)
  }, [data, liveData])

  useRealtimeDashboard(merged, handleMessage)

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-10 animate-pulse rounded-2xl bg-white/[0.03]" />
        <div className="h-16 animate-pulse rounded-2xl bg-white/[0.03]" />
        <div className="grid h-[420px] animate-pulse gap-3 xl:grid-cols-[0.3fr_0.4fr_0.3fr]">
          <div className="rounded-[28px] bg-white/[0.03]" />
          <div className="rounded-[28px] bg-white/[0.03]" />
          <div className="rounded-[28px] bg-white/[0.03]" />
        </div>
      </div>
    )
  }

  /* ── Error ── */
  if (error || !merged) {
    return (
      <div className="panel-card flex min-h-[360px] items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-semibold text-white">首页数据加载失败</div>
          <p className="mt-3 text-sm text-slate-400">{error ?? '未知错误'}</p>
          <Button className="mt-6" onClick={() => window.location.reload()}>
            重新加载
          </Button>
        </div>
      </div>
    )
  }

  /* ── Action handler ── */
  const onAction = (action: QuickAction) => {
    if (action.confirm) {
      setPendingAction(action)
      return
    }
    window.alert(`已执行：${action.label}`)
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Row 1: Status bar */}
      <StatusBar meta={merged.meta} />

      {/* Row 2: KPI + Mission */}
      <KpiStrip metrics={merged.kpis} />
      <MissionStrip task={merged.activeTask} />

      {/* Row 3: Three-column core — fixed height, internal scroll */}
      <div className="grid h-[520px] gap-3 xl:grid-cols-[1fr_1.5fr_1fr]">
        <div className="min-h-0 h-full">
          <AlertStream alerts={merged.alerts} />
        </div>
        <div className="min-h-0 h-full">
          <HeatmapChart
            risk={merged.risk}
            alerts={merged.alerts}
            activeTask={merged.activeTask}
          />
        </div>
        <div className="min-h-0 h-full">
          <FleetPanel robots={merged.robots} trends={merged.trends} />
        </div>
      </div>

      {/* Row 4: Action dock */}
      <ActionDock actions={merged.actions} onAction={onAction} />

      {/* Confirm dialog */}
      <ConfirmDialog
        open={Boolean(pendingAction)}
        title={pendingAction?.label ?? ''}
        description={pendingAction?.description ?? ''}
        confirmLabel="确认执行"
        onCancel={() => setPendingAction(null)}
        onConfirm={() => {
          if (pendingAction) window.alert(`已确认执行：${pendingAction.label}`)
          setPendingAction(null)
        }}
      />
    </div>
  )
}
