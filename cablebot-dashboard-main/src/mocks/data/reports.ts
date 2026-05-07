import { createHistoryPageMock } from './history'
import type { HistoryPageResponse } from '@/types/history'
import type {
  ExecutiveSummary,
  Recommendation,
  ReportsPageResponse,
  RiskLevel,
  SegmentAssessment,
  TrendAnalysis,
} from '@/types/reports'

/* ═══════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════ */

function riskLevel(v: number): RiskLevel {
  if (v >= 0.7) return 'critical'
  if (v >= 0.5) return 'high'
  if (v >= 0.3) return 'medium'
  return 'low'
}

function riskLabel(l: RiskLevel) {
  const map: Record<RiskLevel, string> = {
    critical: '严重',
    high: '偏高',
    medium: '中等',
    low: '良好',
  }
  return map[l]
}

function pct(n: number, total: number) {
  return total === 0 ? '0' : ((n / total) * 100).toFixed(1)
}

function rangeLabel(days: number) {
  return days <= 7 ? '近 7 天' : '近 30 天'
}

/* ═══════════════════════════════════════════════════
   Executive Summary
   ═══════════════════════════════════════════════════ */

function buildExecutive(raw: HistoryPageResponse, days: number): ExecutiveSummary {
  const totalAlerts = raw.totalAlerts
  const criticalCount = raw.alertRecords.filter((a) => a.severity === 'critical').length
  const warningCount = raw.alertRecords.filter((a) => a.severity === 'warning').length

  const avgRiskAll =
    raw.segmentSummaries.reduce((s, seg) => s + seg.avgRisk, 0) / raw.segmentSummaries.length
  const overallLevel = riskLevel(avgRiskAll)

  const highRiskSegs = raw.segmentSummaries
    .filter((s) => s.avgRisk >= 0.5)
    .sort((a, b) => b.avgRisk - a.avgRisk)

  const topAlertType = [...raw.alertTypes].sort((a, b) => b.count - a.count)[0]

  /* 总体态势 */
  const overallStatement =
    overallLevel === 'critical' || overallLevel === 'high'
      ? `${rangeLabel(days)}管网整体风险等级为${riskLabel(overallLevel)}，存在 ${highRiskSegs.length} 个高风险区段，需重点关注并及时采取措施。`
      : `${rangeLabel(days)}管网运行状态${riskLabel(overallLevel)}，各区段风险指标基本处于可控范围，建议保持常规巡检频次。`

  /* 关键发现 */
  const findings: string[] = []

  if (highRiskSegs.length > 0) {
    const names = highRiskSegs.map((s) => s.segmentId).join('、')
    findings.push(
      `${names} 区段风险指数持续偏高（均值 ${(highRiskSegs[0].avgRisk * 100).toFixed(0)}+），为当前管网主要隐患来源。`,
    )
  }

  if (criticalCount > 0) {
    findings.push(
      `累计触发严重告警 ${criticalCount} 次，占总告警的 ${pct(criticalCount, totalAlerts)}%，其中 ${topAlertType?.type ?? '—'} 类型最为高发。`,
    )
  }

  const dailyAvg = (totalAlerts / days).toFixed(1)
  findings.push(`日均告警 ${dailyAvg} 条，${Number(dailyAvg) > 8 ? '高于行业基准值，建议排查告警源。' : '处于正常波动范围。'}`)

  if (raw.coveragePct < 100) {
    findings.push(`巡检覆盖率为 ${raw.coveragePct}%，部分区段存在巡检盲区，建议补充覆盖。`)
  }

  /* 数据概览 */
  const dataOverview = `${rangeLabel(days)}内共完成巡检 ${raw.totalInspections} 次，累计产生告警 ${totalAlerts} 条（严重 ${criticalCount} / 警告 ${warningCount} / 信息 ${totalAlerts - criticalCount - warningCount}），平均处置时长 ${raw.avgHandleMinutes} 分钟，巡检覆盖率 ${raw.coveragePct}%。`

  return { overallLevel, overallStatement, keyFindings: findings, dataOverview }
}

/* ═══════════════════════════════════════════════════
   Trend Analysis
   ═══════════════════════════════════════════════════ */

function buildTrend(raw: HistoryPageResponse, days: number): TrendAnalysis {
  const stats = raw.dailyStats
  const totalAlerts = raw.totalAlerts

  /* 峰值 */
  let peakIdx = 0
  let peakVal = 0
  stats.forEach((d, i) => {
    const sum = d.critical + d.warning + d.info
    if (sum > peakVal) {
      peakVal = sum
      peakIdx = i
    }
  })
  const peakDate = stats[peakIdx]?.date ?? ''

  /* 趋势方向：对比前半段 vs 后半段均值 */
  const mid = Math.floor(stats.length / 2)
  const firstHalf = stats.slice(0, mid)
  const secondHalf = stats.slice(mid)
  const avgFirst =
    firstHalf.reduce((s, d) => s + d.critical + d.warning + d.info, 0) / (firstHalf.length || 1)
  const avgSecond =
    secondHalf.reduce((s, d) => s + d.critical + d.warning + d.info, 0) / (secondHalf.length || 1)

  const ratio = avgFirst === 0 ? 1 : avgSecond / avgFirst
  const trendDirection = ratio > 1.15 ? 'up' : ratio < 0.85 ? 'down' : 'stable'

  const trendMap = { up: '呈上升趋势', down: '呈下降趋势', stable: '整体保持平稳' }
  const changeText =
    trendDirection === 'stable'
      ? '波动幅度不大'
      : `${trendDirection === 'up' ? '后半段' : '前半段'}日均告警量${trendDirection === 'up' ? '较前期上升' : '较后期偏高'} ${Math.abs(((ratio - 1) * 100)).toFixed(0)}%`

  const trendStatement = `${rangeLabel(days)}告警总量${trendMap[trendDirection]}，${changeText}。告警峰值出现在 ${peakDate}（${peakVal} 条），建议关注该时间段前后的现场作业或环境变化。`

  /* 类型排名 */
  const sorted = [...raw.alertTypes].sort((a, b) => b.count - a.count)
  const alertTypeRanking = sorted.slice(0, 5).map((t) => ({
    type: t.type,
    count: t.count,
    pct: pct(t.count, totalAlerts),
  }))

  return { trendDirection, trendStatement, peakDate, peakCount: peakVal, alertTypeRanking }
}

