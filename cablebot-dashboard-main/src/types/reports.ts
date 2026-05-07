import type { HistoryPageResponse } from './history'

/** 报告配置 */
export interface ReportConfig {
  title: string
  author: string
  remark: string
  timeRange: '7d' | '30d'
  modules: {
    executiveSummary: boolean
    alertCharts: boolean
    segmentRisk: boolean
    inspectionTable: boolean
  }
}

/** 导出状态 */
export type ExportStatus = 'idle' | 'generating' | 'success' | 'error'

/* ═══════════════════════════════════════════════════
   分析文字结构
   ═══════════════════════════════════════════════════ */

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

/** 执行摘要 */
export interface ExecutiveSummary {
  overallLevel: RiskLevel
  overallStatement: string
  keyFindings: string[]
  dataOverview: string
}

/** 趋势分析 */
export interface TrendAnalysis {
  trendDirection: 'up' | 'down' | 'stable'
  trendStatement: string
  peakDate: string
  peakCount: number
  alertTypeRanking: { type: string; count: number; pct: string }[]
}

/** 区段评估 */
export interface SegmentAssessment {
  segmentId: string
  riskLevel: RiskLevel
  avgRisk: number
  alertCount: number
  topAlertType: string
  narrative: string
  suggestion: string
}

/** 运维建议 */
export interface Recommendation {
  priority: 'urgent' | 'suggested' | 'routine'
  content: string
}

/** 完整分析结果 */
export interface ReportAnalysis {
  executive: ExecutiveSummary
  trend: TrendAnalysis
  segments: SegmentAssessment[]
  recommendations: Recommendation[]
}

/** 报告页 API 响应 */
export interface ReportsPageResponse {
  raw: HistoryPageResponse
  analysis: ReportAnalysis
}
