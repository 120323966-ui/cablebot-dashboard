/* ═══════════════════════════════════════════════════
   propagation.ts — 拓扑感知告警传播链算法

   论文第 5.4 节核心:
     "告警发生后,空间定位页进入拓扑传播链视图。系统以被
      选中的告警区段为起点,沿上游和下游检索预设时间范围
      内的同类告警记录。"

   传播规则(论文同节):
     - 温度异常按电缆导体方向双向关联
     - 积水按坡度方向向下游关联
     - 气体异常按管腔连通关系双向关联

   未在论文中明确的告警类型(结构、振动、通信、照明),
   按"仅本段"保守处理,避免过度泛化。
   ═══════════════════════════════════════════════════ */

import type {
  AlertType,
  PipeAlert,
  PipeNode,
  PipeSegment,
  PropagationChain,
  PropagationLink,
} from '@/types/spatial'
import { getPropagationDirection, type PropagationDirection } from './topology'

export { getPropagationDirection }
export type { PropagationDirection }

/* ─────────────────────────────────────────────
   1. 中文告警类型 → AlertType 枚举映射
      sharedSeed 输出的 type 是中文字符串,在 spatial
      mock 输出层做一次转换,把中文翻译成枚举值。
   ───────────────────────────────────────────── */

const TYPE_MAP: Array<[RegExp, AlertType]> = [
  [/热像|温|thermal/i, 'thermal'],
  [/湿度|渗漏|渗|moisture/i, 'moisture'],
  [/气体|甲烷|gas|ch4/i, 'gas'],
  [/结构|裂缝|破损|structural/i, 'structural'],
  [/振动|抖动|vibration/i, 'vibration'],
  [/积水|water/i, 'water'],
  [/通信|链路|信号|comm/i, 'comm'],
  [/照明|灯光|lighting/i, 'lighting'],
]

export function mapAlertType(input: string | undefined | null): AlertType {
  if (!input) return 'unknown'
  for (const [pattern, type] of TYPE_MAP) {
    if (pattern.test(input)) return type
  }
  return 'unknown'
}

/** 给 UI 用的中文标签(便于侧栏直接展示传播方向) */
export function getPropagationDirectionLabel(dir: PropagationDirection): string {
  switch (dir) {
    case 'both': return '双向'
    case 'downstream': return '沿下游'
    case 'upstream': return '沿上游'
    case 'none': return '仅本段'
  }
}

/** 给 UI 用的中文标签(异常类型) */
export function getAlertTypeLabel(type: AlertType): string {
  const map: Record<AlertType, string> = {
    thermal: '热像异常',
    moisture: '湿度/渗漏',
    gas: '气体浓度',
    structural: '结构异常',
    vibration: '振动超标',
    water: '积水检测',
    comm: '通信异常',
    lighting: '照明异常',
    unknown: '未分类',
  }
  return map[type]
}

/* ─────────────────────────────────────────────
   3. 拓扑邻接表构建

   ⚠️ 重要的物理前提:
     A、B、C 三段是三条**独立平行铺设的电缆排管**,
     管腔之间彼此不连通。PipelineMap 中绘制的纵向虚线
     (J-AB1—J-B12—J-C12 / J-B23—J-C23)只表达
     这些检查井在地理位置上垂直对齐,**并不代表管腔
     连通**。因此电缆/气体/积水/温度等任何异常都不会
     沿这些虚线在 A/B/C 段之间传播。

     传播只沿同一根管线内部的相邻区段进行 — 即仅当两个
     区段共享同一个端节点时才认定为相邻。

   方向定义:沿 segment.fromNode → segment.toNode 为
   "下游",反向为"上游"。当从节点 N 出发探索相邻段时,
   若 N 是该段的 fromNode,则该段相对当前位置是"下游";
   若 N 是 toNode,则该段相对当前位置是"上游"。

   扩展位:若未来工程上确实存在"两段不同管线之间通过
   横向连通管贯通"的情况,可以通过外部传入
   `connectedManholes` 参数声明这种连通对,本算法会
   把它视为同节点等价。默认为空集,即各段独立。
   ───────────────────────────────────────────── */

interface AdjacencyMaps {
  /** 节点 → 包含该节点的区段列表 */
  nodeToSegments: Map<string, PipeSegment[]>
  /** 节点 → 与之物理连通的其他节点列表(默认为空) */
  manholeNeighbors: Map<string, string[]>
}

