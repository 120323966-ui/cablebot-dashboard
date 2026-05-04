/* ═══════════════════════════════════════════════════
   AI 辅助研判生成器

   论文 5.6 节定位:
     AI 研判作为操作员的"旁路输入",不替代分级,不改变事实。
     UI 层应让操作员快速看到"为什么AI这么判断"。

   本实现做四件事:
     1. 收集与当前告警相关的证据(同段/邻段/同类型/近时)
     2. 识别若干"典型模式"(持续性局部、上游扩散、复合异常等)
     3. 把识别结果组装成一段因果性叙述 (summary)
     4. 把每条匹配的证据具体化(谁、何时、何地)放进 basis
     5. 根据证据强度估算置信度

   注意:这里全部是规则式,真实环境会接更复杂的模型。
   规则式的好处是结果可解释、basis 与 summary 强一致。
   ═══════════════════════════════════════════════════ */

import type { AlertItem } from '@/types/dashboard'
import type { AIJudgment } from '@/types/alerts'
import { getNeighbors } from './topology'

function isAdjacent(a: string, b: string): boolean {
  const neighbors = getNeighbors(a)
  return neighbors.upstream.includes(b) || neighbors.downstream.includes(b)
}

/* ─────── 类型与时间比对 ─────── */

function alertType(a: AlertItem): string {
  return a.type ?? a.title
}

function sameType(a: AlertItem, b: AlertItem): boolean {
  return alertType(a) === alertType(b)
}

function getTime(a: AlertItem): number {
  return new Date(a.latestOccurredAt ?? a.occurredAt).getTime()
}

function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

/* ─────── 模式识别 ─────── */

const TIME_WINDOW_MS = 60 * 60_000 // 60 分钟内视为"近时"

interface RelatedAlert {
  alert: AlertItem
  /** 与当前告警的关系类型 */
  relation: 'same-segment-same-type' | 'same-segment-other-type' | 'adjacent-same-type' | 'adjacent-other-type' | 'remote'
  /** 时间间隔(分钟) */
  gapMinutes: number
}

function classifyRelated(target: AlertItem, candidates: AlertItem[]): RelatedAlert[] {
  const targetTime = getTime(target)
  const result: RelatedAlert[] = []

  for (const item of candidates) {
    if (item.id === target.id || item.status === 'closed') continue

    const gapMs = Math.abs(getTime(item) - targetTime)
    const inWindow = gapMs <= TIME_WINDOW_MS
    const sameSeg = item.segmentId === target.segmentId
    const adj = isAdjacent(target.segmentId, item.segmentId)
    const sameT = sameType(target, item)

    /* 跨段且不同类型且超出时间窗:无关 */
    if (!sameSeg && !adj && !sameT) continue
    if (!inWindow && !sameSeg) continue

    let relation: RelatedAlert['relation']
    if (sameSeg && sameT) relation = 'same-segment-same-type'
    else if (sameSeg) relation = 'same-segment-other-type'
    else if (adj && sameT) relation = 'adjacent-same-type'
    else if (adj) relation = 'adjacent-other-type'
    else relation = 'remote'

    result.push({ alert: item, relation, gapMinutes: Math.round(gapMs / 60_000) })
  }

  /* 排序:同段同类 > 同段它类 > 邻段同类 > 邻段它类 > 时间近 */
  const order: Record<RelatedAlert['relation'], number> = {
    'same-segment-same-type': 0,
    'same-segment-other-type': 1,
    'adjacent-same-type': 2,
    'adjacent-other-type': 3,
    'remote': 4,
  }
  return result.sort((a, b) => {
    const r = order[a.relation] - order[b.relation]
    return r !== 0 ? r : a.gapMinutes - b.gapMinutes
  })
}

/* ─────── 模式聚合 ─────── */

