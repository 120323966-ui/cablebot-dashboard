/**
 * DashboardContext — 全局巡检数据上下文
 *
 * 解决的问题：之前 liveData 存在 HomeOverviewPage 组件内部，
 * 切换页面后组件卸载、数据丢失、进度重置。
 *
 * 现在数据提升到 ShellLayout 层级的 Context 中，
 * 整个应用生命周期内持续运行，只有刷新浏览器才会重置。
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { applyRealtime, useRealtimeDashboard } from '@/hooks/useRealtimeDashboard'
import type { HomeOverviewResponse, RealtimeMessage } from '@/types/dashboard'

/* ── Context shape ── */

interface DashboardContextValue {
  /** 合并了初始数据和实时更新的最新数据 */
  data: HomeOverviewResponse | null
  loading: boolean
  error: string | null
  /** 用于语音指令等外部操作直接修改数据 */
  updateData: (updater: (current: HomeOverviewResponse) => HomeOverviewResponse) => void
}

const DashboardContext = createContext<DashboardContextValue | null>(null)

/* ── Provider ── */

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [initialData, setInitialData] = useState<HomeOverviewResponse | null>(null)
  const [liveData, setLiveData] = useState<HomeOverviewResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const fetchedRef = useRef(false)

  /* ── 首次加载（只请求一次） ── */
  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true

    async function run() {
      try {
        const res = await fetch('/api/dashboard/home')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = (await res.json()) as HomeOverviewResponse
        setInitialData(data)
        setLiveData(data)
        setLoading(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载失败')
        setLoading(false)
      }
    }

    void run()
  }, [])

  /* ── 实时消息处理 ── */
  const merged = useMemo(() => liveData ?? initialData, [liveData, initialData])

  const handleMessage = useCallback(
    (message: RealtimeMessage) => {
      setLiveData((current) => {
        if (!current) return current
        return applyRealtime(current, message)
      })
    },
    [],
  )

  // 实时模拟定时器——在 Context 层级运行，不受页面切换影响
  useRealtimeDashboard(merged, handleMessage)

  /* ── 外部更新接口（供语音指令等使用） ── */
  const updateData = useCallback(
    (updater: (current: HomeOverviewResponse) => HomeOverviewResponse) => {
      setLiveData((current) => {
        if (!current) return current
        return updater(current)
      })
    },
    [],
  )

  const value = useMemo<DashboardContextValue>(
    () => ({
      data: merged,
      loading,
      error,
      updateData,
    }),
    [merged, loading, error, updateData],
  )

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  )
}

/* ── Hook ── */

export function useDashboardContext() {
  const ctx = useContext(DashboardContext)
  if (!ctx) {
    throw new Error('useDashboardContext must be used within DashboardProvider')
  }
  return ctx
}
