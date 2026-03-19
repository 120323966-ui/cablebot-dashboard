import { useCallback, useEffect, useState } from 'react'
import type { SpatialPageResponse, RobotOnMap } from '@/types/spatial'

interface SpatialState {
  data: SpatialPageResponse | null
  loading: boolean
  error: string | null
}

export function useSpatial() {
  const [state, setState] = useState<SpatialState>({ data: null, loading: true, error: null })

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
    if (!state.data) return
    const timer = window.setInterval(() => {
      setState((s) => {
        if (!s.data) return s
        const nextRobots: RobotOnMap[] = s.data.robots.map((r) => {
          if (r.status === 'idle') return r
          let nextProgress = r.progress + r.direction * 0.035
          let nextDirection = r.direction
          if (nextProgress >= 1) { nextProgress = 1 - (nextProgress - 1); nextDirection = -1 as const }
          else if (nextProgress <= 0) { nextProgress = -nextProgress; nextDirection = 1 as const }
          return { ...r, progress: Number(nextProgress.toFixed(3)), direction: nextDirection, batteryPct: Math.max(10, r.batteryPct - 0.05) }
        })
        return { ...s, data: { ...s.data, robots: nextRobots } }
      })
    }, 1500)
    return () => window.clearInterval(timer)
  }, [Boolean(state.data)])

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
