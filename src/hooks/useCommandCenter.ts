import { useEffect, useState } from 'react'
import type { CommandCenterResponse } from '@/types/command'

interface State {
  data: CommandCenterResponse | null
  loading: boolean
  error: string | null
}

export function useCommandCenter(robotId = 'R1') {
  const [state, setState] = useState<State>({ data: null, loading: true, error: null })

  useEffect(() => {
    let active = true
    setState((s) => ({ ...s, loading: true }))

    async function run() {
      try {
        const res = await fetch(`/api/dashboard/command?robotId=${robotId}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = (await res.json()) as CommandCenterResponse
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
    return () => { active = false }
  }, [robotId])

  return state
}