function buildAdjacency(
  segments: PipeSegment[],
  connectedManholes: Array<[string, string]> = [],
): AdjacencyMaps {
  const nodeToSegments = new Map<string, PipeSegment[]>()
  for (const seg of segments) {
    if (!nodeToSegments.has(seg.fromNode)) nodeToSegments.set(seg.fromNode, [])
    if (!nodeToSegments.has(seg.toNode)) nodeToSegments.set(seg.toNode, [])
    nodeToSegments.get(seg.fromNode)!.push(seg)
    nodeToSegments.get(seg.toNode)!.push(seg)
  }

  // 仅当调用方显式声明"管腔连通"时才把两个检查井视为同节点等价。
  // 默认情况下 A/B/C 三段独立,该 Map 为空。
  const manholeNeighbors = new Map<string, string[]>()
  for (const [a, b] of connectedManholes) {
    if (!manholeNeighbors.has(a)) manholeNeighbors.set(a, [])
    if (!manholeNeighbors.has(b)) manholeNeighbors.set(b, [])
    manholeNeighbors.get(a)!.push(b)
    manholeNeighbors.get(b)!.push(a)
  }

  return { nodeToSegments, manholeNeighbors }
}

/* ─────────────────────────────────────────────
   4. BFS 主算法

   策略:从起点区段的两个端节点向外扩展。
     - 探索方向受 PropagationDirection 约束:
       only-downstream 时只从 toNode 端出发
       only-upstream 时只从 fromNode 端出发
       both 时两端都出发
     - 在 maxHops 范围内,若区段有同类未关闭告警且在时
       间窗内,归入 related;否则在 maxHops + inferredHops
       范围内归入 inferred。
     - 注意:同一区段在双向传播时可能被两次访问,取较短
       的 hopDistance 与较强的 severity(优先 critical >
       warning > info)。
   ───────────────────────────────────────────── */

interface BuildOptions {
  /** 时间窗口(小时),默认 24h */
  timeWindowHours?: number
  /** 实证关联最大跳数,默认 3 */
  maxHops?: number
  /** 在 maxHops 之外再延伸的推测跳数,默认 1 */
  inferredHops?: number
  /**
   * 物理上贯通的检查井对(可选)。
   * 仅当工程数据明确告知两个检查井之间存在横向连通管时才传入。
   * 默认为空,即各段管线独立运行,异常不跨段传播。
   */
  connectedManholes?: Array<[string, string]>
}

const DEFAULT_TIME_WINDOW_HOURS = 24
const DEFAULT_MAX_HOPS = 3
const DEFAULT_INFERRED_HOPS = 1

const SEVERITY_RANK: Record<'critical' | 'warning' | 'info', number> = {
  critical: 3,
  warning: 2,
  info: 1,
}

