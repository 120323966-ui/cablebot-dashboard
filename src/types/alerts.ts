import type { AlertItem, Severity } from './dashboard'

/** 告警处置页 API 响应 */
export interface AlertsPageResponse {
  alerts: AlertItem[]
  history: SegmentAlertHistory[]
  segments: string[]
}

/** 同区段近期告警统计 */
export interface SegmentAlertHistory {
  segmentId: string
  recent7d: number
  recent30d: number
  topType: string
  trend: 'up' | 'down' | 'steady'
}

/** 处置备注 */
export interface AlertNote {
  alertId: string
  text: string
  operator: string
  createdAt: string
}

/** 筛选条件 */
export interface AlertFilters {
  severity: Severity | 'all'
  status: AlertItem['status'] | 'all'
  segmentId: string | 'all'
}
