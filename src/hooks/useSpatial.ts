import { useCallback, useEffect, useState } from 'react'
import type { SpatialPageResponse, RobotOnMap } from '@/types/spatial'
import { useDashboardContext } from '@/context/useDashboardContext'

interface SpatialState {
  data: SpatialPageResponse | null
  loading: boolean
  error: string | null
}

/**
 * Command 页当前操控的机器人 ID。useCommandCenter 默认 'R1',
 * 二者保持一致。如果未来 Command 页支持切换焦点机器人,这里
 * 应改为从 Context 读取焦点 ID。
 */
const COMMAND_FOCUS_ROBOT_ID = 'R1'

export function useSpatial() {
  const [state, setState] = useState<SpatialState>({ data: null, loading: true, error: null })
  const hasData = Boolean(state.data)

  /* 订阅全局任务/控制权状态:
     - controlAuthority === 'emergency'   → 焦点机器人立即停止
     - activeTask.status === 'paused'     → 焦点机器人暂停推进
     - activeTask.status === 'completed'  → 焦点机器人转为 idle
     注意:这些信号只影响 COMMAND_FOCUS_ROBOT_ID 对应的机器人,
     其它机器人不受 Command 页操作影响。 */
  const { controlAuthority, data: dashboardData } = useDashboardContext()
  const activeTaskStatus = dashboardData?.activeTask?.status

  useEffect(() => {
    let active = true
    async function run() {
      try {
        const res = await fetch('/api/dashboard/spatial')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = (await res.json()) as SpatialPageResponse
        if (active) setState({ data, loading: false, error: null })
      } catch (error) {
        if (active) setState({ data: null, loading: false, error: error instanceof Error ? error.message : '加载失败' })
      }
    }
    void run()
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!hasData) return
    const timer = window.setInterval(() => {
      setState((s) => {
        if (!s.data) return s
        const isEmergency = controlAuthority === 'emergency'
        const isPaused = activeTaskStatus === 'paused'
        const isCompleted = activeTaskStatus === 'completed'

        const nextRobots: RobotOnMap[] = s.data.robots.map((r) => {
          if (r.status === 'idle') return r

          /* 焦点机器人响应 Command 页指令 */
          const isFocus = r.id === COMMAND_FOCUS_ROBOT_ID

          if (isFocus && (isEmergency || isCompleted)) {
            /* 急停或任务完成:落到 idle, 速度归零, progress 冻结在当前位置 */
            return { ...r, status: 'idle' as const, speedKmh: 0 }
          }

          if (isFocus && isPaused) {
            /* 暂停:保持 status(让区段标记仍显示在巡检中),
               但停止推进 progress, 速度降到 0 */
            if (r.speedKmh === 0) return r
            return { ...r, speedKmh: 0 }
          }

          /* 正常推进 */
          let nextProgress = r.progress + r.direction * 0.035
          let nextDirection = r.direction
          if (nextProgress >= 1) { nextProgress = 1 - (nextProgress - 1); nextDirection = -1 as const }
          else if (nextProgress <= 0) { nextProgress = -nextProgress; nextDirection = 1 as const }
          /* 从暂停恢复时,speed 可能被压到 0,这里按 status 校准回默认值。
             用户通过 RobotControlPanel 显式调速时不应被覆盖,因此只在
             speedKmh === 0 且状态是活动态时才补回基线。 */
          const recoveredSpeed = r.speedKmh === 0
            ? (r.status === 'inspecting' ? 1.2 : r.status === 'moving' ? 0.8 : 0)
            : r.speedKmh
          return {
            ...r,
            progress: Number(nextProgress.toFixed(3)),
            direction: nextDirection,
            batteryPct: Math.max(10, r.batteryPct - 0.05),
            speedKmh: recoveredSpeed,
          }
        })
        return { ...s, data: { ...s.data, robots: nextRobots } }
      })
    }, 1500)
    return () => window.clearInterval(timer)
  }, [hasData, controlAuthority, activeTaskStatus])

  const [selectedSegment, setSelectedSegment] = useState<string | null>(null)
  const [selectedRobot, setSelectedRobot] = useState<string | null>(null)

  const selectSegment = useCallback((id: string | null) => {
    setSelectedSegment(id)
    setSelectedRobot(null)
  }, [])

  const selectRobot = useCallback((id: string | null) => {
    setSelectedRobot(id)
    setSelectedSegment(null)
  }, [])

  const updateRobotStatus = useCallback((robotId: string, status: RobotOnMap['status']) => {
    setState((s) => {
      if (!s.data) return s
      return { ...s, data: { ...s.data, robots: s.data.robots.map((r) =>
        r.id === robotId ? { ...r, status, speedKmh: status === 'idle' ? 0 : status === 'inspecting' ? 1.2 : 0.8 } : r
      )}}
    })
  }, [])

  const moveRobotToSegment = useCallback((robotId: string, segmentId: string) => {
    setState((s) => {
      if (!s.data) return s
      return { ...s, data: { ...s.data, robots: s.data.robots.map((r) =>
        r.id === robotId ? { ...r, segmentId, progress: 0.05, direction: 1 as const, status: 'moving' as const } : r
      )}}
    })
  }, [])

  const updateRobotSpeed = useCallback((robotId: string, speedKmh: number) => {
    setState((s) => {
      if (!s.data) return s
      return { ...s, data: { ...s.data, robots: s.data.robots.map((r) =>
        r.id === robotId ? { ...r, speedKmh } : r
      )}}
    })
  }, [])

  return {
    ...state,
    selectedSegment,
    selectedRobot,
    selectSegment,
    selectRobot,
    updateRobotStatus,
    moveRobotToSegment,
    updateRobotSpeed,
  }
}
