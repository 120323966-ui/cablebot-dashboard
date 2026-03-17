import { useCallback, useEffect, useRef, useState } from 'react'
import { createRealtimeAlertForPage } from '@/mocks/data/alerts'
import type { AlertItem } from '@/types/dashboard'
import type { AlertsPageResponse, SegmentAlertHistory } from '@/types/alerts'

interface AlertsState {
  alerts: AlertItem[]
  history: SegmentAlertHistory[]
  segments: string[]
  loading: boolean
  error: string | null
}

export function useAlerts() {
  const [state, setState] = useState<AlertsState>({
    alerts: [],
    history: [],
    segments: [],
    loading: true,
    error: null,
  })

  /* ---- Initial fetch ---- */
  useEffect(() => {
    let active = true
    async function run() {
      try {
        const res = await fetch('/api/dashboard/alerts')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = (await res.json()) as AlertsPageResponse
        if (active)
          setState({
            alerts: data.alerts,
            history: data.history,
            segments: data.segments,
            loading: false,
            error: null,
          })
      } catch (error) {
        if (active)
          setState((s) => ({
            ...s,
            loading: false,
            error: error instanceof Error ? error.message : '加载失败',
          }))
      }
    }
    void run()
    return () => { active = false }
  }, [])

  /* ---- Realtime: push new alerts every ~8s ---- */
  const alertsRef = useRef(state.alerts)
  useEffect(() => { alertsRef.current = state.alerts }, [state.alerts])

  useEffect(() => {
    if (state.loading) return

    const timer = window.setInterval(() => {
      const newAlert = createRealtimeAlertForPage()
      setState((s) => ({
        ...s,
        alerts: [newAlert, ...s.alerts].slice(0, 50),
      }))
    }, 8_000)

    return () => window.clearInterval(timer)
  }, [state.loading])

  /* ---- Actions ---- */
  const updateAlertStatus = useCallback(
    (alertId: string, status: AlertItem['status']) => {
      setState((s) => ({
        ...s,
        alerts: s.alerts.map((a) =>
          a.id === alertId ? { ...a, status } : a,
        ),
      }))
    },
    [],
  )

  return { ...state, updateAlertStatus }
}
