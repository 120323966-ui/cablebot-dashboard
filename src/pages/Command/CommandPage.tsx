import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { BottomControlDock } from './BottomControlDock'
import { CenterVideoStage } from './CenterVideoStage'
import { CommandHeaderBar } from './CommandHeaderBar'
import { CommandVoiceDock } from './CommandVoiceDock'
import { RightCommandRail } from './RightCommandRail'
import { useCommandCenter } from '@/hooks/useCommandCenter'
import {
  applyCommandRealtime,
  useRealtimeCommandCenter,
} from '@/hooks/useRealtimeCommandCenter'
import { useDashboardContext } from '@/context/DashboardContext'
import { useVoiceEngine } from '@/hooks/useVoiceEngine'
import type {
  CommandCenterResponse,
  CommandMode,
  CommandRealtimeMessage,
  CommandMission,
  ControlState,
} from '@/types/command'
import type { VoiceIntent } from '@/utils/voiceIntents'

/* ── Merge global context progress into Command mission ── */

function mergeMissionFromContext(
  mission: CommandMission,
  activeTask: { status: string; progressPct: number; checksCompleted: number; checksTotal: number; etaMinutes: number } | null,
): CommandMission {
  if (!activeTask) return mission
  const missionStatus =
    activeTask.status === 'paused' ? 'paused' as const
    : activeTask.status === 'running' ? 'running' as const
    : mission.status
  return {
    ...mission,
    status: missionStatus,
    progressPct: activeTask.progressPct,
    checklistDone: activeTask.checksCompleted,
    checklistTotal: activeTask.checksTotal,
    etaMinutes: activeTask.etaMinutes,
  }
}

