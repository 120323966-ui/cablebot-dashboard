import { useCallback, useEffect, useState } from 'react'
import type { HistoryPageResponse, TimeRange } from '@/types/history'

interface HistoryState {
  data: HistoryPageResponse | null
  loading: boolean
  error: string | null
  range: TimeRange
}

export function useHistory() {
  const [state, setState] = useState<HistoryState>({
    data: null,
    loading: true,
    error: null,
    range: '7d',
  })

  const fetchData = useCallback(async (range: TimeRange) => {
    setState((s) => ({ ...s, loading: true, error: null, range }))
    try {
      const days = range === '7d' ? 7 : 30
      const res = await fetch(`/api/dashboard/history?days=${days}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as HistoryPageResponse
      setState({ data, loading: false, error: null, range })
    } catch (error) {
      setState((s) => ({
        ...s,
        loading: false,
        error: error instanceof Error ? error.message : '加载失败',
      }))
    }
  }, [])

  useEffect(() => {
    void fetchData(state.range)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setRange = useCallback(
    (range: TimeRange) => {
      void fetchData(range)
    },
    [fetchData],
  )

  return { ...state, setRange }
}
