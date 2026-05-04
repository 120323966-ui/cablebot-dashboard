import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SpatialPageResponse, RobotOnMap } from '@/types/spatial'
import { useDashboardContext } from '@/context/useDashboardContext'
import type { RobotSnapshot } from '@/mocks/data/sharedSeed'

interface SpatialState {
  data: Omit<SpatialPageResponse, 'robots'> | null
  loading: boolean
  error: string | null
}

function toMapRobot(robot: RobotSnapshot): RobotOnMap {
  return {
    id: robot.id,
    name: robot.name,
    segmentId: robot.segmentId,
    progress: robot.progress,
    direction: robot.direction,
    batteryPct: robot.batteryPct,
    speedKmh: robot.speedKmh,
    status: robot.status,
  }
}

export function useSpatial() {
  const [state, setState] = useState<SpatialState>({ data: null, loading: true, error: null })
  const { robots, dispatchCommand } = useDashboardContext()

  useEffect(() => {
    let active = true
    async function run() {
      try {
        const res = await fetch('/api/dashboard/spatial')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = (await res.json()) as SpatialPageResponse
        const rest: Omit<SpatialPageResponse, 'robots'> = {
          nodes: data.nodes,
          segments: data.segments,
          alerts: data.alerts,
          sensors: data.sensors,
        }
        if (active) setState({ data: rest, loading: false, error: null })
      } catch (error) {
        if (active) setState({ data: null, loading: false, error: error instanceof Error ? error.message : '加载失败' })
      }
    }
    void run()
    return () => { active = false }
  }, [])

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
    dispatchCommand({
      id: `spatial-status-${robotId}-${Date.now()}`,
      action: status === 'idle' ? 'stop' : status === 'emergency' ? 'emergency-stop' : 'continue',
      payload: status === 'inspecting' ? { speedKmh: 1.2 } : status === 'moving' ? { speedKmh: 0.8 } : undefined,
      issuedAt: new Date().toISOString(),
      auto: false,
    }, robotId)
  }, [dispatchCommand])

  const moveRobotToSegment = useCallback((robotId: string, segmentId: string) => {
    dispatchCommand({
      id: `spatial-move-${robotId}-${Date.now()}`,
      action: 'move-to',
      payload: { targetSegmentId: segmentId },
      issuedAt: new Date().toISOString(),
      auto: false,
    }, robotId)
  }, [dispatchCommand])

  const updateRobotSpeed = useCallback((robotId: string, speedKmh: number) => {
    dispatchCommand({
      id: `spatial-speed-${robotId}-${Date.now()}`,
      action: 'slow',
      payload: { speedKmh },
      issuedAt: new Date().toISOString(),
      auto: false,
    }, robotId)
  }, [dispatchCommand])

  const data = useMemo<SpatialPageResponse | null>(() => {
    if (!state.data) return null
    return {
      ...state.data,
      robots: robots.map(toMapRobot),
    }
  }, [robots, state.data])

  return {
    data,
    loading: state.loading,
    error: state.error,
    selectedSegment,
    selectedRobot,
    selectSegment,
    selectRobot,
    updateRobotStatus,
    moveRobotToSegment,
    updateRobotSpeed,
  }
}
