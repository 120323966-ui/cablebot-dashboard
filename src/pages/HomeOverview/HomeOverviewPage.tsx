import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertFeed } from './AlertFeed'
import { KpiStrip } from './KpiStrip'
import { QuickActions } from './QuickActions'
import { RiskHeatmapPanel } from './RiskHeatmapPanel'
import { RobotStatusPanel } from './RobotStatusPanel'
import { TaskHero } from './TaskHero'
import { TrendChartCard } from './TrendChartCard'
import { VoiceEntry } from './VoiceEntry'
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

  const handleMessage = useCallback((message: Parameters<typeof applyRealtime>[1]) => {
    setLiveData((current) => {
      if (!current) return current
      return applyRealtime(current, message)
    })
  }, [])

  const syncLiveSeed = useCallback((seed: HomeOverviewResponse | null) => {
    setLiveData(seed)
  }, [])

  useEffect(() => {
    if (data && !liveData) syncLiveSeed(data)
  }, [data, liveData, syncLiveSeed])

  useRealtimeDashboard(merged, handleMessage)

  if (loading) {
    return <div className="panel-card min-h-[520px] animate-pulse bg-white/[0.03]" />
  }

  if (error || !merged) {
    return (
      <div className="panel-card min-h-[360px] flex items-center justify-center">
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

  const onAction = (action: QuickAction) => {
    if (action.confirm) {
      setPendingAction(action)
      return
    }
    window.alert(`已执行：${action.label}`)
  }

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-[1.45fr_0.95fr]">
        <TaskHero task={merged.activeTask} meta={merged.meta} />
        <QuickActions actions={merged.actions} onAction={onAction} />
      </div>

      <div className="mt-4">
        <KpiStrip metrics={merged.kpis} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.02fr_1.18fr]">
        <AlertFeed alerts={merged.alerts} />
        <RiskHeatmapPanel risk={merged.risk} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[0.95fr_1.15fr]">
        <RobotStatusPanel robots={merged.robots} />
        <div className="space-y-4">
          <TrendChartCard trends={merged.trends} />
          <VoiceEntry />
        </div>
      </div>

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
    </>
  )
}
