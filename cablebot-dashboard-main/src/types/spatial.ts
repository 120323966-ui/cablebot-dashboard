export interface PipeNode {
  id: string
  label: string
  x: number
  y: number
  type: 'manhole' | 'junction' | 'entry'
}

export interface PipeSegment {
  id: string
  fromNode: string
  toNode: string
  riskLevel: number
  temperatureC: number
  humidityPct: number
  activeAlerts: number
  length: number
  inspected: boolean
  lastInspected: string
}

/* ═══════════════════════════════════════════════════
   异常类型枚举 — 对齐 sharedSeed 中的 ALERT_TYPES
   决定告警在拓扑中的传播方向规则
   ═══════════════════════════════════════════════════ */
export type AlertType =
  | 'thermal'      // 热像异常 — 沿电缆导体方向双向关联
  | 'moisture'     // 湿度/渗漏 — 按坡度向下游
  | 'gas'          // 气体浓度 — 按管腔连通双向
  | 'structural'   // 结构异常 — 仅本段
  | 'vibration'    // 振动超标 — 仅本段
  | 'water'        // 积水检测 — 按坡度向下游
  | 'comm'         // 通信异常 — 仅本段
  | 'lighting'     // 照明异常 — 仅本段
  | 'unknown'      // 未识别类型,保守处理为仅本段

export interface PipeAlert {
  id: string
  segmentId: string
  progress: number
  severity: 'critical' | 'warning' | 'info'
  label: string
  /* ── 拓扑感知告警所需的扩展字段 ── */
  type: AlertType
  status: 'new' | 'acknowledged' | 'closed'
  occurredAt: string
}

export interface RobotOnMap {
  id: string
  name: string
  segmentId: string
  progress: number
  direction: 1 | -1
  batteryPct: number
  speedKmh: number
  status: 'moving' | 'inspecting' | 'idle' | 'emergency'
}

export interface CrossSectionSensor {
  id: string
  label: string
  type: 'temperature' | 'humidity' | 'gas' | 'water' | 'camera'
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
  value: string
  status: 'normal' | 'warning' | 'danger'
}

/* ═══════════════════════════════════════════════════
   拓扑传播链(Topology-Aware Propagation Chain)
   论文第 5.4 节核心可视化对象
   ═══════════════════════════════════════════════════ */

/** 传播链中的单个区段链接 */
export interface PropagationLink {
  segmentId: string
  /** 沿管段拓扑方向相对于起点的位置 */
  direction: 'upstream' | 'downstream'
  /** BFS 跳数,1 表示与起点直接相邻 */
  hopDistance: number
  /** 若该区段在时间窗内有同类告警,则携带告警 ID */
  alertId?: string
  severity?: 'critical' | 'warning' | 'info'
}

/** 一次传播链查询的完整结果 */
export interface PropagationChain {
  originSegmentId: string
  originAlertId: string
  alertType: AlertType
  /** 起点的传播方向规则 */
  direction: 'both' | 'upstream' | 'downstream' | 'none'
  /** 已发生的同类告警关联区段(实证关联) */
  related: PropagationLink[]
  /** 拓扑相邻但暂无告警的区段(推测影响范围) */
  inferred: PropagationLink[]
}

export interface SpatialPageResponse {
  nodes: PipeNode[]
  segments: PipeSegment[]
  alerts: PipeAlert[]
  robots: RobotOnMap[]
  sensors: Record<string, CrossSectionSensor[]>
}
