import { useEffect, useState } from 'react'
import type { HomeOverviewResponse } from '@/types/dashboard'

interface State {
  data: HomeOverviewResponse | null
  loading: boolean
  error: string | null
}

export function useDashboardHome() {
  const [state, setState] = useState<State>({ data: null, loading: true, error: null })

  useEffect(() => {
    let active = true

    async function run() {
      try {
        const res = await fetch('/api/dashboard/home')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = (await res.json()) as HomeOverviewResponse
        if (active) setState({ data, loading: false, error: null })
      } catch (error) {
        if (active) {
          setState({
            data: null,
            loading: false,
            error: error instanceof Error ? error.message : '加载失败',
          })
        }
      }
    }

    void run()
    return () => {
      active = false
    }
  }, [])

  return state
}
