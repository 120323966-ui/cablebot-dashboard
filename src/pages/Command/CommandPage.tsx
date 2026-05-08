import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { AutoEstopBanner } from './AutoEstopBanner'
import { BottomControlDock } from './BottomControlDock'
import { CenterVideoStage } from './CenterVideoStage'
import { CommandHeaderBar } from './CommandHeaderBar'
import { CommandVoiceDock } from './CommandVoiceDock'
import { MovementStrategyCard } from './MovementStrategyCard'
import { RightCommandRail } from './RightCommandRail'
import { useCommandCenter } from '@/hooks/useCommandCenter'
import {
  applyCommandRealtime,
  useRealtimeCommandCenter,
} from '@/hooks/useRealtimeCommandCenter'
import { useDashboardContext } from '@/context/useDashboardContext'
import { useVoiceEngine } from '@/hooks/useVoiceEngine'
import { useRegisterVoiceKeys } from '@/hooks/useRegisterVoiceKeys'
import {
  registerCommandToggle,
  unregisterCommandToggle,
} from '@/hooks/useKeyboardShortcuts'
import { SEGMENT_LABELS } from '@/mocks/data/constants'
import { deriveMovementStrategy } from '@/utils/movementStrategy'
import type {
  CommandCenterResponse,
  CommandEvent,
  CommandMode,
  CommandRealtimeMessage,
  CommandMission,
  ControlState,
  EventStatus,
  MovementStrategySuggestion,
  RobotControlCommand,
} from '@/types/command'
import type { RobotSnapshot } from '@/mocks/data/sharedSeed'
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

function mergeRobotFromContext(
  current: CommandCenterResponse['robot'],
  robot: RobotSnapshot | undefined,
): CommandCenterResponse['robot'] {
  if (!robot) return current
  const label = SEGMENT_LABELS[robot.segmentId] ?? robot.segmentId
  return {
    ...current,
    segmentId: robot.segmentId,
    segmentProgress: robot.progress,
    direction: robot.direction,
    status: robot.status,
    location: `${label} ${Math.round(robot.progress * 280)}m`,
    batteryPct: robot.batteryPct,
    speedKmh: robot.speedKmh,
    networkQuality: robot.signalRssi > -70 ? 'good' : 'unstable',
  }
}

function commandFromStrategy(strategy: MovementStrategySuggestion): RobotControlCommand {
  const action: RobotControlCommand['action'] =
    strategy.action === 'stop' ? 'stop'
    : strategy.action === 'slow' ? 'slow'
    : strategy.action === 'continue' ? 'continue'
    : 'continue'

  return {
    id: `cmd-${strategy.id}`,
    action,
    payload: action === 'slow' ? { speedKmh: 0.5 } : undefined,
    fromStrategyId: strategy.id,
    issuedAt: new Date().toISOString(),
    auto: false,
  }
}

/* ── 行进策略忽略复现机制 ──
 * 记录"操作员忽略"或"卡片自动消失"的策略，并在以下任一条件下让建议重新弹出：
 *   1) 关联告警严重程度发生变化（升级/降级）→ severityFingerprint 不一致；
 *   2) 关联告警全部 closed → fingerprint 长度归零，自动失效；
 *   3) 距上次忽略已超过 DISMISS_TTL_MS（防止永久遗忘）。
 */
interface DismissRecord {
  dismissedAt: number
  severityFingerprint: string
}

/** 3 分钟无新变化即让被忽略的策略重新弹出 */
const DISMISS_TTL_MS = 3 * 60 * 1000

function buildSeverityFingerprint(
  alertIds: string[],
  alertsById: Map<string, { severity: string; status: string }>,
): string {
  return [...alertIds]
    .sort()
    .map((id) => {
      const a = alertsById.get(id)
      // closed 告警视为不存在，让指纹自然失效
      if (!a || a.status === 'closed') return ''
      return `${id}:${a.severity}`
    })
    .filter(Boolean)
    .join('|')
}