/* ═══════════════════════════════════════════════════
   Segment Assessment
   ═══════════════════════════════════════════════════ */

const ALERT_SUGGESTIONS: Record<string, string> = {
  热像异常: '安排红外热成像复测，重点检查电缆接头及中间接头温度。',
  '湿度/渗漏': '排查管道密封与排水系统，对渗漏点进行封堵修复。',
  气体浓度: '加强气体传感器标定，确认是否存在有害气体积聚风险。',
  结构异常: '对管道结构进行超声波检测，评估是否需要加固处理。',
  振动超标: '排查周边施工影响，对管道支撑结构进行稳定性检查。',
  积水检测: '清理排水设施，检查管道低洼段积水成因并疏通。',
  通信异常: '检查通信中继设备供电与信号链路，排除干扰源。',
  照明异常: '更换故障照明设备，确保巡检视觉覆盖不留盲区。',
}

function buildSegments(raw: HistoryPageResponse): SegmentAssessment[] {
  return raw.segmentSummaries
    .map((seg) => {
      const level = riskLevel(seg.avgRisk)
      const riskPct = (seg.avgRisk * 100).toFixed(0)

      let narrative: string
      if (level === 'critical' || level === 'high') {
        narrative = `${seg.segmentId} 区段风险指数 ${riskPct}，等级${riskLabel(level)}。累计告警 ${seg.alertCount} 条，高发类型为「${seg.topAlertType}」，需优先安排专项检修。`
      } else if (level === 'medium') {
        narrative = `${seg.segmentId} 区段风险指数 ${riskPct}，状态中等偏稳。告警 ${seg.alertCount} 条，主要为「${seg.topAlertType}」，建议维持观察并适当增加巡检。`
      } else {
        narrative = `${seg.segmentId} 区段风险指数 ${riskPct}，运行良好。告警 ${seg.alertCount} 条，保持常规巡检即可。`
      }

      const suggestion =
        ALERT_SUGGESTIONS[seg.topAlertType] ?? '保持日常巡检频次，持续监测各项指标。'

      return {
        segmentId: seg.segmentId,
        riskLevel: level,
        avgRisk: seg.avgRisk,
        alertCount: seg.alertCount,
        topAlertType: seg.topAlertType,
        narrative,
        suggestion,
      }
    })
    .sort((a, b) => b.avgRisk - a.avgRisk)
}

/* ═══════════════════════════════════════════════════
   Recommendations
   ═══════════════════════════════════════════════════ */

function buildRecommendations(
  raw: HistoryPageResponse,
  segments: SegmentAssessment[],
): Recommendation[] {
  const recs: Recommendation[] = []

  /* 紧急：高风险区段 */
  const critical = segments.filter((s) => s.riskLevel === 'critical')
  const high = segments.filter((s) => s.riskLevel === 'high')

  if (critical.length > 0) {
    recs.push({
      priority: 'urgent',
      content: `立即对 ${critical.map((s) => s.segmentId).join('、')} 区段启动专项巡检，重点排查「${critical[0].topAlertType}」相关隐患，必要时启用人工现场复核。`,
    })
  }

  if (high.length > 0) {
    recs.push({
      priority: 'urgent',
      content: `${high.map((s) => s.segmentId).join('、')} 区段风险偏高，建议 48 小时内安排二次巡检确认，避免风险进一步升级。`,
    })
  }

  /* 建议：覆盖率不足 */
  if (raw.coveragePct < 100) {
    const uncoveredGuess = segments
      .filter((s) => s.alertCount <= 2)
      .map((s) => s.segmentId)
      .slice(0, 2)
    recs.push({
      priority: 'suggested',
      content: `当前巡检覆盖率 ${raw.coveragePct}%，${uncoveredGuess.length > 0 ? uncoveredGuess.join('、') + ' 区段' : '部分区段'}巡检频次偏低，建议调整调度策略补齐盲区。`,
    })
  }

  /* 建议：处置时长 */
  if (raw.avgHandleMinutes > 12) {
    recs.push({
      priority: 'suggested',
      content: `平均告警处置时长 ${raw.avgHandleMinutes} 分钟，高于 12 分钟基准线。建议优化处置流程，缩短从告警触发到确认关闭的响应周期。`,
    })
  }

  /* 常规 */
  recs.push({
    priority: 'routine',
    content: '定期校准机器人传感器（温度、气体、湿度），确保检测数据准确性，降低误报率。',
  })
  recs.push({
    priority: 'routine',
    content: '每月生成一次完整巡检报告存档，便于纵向对比趋势变化与运维绩效评估。',
  })

  return recs
}

/* ═══════════════════════════════════════════════════
   Public API
   ═══════════════════════════════════════════════════ */

export function createReportsPageMock(days = 30): ReportsPageResponse {
  const raw = createHistoryPageMock(days)
  const executive = buildExecutive(raw, days)
  const trend = buildTrend(raw, days)
  const segments = buildSegments(raw)
  const recommendations = buildRecommendations(raw, segments)

  return {
    raw,
    analysis: { executive, trend, segments, recommendations },
  }
}
