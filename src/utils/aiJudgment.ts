import type { AlertItem } from '@/types/dashboard'
import type { AIJudgment } from '@/types/alerts'

const PIPE_GROUPS = [
  ['A1', 'A2'],
  ['B1', 'B2', 'B3'],
  ['C1', 'C2', 'C3'],
]

function neighborSegments(segmentId: string) {
  const group = PIPE_GROUPS.find((items) => items.includes(segmentId))
  if (!group) return []
  const index = group.indexOf(segmentId)
  return [
    index > 0 ? group[index - 1] : null,
    index < group.length - 1 ? group[index + 1] : null,
  ].filter((id): id is string => Boolean(id))
}

function sameType(a: AlertItem, b: AlertItem) {
  return (a.type ?? a.title) === (b.type ?? b.title)
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function buildAIJudgment(alert: AlertItem, allAlerts: AlertItem[]): AIJudgment {
  const neighbors = neighborSegments(alert.segmentId)
  const currentTime = new Date(alert.latestOccurredAt ?? alert.occurredAt).getTime()
  const timeWindowMs = 60 * 60_000

  const related = allAlerts
    .filter((item) => {
      if (item.id === alert.id || item.status === 'closed') return false
      const sameSegment = item.segmentId === alert.segmentId
      const nearSegment = neighbors.includes(item.segmentId)
      const nearTime = Math.abs(new Date(item.latestOccurredAt ?? item.occurredAt).getTime() - currentTime) <= timeWindowMs
      return sameSegment || (sameType(item, alert) && (nearSegment || nearTime))
    })
    .sort((a, b) => {
      if (a.segmentId === alert.segmentId && b.segmentId !== alert.segmentId) return -1
      if (b.segmentId === alert.segmentId && a.segmentId !== alert.segmentId) return 1
      return new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
    })
    .slice(0, 4)

  const sameSegmentCount = related.filter((item) => item.segmentId === alert.segmentId).length
  const sameTypeCount = related.filter((item) => sameType(item, alert)).length
  const relatedIds = related.map((item) => item.id)
  const typeLabel = alert.type ?? alert.title

  const summary = related.length > 0
    ? `${alert.segmentId} 区段 ${typeLabel} 与 ${related.length} 条未关闭告警存在空间或时间关联，其中同区段 ${sameSegmentCount} 条、同类 ${sameTypeCount} 条。建议操作员优先复核这些告警是否指向同一隐患源，研判结果仅作为处置备注参考。`
    : `${alert.segmentId} 区段当前告警暂未发现明显同区段或同类近时关联。建议按单点异常流程复核现场证据，研判结果仅作为处置备注参考。`

  const basis = [
    `当前告警：${alert.id} · ${alert.segmentId} · ${typeLabel}`,
    `时间窗口：以 ${formatTime(alert.latestOccurredAt ?? alert.occurredAt)} 为中心前后 60 分钟`,
    relatedIds.length > 0
      ? `关联告警：${relatedIds.join('、')}`
      : '关联告警：暂无',
    '边界说明：不改变告警等级，不替代操作员确认',
  ]

  return {
    id: `AIJ-${alert.id}`,
    summary,
    relatedAlertIds: relatedIds,
    generatedAt: new Date().toISOString(),
    basis,
  }
}