function isStrategySuppressed(
  strategy: MovementStrategySuggestion,
  dismissed: Map<string, DismissRecord>,
  alertsById: Map<string, { severity: string; status: string }>,
  now: number,
): boolean {
  const record = dismissed.get(strategy.id)
  if (!record) return false

  // 条件 1：超过 TTL，自动失效
  if (now - record.dismissedAt > DISMISS_TTL_MS) return false

  // 条件 2：当前关联告警的严重程度指纹
  const currentFingerprint = buildSeverityFingerprint(strategy.sourceAlertIds, alertsById)
  // 关联告警全部 closed → 指纹为空 → 失效（这条建议本就该消失）
  if (currentFingerprint === '') return false

  // 条件 3：指纹与忽略时不同 → 严重程度有变化，必须复现
  if (currentFingerprint !== record.severityFingerprint) return false

  return true
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
  /**
   * 已忽略的策略表：
   *  - key   = strategy.id
   *  - value = { dismissedAt, severityFingerprint }
   * severityFingerprint 是关联告警按 id 排序后拼出的严重程度串，
   * 一旦严重程度发生变化（升级/降级）即视为指纹失效，建议会重新弹出。
   * 同时超过 DISMISS_TTL_MS 后也强制失效，避免操作员遗忘。
   */
  const [dismissed, setDismissed] = useState<Map<string, DismissRecord>>(() => new Map())
  /** 最近一次语音操作高亮的控件 key，1秒后自动清除 */
  const [highlightKey, setHighlightKey] = useState<string | null>(null)
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const {
    data: dashboardData,
    updateData: updateDashboard,
    alerts: globalAlerts,
    updateAlertStatus,
    setControlAuthority,
    controlAuthority,
    robots,
    dispatchCommand,
    autoEstopEvent,
    clearAutoEstopEvent,
  } = useDashboardContext()
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

  /** 关联告警快查表，供抑制判定的指纹计算使用 */
  const alertsById = useMemo(() => {
    const map = new Map<string, { severity: string; status: string }>()
    for (const a of globalAlerts) map.set(a.id, { severity: a.severity, status: a.status })
    return map
  }, [globalAlerts])

  /**
   * 周期性触发抑制 TTL 检查：30 秒检查一次，让超过 DISMISS_TTL_MS 的记录退役。
   * 不直接修改 dismissed 状态，而是用一个 tick 数让 movementStrategy useMemo 重算。
   */
  const [, setSuppressionTick] = useState(0)
  useEffect(() => {
    const timer = window.setInterval(() => setSuppressionTick((n) => n + 1), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  const movementStrategy = useMemo(() => {
    if (!merged) return null

    // 急停期间不推送行进策略：机器人已停下，操作员注意力应在恢复急停上，
    // 此时弹卡片只会干扰决策。控制权恢复（controlAuthority 切回非 emergency）后自然重算。
    if (controlAuthority === 'emergency' || merged.robot?.status === 'emergency') return null

    const strategy = deriveMovementStrategy(merged.mission, globalAlerts)
    if (!strategy) return null
    if (isStrategySuppressed(strategy, dismissed, alertsById, Date.now())) return null
    return strategy
  }, [controlAuthority, dismissed, alertsById, globalAlerts, merged])

  /* ── 从全局告警列表派生 Command 页事件流 ── */
  const derivedEvents = useMemo(() => {
    if (!merged) return []
    const segmentId = merged.mission.segmentId

    // 过滤当前区段告警，转换为 CommandEvent 格式
    return globalAlerts
      .filter((a) => a.segmentId === segmentId)
      .slice(0, 8)
      .map((a): CommandEvent => {
        // status 映射：AlertItem 'closed' → CommandEvent 'processing'
        const eventStatus: EventStatus =
          a.status === 'closed' ? 'processing'
          : a.status === 'acknowledged' ? 'acknowledged'
          : 'new'

        // source 根据告警标题关键词推断
        const source = a.title.includes('热像') || a.title.includes('温') ? '热成像联动'
          : a.title.includes('湿') || a.title.includes('渗') ? '视觉识别'
          : a.title.includes('通信') ? '链路监测'
          : '环境传感'

        return {
          id: `EV-${a.id.replace('AL-', '')}`,
          title: a.title,
          severity: a.severity,
          status: eventStatus,
          source,
          segmentId: a.segmentId,
          occurredAt: a.occurredAt,
          detail: a.value,
        }
      })
  }, [globalAlerts, merged])

  const handleMessage = useCallback((message: CommandRealtimeMessage) => {
    setLiveData((current) => {
      if (!current) return current
      if (message.type === 'MISSION_PATCH' && dashboardRef.current?.activeTask) return current
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

  useEffect(() => {
    const robot = robots.find((item) => item.id === robotId)
    if (!robot) return
    setLiveData((current) => {
      if (!current) return current
      return {
        ...current,
        robot: mergeRobotFromContext(current.robot, robot),
        mission: {
          ...current.mission,
          segmentId: robot.segmentId,
          tunnelSection: `${SEGMENT_LABELS[robot.segmentId] ?? robot.segmentId} 巡检段`,
          status: robot.status === 'emergency'
            ? 'attention'
            : robot.status === 'idle'
              ? current.mission.status === 'paused' ? 'paused' : 'queued'
              : current.mission.status,
        },
      }
    })
  }, [robotId, robots])

  useRealtimeCommandCenter(merged, handleMessage)

  const switchRobot = useCallback((id: string) => {
    setRobotId(id)
    setLiveData(null)
    setDockState(null)
  }, [])

  /* ── Control functions (existing) ── */

  const updateMode = useCallback((mode: CommandMode) => {
    setDockState((c) => (c ? { ...c, driveMode: mode } : c))
    setControlAuthority(mode)
  }, [setControlAuthority])

  const toggleControl = useCallback((key: 'lightOn' | 'stabilizationOn' | 'recording') => {
    setDockState((c) => (c ? { ...c, [key]: !c[key] } : c))
  }, [])

  /* ── 注册键盘快捷键回调（L/R 控制灯光/录制） ── */
  useEffect(() => {
    registerCommandToggle((key) => toggleControl(key))
    return () => unregisterCommandToggle()
  }, [toggleControl])

  const setControlOn = useCallback((key: 'lightOn' | 'stabilizationOn' | 'recording', value: boolean) => {
    setDockState((c) => (c ? { ...c, [key]: value } : c))
  }, [])

  const triggerAction = useCallback((label: string) => {
    if (label === '暂停巡检') {
      const isPaused = merged?.mission.status === 'paused'
      dispatchCommand({
        id: `cmd-${isPaused ? 'resume' : 'pause'}-${Date.now()}`,
        action: isPaused ? 'continue' : 'stop',
        issuedAt: new Date().toISOString(),
        auto: false,
      }, robotId)
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
      // 急停态判定：任一条件成立即视为已处于急停。
      // 这样无论是手动急停（修改 mission.status）、自动急停（修改 robot.status / controlAuthority）
      // 还是两者混合，都能正确切换至"恢复"动作，不再需要点两次。
      const isStopped =
        merged?.mission.status === 'attention'
        || controlAuthority === 'emergency'
        || merged?.robot?.status === 'emergency'

      dispatchCommand({
        id: `cmd-${isStopped ? 'recover' : 'estop'}-${Date.now()}`,
        action: isStopped ? 'continue' : 'emergency-stop',
        issuedAt: new Date().toISOString(),
        auto: false,
      }, robotId)

      // 恢复路径下顺手清除自动急停事件横幅（如有）
      if (isStopped) {
        clearAutoEstopEvent()
      }

      setLiveData((c) => {
        if (!c) return c
        // 复位时控制权回到 dock 的驱动模式（默认 semi-auto），急停时切到 emergency
        setControlAuthority(isStopped ? (dockState?.driveMode ?? c.control.driveMode) : 'emergency')
        updateDashboard((d) => {
          if (!d.activeTask) return d
          return { ...d, activeTask: { ...d.activeTask, status: isStopped ? 'running' : 'paused' } }
        })
        return { ...c, mission: { ...c.mission, status: isStopped ? 'running' : 'attention' } }
      })
      return
    }
  }, [clearAutoEstopEvent, controlAuthority, dispatchCommand, dockState?.driveMode, merged?.mission.status, merged?.robot?.status, robotId, setControlAuthority, updateDashboard])

  const confirmMovementStrategy = useCallback((strategy: MovementStrategySuggestion) => {
    // 注意：不再在确认时立即写 dismissed。卡片自身管理 pending → executing → done 三态，
    // 抵达 done 后会通过 onDismiss 回调把记录写入 dismissed Map。
    dispatchCommand(commandFromStrategy(strategy), robotId)

    if (strategy.action === 'stop') {
      setLiveData((current) => {
        if (!current) return current
        return { ...current, mission: { ...current.mission, status: 'paused' } }
      })
      updateDashboard((dashboard) => {
        if (!dashboard.activeTask) return dashboard
        return { ...dashboard, activeTask: { ...dashboard.activeTask, status: 'paused' } }
      })
      flashHighlight('pause')
      return
    }

    if (strategy.action === 'slow') {
      setDockState((control) => {
        if (!control) return control
        return { ...control, speedLevel: 1 }
      })
      flashHighlight('speed')
      return
    }

    if (strategy.action === 'takeover') {
      updateMode('manual')
      flashHighlight('mode')
    }
  }, [dispatchCommand, flashHighlight, robotId, updateDashboard, updateMode])

  const dismissMovementStrategy = useCallback((strategy: MovementStrategySuggestion) => {
    setDismissed((prev) => {
      const next = new Map(prev)
      next.set(strategy.id, {
        dismissedAt: Date.now(),
        severityFingerprint: buildSeverityFingerprint(strategy.sourceAlertIds, alertsById),
      })
      return next
    })
  }, [alertsById])

  const viewMovementStrategyAlerts = useCallback((strategy: MovementStrategySuggestion) => {
    const firstAlertId = strategy.sourceAlertIds[0]
    navigate(firstAlertId ? `/alerts?id=${firstAlertId}` : '/alerts')
  }, [navigate])

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
  useRegisterVoiceKeys(voice)

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

          {/* 自动急停提示横幅：当 DashboardContext 检测到自动急停事件时显示 */}
          {autoEstopEvent && (
            <AutoEstopBanner
              event={autoEstopEvent}
              onRecover={() => {
                // 走与"急停按钮恢复"完全一致的路径，复用所有状态复位逻辑
                triggerAction('急停')
              }}
              onDismiss={clearAutoEstopEvent}
            />
          )}

          {/* Voice dock — inline at video bottom, not a full overlay */}
          {voiceOpen && (
            <CommandVoiceDock
              voice={voice}
              onClose={() => setVoiceOpen(false)}
            />
          )}

          {!voiceOpen && movementStrategy && (
            <MovementStrategyCard
              strategy={movementStrategy}
              robot={merged.robot}
              controlAuthority={controlAuthority}
              onConfirm={confirmMovementStrategy}
              onDismiss={dismissMovementStrategy}
              onViewAlerts={viewMovementStrategyAlerts}
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
            events={derivedEvents}
            activeAux={activeAux}
            onToggleAux={toggleAux}
            onAcknowledgeEvent={(eventId) => {
              // 事件 ID 格式 "EV-301" → 告警 ID "AL-301"
              const alertId = `AL-${eventId.replace('EV-', '')}`
              updateAlertStatus(alertId, 'acknowledged')
            }}
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
