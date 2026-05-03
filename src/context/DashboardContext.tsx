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
 *
 * v3: 新增重复告警抑制机制。
 *     同一 groupKey 在预设时间窗口内重复到达时，不新增条目，
 *     而是归并到已有告警上（更新 repeatCount / latestEvidence /
 *     latestOccurredAt），同时抑制 Toast 和 TTS 通知。
 *     当超过时间窗口或严重程度升高时恢复通知。
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { applyRealtime, useRealtimeDashboard } from '@/hooks/useRealtimeDashboard'
import { announceAlert } from '@/utils/voiceAudio'
import type { AlertItem, HomeOverviewResponse, RealtimeMessage, Severity } from '@/types/dashboard'
import type { SegmentAlertHistory } from '@/types/alerts'
import {
  DashboardContext,
  SEVERITY_WEIGHT,
  type ControlAuthority,
  type DashboardContextValue,
} from './dashboardContextCore'

/* ── 重复告警抑制配置 ── */

/** 抑制时间窗口（毫秒），同一 groupKey 在此窗口内不重复通知 */
const SUPPRESSION_WINDOW_MS = 60_000

/** 抑制映射表中每个 groupKey 对应的记录 */
interface SuppressionRecord {
  /** 最近一次实际通知（弹窗/播报）的时间戳 */
  lastNotifiedAt: number
  /** 最近一次通知时的严重程度 */
  lastSeverity: Severity
}

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
  const [controlAuthority, setControlAuthority] = useState<ControlAuthority>('semi-auto')

  /* ── 重复告警抑制映射表（不需要触发渲染，用 ref） ── */
  const suppressionMapRef = useRef<Map<string, SuppressionRecord>>(new Map())

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
        setControlAuthority(homeData.activeTask?.mode ?? 'semi-auto')

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
        const incoming = message.payload
        const now = Date.now()
        const groupKey = incoming.groupKey

        // ── 重复告警抑制判断 ──
        if (groupKey) {
          const map = suppressionMapRef.current
          const record = map.get(groupKey)

          if (record) {
            const elapsed = now - record.lastNotifiedAt
            const severityEscalated =
              SEVERITY_WEIGHT[incoming.severity] > SEVERITY_WEIGHT[record.lastSeverity]

            if (elapsed < SUPPRESSION_WINDOW_MS && !severityEscalated) {
              // ── 命中抑制：归并到已有告警，不新增条目，不通知 ──
              setAlertsFull((prev) => {
                const idx = prev.findIndex((a) => a.groupKey === groupKey && a.status !== 'closed')
                if (idx === -1) {
                  // 没找到可归并目标，回退到正常新增
                  return [incoming, ...prev].slice(0, 50)
                }
                const existing = prev[idx]
                const updated: AlertItem = {
                  ...existing,
                  repeatCount: (existing.repeatCount ?? 1) + 1,
                  latestEvidence: incoming.evidence,
                  latestOccurredAt: incoming.occurredAt,
                }
                const next = [...prev]
                next[idx] = updated
                return next
              })

              // 首页 liveData 中的 alerts 也做同步归并
              setLiveData((current) => {
                if (!current) return current
                const idx = current.alerts.findIndex(
                  (a) => a.groupKey === groupKey && a.status !== 'closed',
                )
                if (idx === -1) return current
                const existing = current.alerts[idx]
                const updated: AlertItem = {
                  ...existing,
                  repeatCount: (existing.repeatCount ?? 1) + 1,
                  latestEvidence: incoming.evidence,
                  latestOccurredAt: incoming.occurredAt,
                }
                const nextAlerts = [...current.alerts]
                nextAlerts[idx] = updated
                return {
                  ...current,
                  meta: { ...current.meta, updatedAt: new Date().toISOString() },
                  alerts: nextAlerts,
                }
              })

              // 抑制：不触发 Toast，不触发 TTS，直接返回
              return
            }

            // ── 超出时间窗口 或 严重程度升高：恢复通知 ──
            map.set(groupKey, { lastNotifiedAt: now, lastSeverity: incoming.severity })
          } else {
            // ── 首次出现该 groupKey：记录并正常通知 ──
            map.set(groupKey, { lastNotifiedAt: now, lastSeverity: incoming.severity })
          }

          // 定期清理过期记录（避免内存泄漏）
          if (map.size > 100) {
            for (const [k, v] of map) {
              if (now - v.lastNotifiedAt > SUPPRESSION_WINDOW_MS * 3) map.delete(k)
            }
          }
        }

        // ── 正常路径：新增告警条目 + 触发通知 ──

        // 设置初始 repeatCount
        const alertWithCount: AlertItem = { ...incoming, repeatCount: 1 }

        setAlertsFull((prev) => {
          const next = [alertWithCount, ...prev]
            .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
            .slice(0, 50)
          return next
        })

        // 视觉通知：critical / warning 级别触发 Toast
        if (incoming.severity !== 'info') {
          setLatestNewAlert(alertWithCount)
        }

        // TTS 播报（从 useRealtimeDashboard 移至此处，由抑制逻辑统一管控）
        announceAlert(incoming.title, incoming.severity, incoming.segmentId)
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
      controlAuthority,
      setControlAuthority,
    }),
    [merged, loading, error, updateData, alertsFull, alertHistory, alertSegments, updateAlertStatus, latestNewAlert, dismissLatestAlert, controlAuthority],
  )

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  )
}
