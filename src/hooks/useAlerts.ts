/**
 * useAlerts — 告警处置页数据 hook
 *
 * v2: 不再独立请求或维护定时器，所有数据来自 DashboardContext。
 * 这样首页、告警页、Command 页看到同一份告警，状态修改全局同步。
 */

import { useDashboardContext } from '@/context/DashboardContext'
import type { AlertItem } from '@/types/dashboard'

export function useAlerts() {
  const {
    alerts,
    alertHistory: history,
    alertSegments: segments,
    loading,
    error,
    updateAlertStatus,
  } = useDashboardContext()

  return {
    alerts,
    history,
    segments,
    loading,
    error,
    updateAlertStatus: (alertId: string, status: AlertItem['status']) => {
      updateAlertStatus(alertId, status)
    },
  }
}
