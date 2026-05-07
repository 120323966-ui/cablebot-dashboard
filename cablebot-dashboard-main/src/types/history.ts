/** 时间范围 */
export type TimeRange = '7d' | '30d' | 'custom'

/** 每日统计 */
export interface DailyStat {
  date: string // YYYY-MM-DD
  critical: number
  warning: number
  info: number
  inspections: number
}

/** 区段日风险值 */
export interface SegmentDailyRisk {
  date: string
  segmentId: string
  risk: number
}

/** 告警类型统计 */
export interface AlertTypeCount {
  type: string
  count: number
}

/** 区段汇总 */
export interface SegmentSummary {
  segmentId: string
  alertCount: number
  inspectionCount: number
  avgRisk: number
  topAlertType: string
}

/** 告警明细记录 */
export interface AlertRecord {
  id: string
  date: string
  segmentId: string
  type: string
  severity: 'critical' | 'warning' | 'info'
}

/** 巡检记录 */
export interface InspectionRecord {
  id: string
  date: string
  segmentId: string
  robotName: string
  mode: 'auto' | 'semi-auto' | 'manual'
  checksDone: number
  checksTotal: number
  alertsFound: number
  durationMinutes: number
  status: 'completed' | 'aborted' | 'partial'
}

/** 历史分析页 API 响应 */
export interface HistoryPageResponse {
  dailyStats: DailyStat[]
  segmentRisks: SegmentDailyRisk[]
  alertTypes: AlertTypeCount[]
  segmentSummaries: SegmentSummary[]
  alertRecords: AlertRecord[]
  inspections: InspectionRecord[]
  totalInspections: number
  totalAlerts: number
  avgHandleMinutes: number
  coveragePct: number
}