interface PatternSignals {
  hasSameSegmentSameType: boolean
  hasSameSegmentOtherType: boolean
  hasAdjacentSameType: boolean
  hasAdjacentOtherType: boolean
  /** 邻段同类的具体方向 */
  adjacentDirection: 'upstream' | 'downstream' | 'both' | null
  /** 重复触发的次数(包括当前告警自身的 repeatCount) */
  repeatCount: number
  /** 最近一次相邻同类的时间间隔(分钟),用于判断"扩散速度" */
  adjacentGapMinutes: number | null
}

function detectPatterns(target: AlertItem, related: RelatedAlert[]): PatternSignals {
  const neighbors = getNeighbors(target.segmentId)

  const adjacentSameType = related.filter((r) => r.relation === 'adjacent-same-type')

  let direction: PatternSignals['adjacentDirection'] = null
  if (adjacentSameType.length > 0) {
    const hasUp = adjacentSameType.some((r) => neighbors.upstream.includes(r.alert.segmentId))
    const hasDown = adjacentSameType.some((r) => neighbors.downstream.includes(r.alert.segmentId))
    if (hasUp && hasDown) direction = 'both'
    else if (hasUp) direction = 'upstream'
    else if (hasDown) direction = 'downstream'
  }

  return {
    hasSameSegmentSameType: related.some((r) => r.relation === 'same-segment-same-type'),
    hasSameSegmentOtherType: related.some((r) => r.relation === 'same-segment-other-type'),
    hasAdjacentSameType: adjacentSameType.length > 0,
    hasAdjacentOtherType: related.some((r) => r.relation === 'adjacent-other-type'),
    adjacentDirection: direction,
    repeatCount: target.repeatCount ?? 1,
    adjacentGapMinutes: adjacentSameType[0]?.gapMinutes ?? null,
  }
}

/* ─────── 文本生成 ─────── */

function directionLabel(d: PatternSignals['adjacentDirection']): string {
  if (d === 'upstream') return '上游'
  if (d === 'downstream') return '下游'
  if (d === 'both') return '上下游'
  return ''
}

/**
 * 把模式信号组装成一段因果叙述。
 * 每个 if 分支按"最强证据优先"排列,只取第一个匹配。
 */
function buildSummary(target: AlertItem, signals: PatternSignals): string {
  const seg = target.segmentId
  const t = alertType(target)

  /* 模式 A: 上下游同类近时(扩散迹象) */
  if (signals.hasAdjacentSameType) {
    const dir = directionLabel(signals.adjacentDirection)
    const gap = signals.adjacentGapMinutes
    const gapText = gap !== null ? `${gap} 分钟内` : '近时'
    return `${seg} 段 ${t} 与${dir}邻段同类告警在 ${gapText}连续触发,空间相邻且类型相同,符合管段间扩散或共源异常的特征。建议优先复核 ${seg} 与${dir}段共享的物理结构(接头、保温层、传感器布点),次选独立点检。`
  }

  /* 模式 B: 同段反复(持续性局部) */
  if (signals.repeatCount >= 3) {
    return `${seg} 段 ${t} 在短时间内已反复触发 ${signals.repeatCount} 次,提示该点位存在持续性局部异常而非偶发干扰。建议派员现场复核测点,排查传感器漂移或真实劣化两种可能。`
  }

  /* 模式 C: 同段不同类同时(复合异常) */
  if (signals.hasSameSegmentOtherType) {
    return `${seg} 段在同一时间窗口内同时出现 ${t} 与其他类型告警,多源指标同时偏离通常指向同一物理事件。建议把这些告警作为一组复合事件复核,避免分别处置导致重复出动。`
  }

  /* 模式 D: 同段同类近时(局部反复) */
  if (signals.hasSameSegmentSameType) {
    return `${seg} 段 ${t} 在近时间窗内多次触发,虽未蔓延到邻段,但提示局部测点存在反复异常。建议先复核传感器读数稳定性,再决定是否升级为现场处置。`
  }

  /* 模式 E: 邻段它类(弱关联) */
  if (signals.hasAdjacentOtherType) {
    return `${seg} 段 ${t} 当前关联较弱,邻段近时存在其他类型告警但未指向同一隐患。建议按单点异常流程复核,留意邻段动态。`
  }

  /* 模式 F: 孤立 */
  return `${seg} 段 ${t} 暂未发现明显空间或时间关联告警,符合孤立点异常特征。建议按单点流程复核证据,无需立即扩展处置范围。`
}

