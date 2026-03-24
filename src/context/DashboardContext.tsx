/**
 * DashboardContext — 全局巡检数据上下文
 *
 * 解决的问题：之前 liveData 存在 HomeOverviewPage 组件内部，
 * 切换页面后组件卸载、数据丢失、进度重置。
 *
 * 现在数据提升到 ShellLayout 层级的 Context 中，
 * 整个应用生命周期内持续运行，只有刷新浏览器才会重置。
 *
 * v2: 告警数据也提升到全局，三个页面共享同一份告警列表。
 *     唯一的告警生成定时器在 useRealtimeDashboard 中。
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
import type { AlertItem, HomeOverviewResponse, RealtimeMessage } from '@/types/dashboard'
import type { SegmentAlertHistory } from '@/types/alerts'

/* ── Context shape ── */

interface DashboardContextValue {
  /** 合并了初始数据和实时更新的最新数据 */
  data: HomeOverviewResponse | null
  loading: boolean
  error: string | null
  /** 用于语音指令等外部操作直接修改数据 */
  updateData: (updater: (current: HomeOverviewResponse) => HomeOverviewResponse) => void

  /* ── 全局告警管理（跨页同步） ── */

  /** 全量告警列表（首页、告警处置页、Command 页共享） */
  alerts: AlertItem[]
  /** 告警处置页额外数据：区段历史统计 */
  alertHistory: SegmentAlertHistory[]
  /** 告警处置页额外数据：区段 ID 列表（筛选下拉用） */
  alertSegments: string[]
  /** 修改单条告警状态（确认/关闭），全页面同步 */
  updateAlertStatus: (alertId: string, status: AlertItem['status']) => void

  /* ── 全局视觉通知 ── */

  /** 最新一条待弹出的告警（仅 critical/warning），null 表示无通知 */
  latestNewAlert: AlertItem | null
  /** 关闭当前通知 */
  dismissLatestAlert: () => void
}

const DashboardContext = createContext<DashboardContextValue | null>(null)

/* ── Provider ── */

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [initialData, setInitialData] = useState<HomeOverviewResponse | null>(null)
  const [liveData, setLiveData] = useState<HomeOverviewResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const fetchedRef = useRef(false)

  /* ── 告警专属状态（全量列表，不受首页 top-10 截断） ── */
  const [alertsFull, setAlertsFull] = useState<AlertItem[]>([])
  const [alertHistory, setAlertHistory] = useState<SegmentAlertHistory[]>([])
  const [alertSegments, setAlertSegments] = useState<string[]>([])

  /* ── 全局视觉通知状态 ── */
  const [latestNewAlert, setLatestNewAlert] = useState<AlertItem | null>(null)
  /* ── 首次加载（只请求一次，同时拉首页 + 告警页数据） ── */
  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true

    async function run() {
      try {
        const [homeRes, alertsRes] = await Promise.all([
          fetch('/api/dashboard/home'),
          fetch('/api/dashboard/alerts'),
        ])
        if (!homeRes.ok) throw new Error(`HTTP ${homeRes.status}`)
        if (!alertsRes.ok) throw new Error(`Alerts HTTP ${alertsRes.status}`)

        const homeData = (await homeRes.json()) as HomeOverviewResponse
        const alertsData = (await alertsRes.json()) as {
          alerts: AlertItem[]
          history: SegmentAlertHistory[]
          segments: string[]
        }

        setInitialData(homeData)
        setLiveData(homeData)

        // 初始化全量告警：取告警页数据（更完整，含 history/segments）
        setAlertsFull(alertsData.alerts)
        setAlertHistory(alertsData.history)
        setAlertSegments(alertsData.segments)

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
      if (message.type === 'ALERT_NEW') {
        // 新告警同时写入全量列表（告警处置页和 Command 页同步可见）
        setAlertsFull((prev) => {
          const next = [message.payload, ...prev]
            .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
            .slice(0, 50)
          return next
        })

        // 视觉通知：critical / warning 级别触发 Toast
        if (message.payload.severity !== 'info') {
          setLatestNewAlert(message.payload)
        }
      }

      // 首页数据照常更新（alerts 字段保留 top-10）
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

  /* ── 告警状态更新（跨页同步核心） ── */
  const updateAlertStatus = useCallback(
    (alertId: string, status: AlertItem['status']) => {
      // 1. 更新全量告警列表
      setAlertsFull((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, status } : a)),
      )

      // 2. 同步更新首页 liveData 中的 alerts
      setLiveData((current) => {
        if (!current) return current
        return {
          ...current,
          alerts: current.alerts.map((a) =>
            a.id === alertId ? { ...a, status } : a,
          ),
        }
      })
    },
    [],
  )

  /* ── 关闭视觉通知 ── */
  const dismissLatestAlert = useCallback(() => {
    setLatestNewAlert(null)
  }, [])

  const value = useMemo<DashboardContextValue>(
    () => ({
      data: merged,
      loading,
      error,
      updateData,
      alerts: alertsFull,
      alertHistory,
      alertSegments,
      updateAlertStatus,
      latestNewAlert,
      dismissLatestAlert,
    }),
    [merged, loading, error, updateData, alertsFull, alertHistory, alertSegments, updateAlertStatus, latestNewAlert, dismissLatestAlert],
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