export function buildPropagationChain(
  originAlertId: string,
  alerts: PipeAlert[],
  segments: PipeSegment[],
  _nodes: PipeNode[],
  options: BuildOptions = {},
): PropagationChain | null {
  const timeWindowMs = (options.timeWindowHours ?? DEFAULT_TIME_WINDOW_HOURS) * 3600_000
  const maxHops = options.maxHops ?? DEFAULT_MAX_HOPS
  const inferredHops = options.inferredHops ?? DEFAULT_INFERRED_HOPS
  const totalHops = maxHops + inferredHops

  const origin = alerts.find((a) => a.id === originAlertId)
  if (!origin) return null

  const originSeg = segments.find((s) => s.id === origin.segmentId)
  if (!originSeg) return null

  const direction = getPropagationDirection(origin.type)
  const now = Date.now()
  const { nodeToSegments, manholeNeighbors } = buildAdjacency(
    segments,
    options.connectedManholes ?? [],
  )

  /** 该区段在时间窗内是否存在同类、未关闭的告警 */
  const findActiveAlertOnSegment = (segId: string): PipeAlert | undefined => {
    return alerts.find((a) =>
      a.segmentId === segId
      && a.id !== originAlertId
      && a.type === origin.type
      && a.status !== 'closed'
      && (now - new Date(a.occurredAt).getTime()) <= timeWindowMs,
    )
  }

  /** 收集所有访问过的区段及其元数据(取最短跳数 + 最严重等级) */
  const visited = new Map<string, { hop: number; dir: 'upstream' | 'downstream' }>()

  /**
   * 从某个节点出发,沿"远离起点"的方向 BFS。
   * @param startNode 起始节点(起点区段的某一端)
   * @param walkDir   逻辑方向标签:此次扩展产生的链接方向(upstream / downstream)
   */
  const expand = (startNode: string, walkDir: 'upstream' | 'downstream') => {
    /** BFS 队列项:节点 + 已走跳数 */
    interface QueueItem { node: string; hop: number }
    const queue: QueueItem[] = [{ node: startNode, hop: 0 }]
    /** 节点本身的访问记录(避免节点反复入队) */
    const seenNodes = new Set<string>([startNode])
    /** 同方向上访问过的区段(避免一段被重复 hop) */
    const seenSegsThisDir = new Set<string>([originSeg.id])

    while (queue.length > 0) {
      const cur = queue.shift()!
      if (cur.hop >= totalHops) continue

      // 收集"从当前节点出发"的相邻区段:
      // 1) 共享 cur.node 的所有 segments
      // 2) 通过 vertLinks 连接的对端节点上的所有 segments(算作 +1 hop)

      const directNeighbors: PipeSegment[] = nodeToSegments.get(cur.node) ?? []
      for (const seg of directNeighbors) {
        if (seenSegsThisDir.has(seg.id)) continue
        seenSegsThisDir.add(seg.id)

        const nextHop = cur.hop + 1
        if (nextHop > totalHops) continue

        const prev = visited.get(seg.id)
        if (!prev || prev.hop > nextHop) {
          visited.set(seg.id, { hop: nextHop, dir: walkDir })
        }

        // 沿这段继续扩展:从段的另一端继续
        const otherNode = seg.fromNode === cur.node ? seg.toNode : seg.fromNode
        if (!seenNodes.has(otherNode)) {
          seenNodes.add(otherNode)
          queue.push({ node: otherNode, hop: nextHop })
        }
      }

      // 物理连通:仅当 connectedManholes 显式声明时,
      // 才把对端检查井视为同节点等价继续 BFS。
      // 默认配置下 manholeNeighbors 为空,这一段不会执行,
      // A/B/C 段彼此独立,异常不会跨段传播。
      const verts = manholeNeighbors.get(cur.node) ?? []
      for (const vNode of verts) {
        if (seenNodes.has(vNode)) continue
        seenNodes.add(vNode)
        queue.push({ node: vNode, hop: cur.hop + 1 })
      }
    }
  }

  // 根据传播方向决定从哪些端节点出发
  if (direction === 'both' || direction === 'downstream') {
    expand(originSeg.toNode, 'downstream')
  }
  if (direction === 'both' || direction === 'upstream') {
    expand(originSeg.fromNode, 'upstream')
  }
  // direction === 'none' 时不扩展,visited 为空,只渲染起点

  // 把 visited 切分为 related(有同类告警)/ inferred(无)
  const related: PropagationLink[] = []
  const inferred: PropagationLink[] = []

  for (const [segId, meta] of visited) {
    const alert = findActiveAlertOnSegment(segId)
    if (alert && meta.hop <= maxHops) {
      related.push({
        segmentId: segId,
        direction: meta.dir,
        hopDistance: meta.hop,
        alertId: alert.id,
        severity: alert.severity,
      })
    } else if (meta.hop <= totalHops) {
      // 没有同类告警,作为推测影响范围
      // 但只有"传播方向不为 none"时推测才有意义
      if (direction !== 'none') {
        inferred.push({
          segmentId: segId,
          direction: meta.dir,
          hopDistance: meta.hop,
        })
      }
    }
  }

  // 按 hopDistance 升序、严重度降序排序,便于 UI 渲染
  related.sort((a, b) => {
    if (a.hopDistance !== b.hopDistance) return a.hopDistance - b.hopDistance
    return (SEVERITY_RANK[b.severity ?? 'info'] - SEVERITY_RANK[a.severity ?? 'info'])
  })
  inferred.sort((a, b) => a.hopDistance - b.hopDistance)

  return {
    originSegmentId: origin.segmentId,
    originAlertId: origin.id,
    alertType: origin.type,
    direction,
    related,
    inferred,
  }
}