/**
 * basis: 把识别到的关键证据具体化(谁、何时、何地、几分钟)。
 * 不再是"时间窗口 60 分钟"这种元数据,而是事实级证据。
 */
function buildBasis(target: AlertItem, related: RelatedAlert[], signals: PatternSignals): string[] {
  const lines: string[] = []
  const t = alertType(target)
  const targetClock = formatClock(target.latestOccurredAt ?? target.occurredAt)

  lines.push(`当前: ${target.id} 在 ${target.segmentId} 段于 ${targetClock} 触发 ${t}`)

  /* 取最重要的几条相关告警(按 relation 排序后的前 3 条)放入 basis */
  const importantRelated = related.slice(0, 3)
  for (const r of importantRelated) {
    const clock = formatClock(r.alert.latestOccurredAt ?? r.alert.occurredAt)
    const relText: Record<RelatedAlert['relation'], string> = {
      'same-segment-same-type': '同段同类',
      'same-segment-other-type': '同段它类',
      'adjacent-same-type': '邻段同类',
      'adjacent-other-type': '邻段它类',
      'remote': '远段',
    }
    lines.push(
      `证据: ${r.alert.id} · ${r.alert.segmentId} 段 · ${alertType(r.alert)} · ${clock} 触发 · ${relText[r.relation]} · 间隔 ${r.gapMinutes} 分钟`,
    )
  }

  if (signals.repeatCount >= 2) {
    lines.push(`重发: 该告警已归并 ${signals.repeatCount} 次, 提示非偶发`)
  }

  lines.push('边界: 不改变告警等级, 不替代操作员确认')

  return lines
}

/* ─────── 置信度估算 ─────── */

/**
 * 置信度由"证据强度 + 模式清晰度"加权:
 *   - 同段同类: +0.40
 *   - 邻段同类: +0.45 (有方向再 +0.05,both 方向再 +0.05)
 *   - 同段它类: +0.30
 *   - 邻段它类: +0.10
 *   - 同段反复: +0.10 × min(repeatCount-1, 4)
 * 最大封顶 1.0,最小 0.15(模板本身已是软推断,不给"零置信")。
 *
 * 权重设计原则:论文里反复强调"邻段同类近时 = 扩散信号",
 * 所以邻段同类比同段同类还要强(扩散比反复更值得操作员关注)。
 */
function estimateConfidence(signals: PatternSignals): { confidence: number; level: 'low' | 'medium' | 'high' } {
  let c = 0.15

  if (signals.hasSameSegmentSameType) c += 0.40
  if (signals.hasAdjacentSameType) {
    c += 0.45
    if (signals.adjacentDirection === 'both') c += 0.05
  }
  if (signals.hasSameSegmentOtherType) c += 0.30
  if (signals.hasAdjacentOtherType) c += 0.10
  if (signals.repeatCount >= 2) c += 0.10 * Math.min(signals.repeatCount - 1, 4)

  c = Math.min(1, Number(c.toFixed(2)))

  let level: 'low' | 'medium' | 'high'
  if (c >= 0.7) level = 'high'
  else if (c >= 0.4) level = 'medium'
  else level = 'low'

  return { confidence: c, level }
}

/* ─────── 主入口 ─────── */

export function buildAIJudgment(alert: AlertItem, allAlerts: AlertItem[]): AIJudgment {
  const related = classifyRelated(alert, allAlerts)
  const signals = detectPatterns(alert, related)
  const summary = buildSummary(alert, signals)
  const basis = buildBasis(alert, related, signals)
  const { confidence, level } = estimateConfidence(signals)

  return {
    id: `AIJ-${alert.id}`,
    summary,
    relatedAlertIds: related.slice(0, 4).map((r) => r.alert.id),
    generatedAt: new Date().toISOString(),
    basis,
    confidence,
    confidenceLevel: level,
  }
}