export function CommandPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialRobot = searchParams.get('robot') ?? 'R1'
  const [robotId, setRobotId] = useState(initialRobot)

  useEffect(() => {
    if (searchParams.has('robot')) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.delete('robot')
        return next
      }, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const { data, loading, error } = useCommandCenter(robotId)
  const [liveData, setLiveData] = useState<CommandCenterResponse | null>(null)
  const [dockState, setDockState] = useState<ControlState | null>(null)
  const [voiceOpen, setVoiceOpen] = useState(false)
  const [activeAux, setActiveAux] = useState<Set<string>>(new Set())
  /** 最近一次语音操作高亮的控件 key，1秒后自动清除 */
  const [highlightKey, setHighlightKey] = useState<string | null>(null)
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: dashboardData, updateData: updateDashboard } = useDashboardContext()
  const dashboardRef = useRef(dashboardData)
  dashboardRef.current = dashboardData

  /* ── Highlight helper ── */
  const flashHighlight = useCallback((key: string) => {
    if (highlightTimer.current) clearTimeout(highlightTimer.current)
    setHighlightKey(key)
    highlightTimer.current = setTimeout(() => setHighlightKey(null), 1200)
  }, [])

  const toggleAux = useCallback((id: string) => {
    setActiveAux((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const merged = useMemo(() => liveData ?? data, [data, liveData])

  const handleMessage = useCallback((message: CommandRealtimeMessage) => {
    setLiveData((current) => {
      if (!current) return current
      return applyCommandRealtime(current, message)
    })
  }, [])

  // Init: merge global context progress immediately
  useEffect(() => {
    if (data) {
      const task = dashboardRef.current?.activeTask ?? null
      const mergedMission = mergeMissionFromContext(data.mission, task)
      setLiveData({ ...data, mission: mergedMission })
      setDockState(data.control)
    }
  }, [data])

  // Ongoing sync from global context
  useEffect(() => {
    if (!dashboardData?.activeTask || !liveData) return
    const task = dashboardData.activeTask
    setLiveData((c) => {
      if (!c) return c
      return { ...c, mission: mergeMissionFromContext(c.mission, task) }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dashboardData?.activeTask?.status,
    dashboardData?.activeTask?.progressPct,
    dashboardData?.activeTask?.checksCompleted,
    dashboardData?.activeTask?.etaMinutes,
  ])

  useRealtimeCommandCenter(merged, handleMessage)

  const switchRobot = useCallback((id: string) => {
    setRobotId(id)
    setLiveData(null)
    setDockState(null)
  }, [])

  /* ── Control functions (existing) ── */

  const updateMode = useCallback((mode: CommandMode) => {
    setDockState((c) => (c ? { ...c, driveMode: mode } : c))
  }, [])

  const toggleControl = useCallback((key: 'lightOn' | 'stabilizationOn' | 'recording') => {
    setDockState((c) => (c ? { ...c, [key]: !c[key] } : c))
  }, [])

  const setControlOn = useCallback((key: 'lightOn' | 'stabilizationOn' | 'recording', value: boolean) => {
    setDockState((c) => (c ? { ...c, [key]: value } : c))
  }, [])

  const triggerAction = useCallback((label: string) => {
    if (label === '暂停巡检') {
      setLiveData((c) => {
        if (!c) return c
        const isPaused = c.mission.status === 'paused'
        const nextStatus = isPaused ? 'running' : 'paused'
        updateDashboard((d) => {
          if (!d.activeTask) return d
          return { ...d, activeTask: { ...d.activeTask, status: isPaused ? 'running' : 'paused' } }
        })
        return { ...c, mission: { ...c.mission, status: nextStatus } }
      })
      return
    }

    if (label === '急停') {
      setLiveData((c) => {
        if (!c) return c
        const isStopped = c.mission.status === 'attention'
        updateDashboard((d) => {
          if (!d.activeTask) return d
          return { ...d, activeTask: { ...d.activeTask, status: isStopped ? 'running' : 'paused' } }
        })
        return { ...c, mission: { ...c.mission, status: isStopped ? 'running' : 'attention' } }
      })
      return
    }
  }, [updateDashboard])

  /* ── Voice command execution ── */

  const executeCommandVoice = useCallback(
    (intent: VoiceIntent) => {
      switch (intent.action) {
        // ── 任务控制 ──
        case 'PAUSE_MISSION':
          triggerAction('暂停巡检')
          flashHighlight('pause')
          break
        case 'RESUME_MISSION':
          // 如果当前是暂停状态，triggerAction 会 toggle 回 running
          if (merged?.mission.status === 'paused') {
            triggerAction('暂停巡检')
          }
          flashHighlight('pause')
          break
        case 'EMERGENCY_STOP':
          triggerAction('急停')
          flashHighlight('estop')
          break

        // ── 驾驶模式 ──
        case 'MODE_AUTO':
          updateMode('auto')
          flashHighlight('mode')
          break
        case 'MODE_MANUAL':
          updateMode('manual')
          flashHighlight('mode')
          break
        case 'MODE_SEMI':
          updateMode('semi-auto')
          flashHighlight('mode')
          break

        // ── 灯光 ──
        case 'LIGHT_ON':
          setControlOn('lightOn', true)
          flashHighlight('light')
          break
        case 'LIGHT_OFF':
          setControlOn('lightOn', false)
          flashHighlight('light')
          break

        // ── 录制 ──
        case 'RECORDING_ON':
          setControlOn('recording', true)
          flashHighlight('recording')
          break
        case 'RECORDING_OFF':
          setControlOn('recording', false)
          flashHighlight('recording')
          break

        // ── 稳定 ──
        case 'STABILIZATION_ON':
          setControlOn('stabilizationOn', true)
          flashHighlight('stabilization')
          break
        case 'STABILIZATION_OFF':
          setControlOn('stabilizationOn', false)
          flashHighlight('stabilization')
          break

        // ── 辅助视角 ──
        case 'AUX_REAR_ON':
          if (!activeAux.has('rear-cam')) toggleAux('rear-cam')
          break
        case 'AUX_REAR_OFF':
          if (activeAux.has('rear-cam')) toggleAux('rear-cam')
          break
        case 'AUX_ZOOM_ON':
          if (!activeAux.has('detail-zoom')) toggleAux('detail-zoom')
          break
        case 'AUX_ZOOM_OFF':
          if (activeAux.has('detail-zoom')) toggleAux('detail-zoom')
          break

        // ── 视觉操作（提示性） ──
        case 'TOGGLE_THERMAL':
        case 'CAPTURE_SCREENSHOT':
        case 'MARK_ANOMALY':
          // 这些操作的实际画面变化由 CenterVideoStage 控制
          // 目前做提示反馈，后续可扩展
          break

        // ── 页面导航 ──
        case 'NAV_ALERTS':
          navigate('/alerts')
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
        case 'NAV_HOME':
          navigate('/overview')
          break
        case 'FOCUS_SEGMENT':
          if (intent.param) navigate(`/spatial?segment=${intent.param}`)
          break

        default:
          break
      }
    },
    [triggerAction, updateMode, setControlOn, toggleAux, activeAux, flashHighlight, merged, navigate],
  )

  const voice = useVoiceEngine(executeCommandVoice)

  /* ── Loading / Error ── */

  if (loading) {
    return <div className="panel-card h-[calc(100vh-148px)] animate-pulse bg-white/[0.03]" />
  }

  if (error || !merged) {
    return (
      <div className="panel-card flex h-[calc(100vh-148px)] items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-semibold text-white">实时巡检页数据加载失败</div>
          <p className="mt-3 text-sm text-slate-400">{error ?? '未知错误'}</p>
          <Button className="mt-6" onClick={() => window.location.reload()}>
            重新加载
          </Button>
        </div>
      </div>
    )
  }

  const currentControl = dockState ?? merged.control

  return (
    <section className="flex h-[calc(100vh-148px)] min-h-0 flex-col gap-2.5 overflow-hidden">
      {/* A — Header */}
      <CommandHeaderBar
        meta={merged.meta}
        mission={merged.mission}
        robot={merged.robot}
        activeRobotId={robotId}
        onSwitchRobot={switchRobot}
      />

      {/* B — Main stage */}
      <div className="flex min-h-0 flex-1 gap-2.5">
        {/* B1 — Video area + voice dock */}
        <div className="relative min-h-0 min-w-0 flex-1">
          <CenterVideoStage
            video={merged.primaryVideo}
            mission={merged.mission}
            control={currentControl}
            activeAux={activeAux}
          />

          {/* Voice dock — inline at video bottom, not a full overlay */}
          {voiceOpen && (
            <CommandVoiceDock
              voice={voice}
              onClose={() => setVoiceOpen(false)}
            />
          )}
        </div>

        {/* B2 — Context sidebar */}
        <div className="w-[280px] shrink-0">
          <RightCommandRail
            robot={merged.robot}
            mission={merged.mission}
            sensors={merged.sensors}
            auxViews={merged.auxViews}
            events={merged.events}
            activeAux={activeAux}
            onToggleAux={toggleAux}
          />
        </div>
      </div>

      {/* C — Bottom control dock */}
      <BottomControlDock
        control={currentControl}
        missionStatus={merged.mission.status}
        voiceActive={voiceOpen}
        highlightKey={highlightKey}
        onModeChange={updateMode}
        onToggle={toggleControl}
        onAction={(label) => triggerAction(label)}
        onVoice={() => setVoiceOpen(!voiceOpen)}
      />
    </section>
  )
}
