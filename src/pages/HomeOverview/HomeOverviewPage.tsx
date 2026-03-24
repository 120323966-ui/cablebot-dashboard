import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { StatusBar } from './StatusBar'
import { MissionStrip } from './MissionStrip'
import { KpiStrip } from './KpiStrip'
import { AlertStream } from './AlertStream'
import { HeatmapChart } from './HeatmapChart'
import { FleetPanel } from './FleetPanel'
import { ActionDock } from './ActionDock'
import { Button } from '@/components/ui/Button'
import { useVoiceEngine } from '@/hooks/useVoiceEngine'
import { useDashboardContext } from '@/context/DashboardContext'
import type { VoiceIntent } from '@/utils/voiceIntents'

export function HomeOverviewPage() {
  const navigate = useNavigate()
  const { data, loading, error, updateData } = useDashboardContext()

  /* ── Voice command execution ── */
  const executeVoiceCommand = useCallback(
    (intent: VoiceIntent) => {
      switch (intent.action) {
        case 'PAUSE_MISSION':
          updateData((c) => {
            if (!c.activeTask) return c
            return { ...c, activeTask: { ...c.activeTask, status: 'paused' } }
          })
          break

        case 'RESUME_MISSION':
          updateData((c) => {
            if (!c.activeTask) return c
            return { ...c, activeTask: { ...c.activeTask, status: 'running' } }
          })
          break

        case 'EMERGENCY_STOP':
          updateData((c) => {
            if (!c.activeTask) return c
            return { ...c, activeTask: { ...c.activeTask, status: 'paused' } }
          })
          break

        case 'NAV_ALERTS':
          navigate('/alerts')
          break
        case 'NAV_COMMAND':
          navigate('/command')
          break
        case 'NAV_SPATIAL':
          navigate('/spatial')
          break
        case 'NAV_REPORTS':
          navigate('/reports')
          break
        case 'NAV_HISTORY':
          navigate('/history')
          break

        case 'FOCUS_SEGMENT':
          if (intent.param) {
            navigate(`/spatial?segment=${intent.param}`)
          }
          break

        case 'FOCUS_SEGMENT_MISSING':
          break

        default:
          break
      }
    },
    [navigate, updateData],
  )

  const voice = useVoiceEngine(executeVoiceCommand)

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
  if (error || !data) {
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

  return (
    <div className="flex flex-col gap-3">
      <StatusBar meta={data.meta} />
      <KpiStrip metrics={data.kpis} />
      <MissionStrip task={data.activeTask} />

      <div className="grid h-[520px] gap-3 xl:grid-cols-[1fr_1.5fr_1fr]">
        <div className="min-h-0 h-full">
          <AlertStream alerts={data.alerts} />
        </div>
        <div className="min-h-0 h-full">
          <HeatmapChart
            risk={data.risk}
            alerts={data.alerts}
            activeTask={data.activeTask}
          />
        </div>
        <div className="min-h-0 h-full">
          <FleetPanel robots={data.robots} trends={data.trends} activeTask={data.activeTask} />
        </div>
      </div>

      <ActionDock voice={voice} />
    </div>
  )
}
