import { useMemo, useState } from 'react'
import type {
  PipeAlert, PipeNode, PipeSegment, PropagationChain, PropagationLink, RobotOnMap,
} from '@/types/spatial'
import { getAlertTypeLabel, getPropagationDirectionLabel } from '@/utils/propagation'

/* ───────── Inject keyframes once ───────── */

const STYLE_ID = '__pipe-map-v3'
function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return
  const el = document.createElement('style')
  el.id = STYLE_ID
  el.textContent = `
    @keyframes pm2-ping { 0% { r: 5; opacity: 0.9; } 100% { r: 14; opacity: 0; } }
    @keyframes pm2-glow { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }
    @keyframes pm2-flow { 0% { stroke-dashoffset: 24; } 100% { stroke-dashoffset: 0; } }
    /* 传播链流光 — 与方向无关,仅作存在感 */
    @keyframes pm3-prop-flow { 0% { stroke-dashoffset: 32; } 100% { stroke-dashoffset: 0; } }
    @keyframes pm3-prop-flow-rev { 0% { stroke-dashoffset: 0; } 100% { stroke-dashoffset: 32; } }
    /* 起点区段 — 缓慢呼吸,不刺眼 */
    @keyframes pm3-origin-pulse { 0%,100% { opacity: 0.55; } 50% { opacity: 1; } }
  `
  document.head.appendChild(el)
}

/* ───────── Color helpers ───────── */

function riskStroke(r: number) {
  if (r >= 0.8) return '#f43f5e'
  if (r >= 0.6) return '#f59e0b'
  if (r >= 0.4) return '#3b82f6'
  return '#334155'
}

function riskBg(r: number) {
  if (r >= 0.8) return 'rgba(244,63,94,0.10)'
  if (r >= 0.6) return 'rgba(245,158,11,0.08)'
  if (r >= 0.4) return 'rgba(59,130,246,0.06)'
  return 'rgba(51,65,85,0.04)'
}

function riskTrail(r: number) {
  if (r >= 0.8) return 'rgba(244,63,94,0.18)'
  if (r >= 0.6) return 'rgba(245,158,11,0.14)'
  if (r >= 0.4) return 'rgba(59,130,246,0.12)'
  return 'rgba(51,65,85,0.08)'
}

function alertDot(s: PipeAlert['severity']) {
  if (s === 'critical') return '#f43f5e'
  if (s === 'warning') return '#f59e0b'
  return '#38bdf8'
}

function alertStatusLabel(status: PipeAlert['status']) {
  if (status === 'new') return '待处置'
  if (status === 'acknowledged') return '已确认'
  return '已关闭'
}

function alertStatusOpacity(status: PipeAlert['status']) {
  if (status === 'new') return 1
  if (status === 'acknowledged') return 0.72
  return 0.34
}

function segmentAlertState(segmentId: string, alerts: PipeAlert[]) {
  const segAlerts = alerts.filter((a) => a.segmentId === segmentId)
  return {
    total: segAlerts.length,
    newCount: segAlerts.filter((a) => a.status === 'new').length,
    acknowledgedCount: segAlerts.filter((a) => a.status === 'acknowledged').length,
    closedCount: segAlerts.filter((a) => a.status === 'closed').length,
  }
}

function robotFill(s: RobotOnMap['status']) {
  if (s === 'inspecting') return '#22d3ee'
  if (s === 'moving') return '#34d399'
  return '#64748b'
}

/* 传播链颜色:related = 紫色系(独立于风险色,避免视觉混淆),
   起点 = 强紫,inferred = 弱紫虚线 */
const PROP_RELATED = '#a78bfa'      // violet-400
const PROP_RELATED_GLOW = 'rgba(167,139,250,0.35)'
const PROP_INFERRED = 'rgba(167,139,250,0.45)'
const PROP_ORIGIN = '#c4b5fd'       // violet-300

/* ───────── Geometry helpers ───────── */

function lerp(a: number, b: number, t: number) { return a + (b - a) * t }

function nodeById(nodes: PipeNode[], id: string) {
  return nodes.find((n) => n.id === id)
}

/* ───────── Tooltip state ───────── */

interface Tip { x: number; y: number; text: string }

/* ───────── Component ───────── */

const BAND_W = 18  // pipe band thickness
const SEL_W = 26   // selected pipe thickness

export function PipelineMap({
  nodes,
  segments,
  alerts,
  robots,
  selectedSegment,
  selectedRobot,
  propagationChain,
  onSelectSegment,
  onSelectRobot,
  onSelectAlert,
  onDeselect,
}: {
  nodes: PipeNode[]
  segments: PipeSegment[]
  alerts: PipeAlert[]
  robots: RobotOnMap[]
  selectedSegment: string | null
  selectedRobot: string | null
  /** 传播链;为 null 时回退到普通拓扑视图 */
  propagationChain: PropagationChain | null
  onSelectSegment: (id: string) => void
  onSelectRobot: (id: string) => void
  /** 点击告警 dot 时触发,用于驱动传播链查询 */
  onSelectAlert?: (alertId: string) => void
  onDeselect: () => void
}) {
  ensureStyles()

  const [tip, setTip] = useState<Tip | null>(null)

  const W = 960, H = 600

  /* Vertical link pairs (dashed, non-interactive) */
  const vertLinks = [
    { from: 'J-AB1', to: 'J-B12' },
    { from: 'J-B12', to: 'J-C12' },
    { from: 'J-B23', to: 'J-C23' },
  ]

  /* ── 传播链查表:O(1) 判断某区段是否在链上、属于哪一档 ── */
  const propMaps = useMemo(() => {
    if (!propagationChain) {
      return {
        relatedById: new Map<string, PropagationLink>(),
        inferredById: new Map<string, PropagationLink>(),
        originId: null as string | null,
      }
    }
    return {
      relatedById: new Map(propagationChain.related.map((l) => [l.segmentId, l])),
      inferredById: new Map(propagationChain.inferred.map((l) => [l.segmentId, l])),
      originId: propagationChain.originSegmentId,
    }
  }, [propagationChain])

  const isInChain = (segId: string) =>
    propMaps.originId === segId
    || propMaps.relatedById.has(segId)
    || propMaps.inferredById.has(segId)

  const showChain = propagationChain !== null

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-full w-full"
      preserveAspectRatio="xMidYMid meet"
      onMouseLeave={() => setTip(null)}
    >
      {/* ═══ Background subtle grid ═══ */}
      <defs>
        <pattern id="pm2-grid" width="48" height="48" patternUnits="userSpaceOnUse">
          <path d="M 48 0 L 0 0 0 48" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" />
        </pattern>
        {/* 方向箭头 marker(只在传播链层使用) */}
        <marker
          id="pm3-arrow-related"
          viewBox="0 0 12 12" refX="6" refY="6"
          markerWidth="6" markerHeight="6" orient="auto-start-reverse"
        >
          <path d="M 0 0 L 12 6 L 0 12 L 3 6 z" fill={PROP_RELATED} />
        </marker>
        <marker
          id="pm3-arrow-inferred"
          viewBox="0 0 12 12" refX="6" refY="6"
          markerWidth="5" markerHeight="5" orient="auto-start-reverse"
        >
          <path d="M 0 0 L 12 6 L 0 12 L 3 6 z" fill={PROP_INFERRED} />
        </marker>
      </defs>
      <rect
        width={W}
        height={H}
        fill="url(#pm2-grid)"
        onClick={onDeselect}
        className="cursor-default"
      />

      {/* ═══ Vertical connections (dashed) ═══ */}
      {vertLinks.map(({ from, to }, i) => {
        const nf = nodeById(nodes, from)
        const nt = nodeById(nodes, to)
        if (!nf || !nt) return null
        return (
          <line key={`vl-${i}`}
            x1={nf.x} y1={nf.y} x2={nt.x} y2={nt.y}
            stroke="rgba(100,116,139,0.12)" strokeWidth="1" strokeDasharray="4 6"
          />
        )
      })}

      {/* ═══ Pipe segments ═══ */}
      {segments.map((seg) => {
        const from = nodeById(nodes, seg.fromNode)
        const to = nodeById(nodes, seg.toNode)
        if (!from || !to) return null

        const isSel = seg.id === selectedSegment
        const color = riskStroke(seg.riskLevel)
        const bg = riskBg(seg.riskLevel)
        const midX = lerp(from.x, to.x, 0.5)
        const midY = lerp(from.y, to.y, 0.5)
        const bw = isSel ? SEL_W : BAND_W

        /* Find robot on this segment for trail */
        const segRobot = robots.find((r) => r.segmentId === seg.id && r.status !== 'idle')
        const trailEnd = segRobot ? segRobot.progress : 0
        const state = segmentAlertState(seg.id, alerts)
        const hasNew = state.newCount > 0
        const hasAckOnly = state.newCount === 0 && state.acknowledgedCount > 0
        const allClosed = state.total > 0 && state.closedCount === state.total

        /* 传播链激活时,链外区段降低饱和度;链内不变 */
        const dimmedByChain = showChain && !isInChain(seg.id)

        return (
          <g
            key={seg.id}
            className="cursor-pointer"
            onClick={(e) => { e.stopPropagation(); onSelectSegment(seg.id) }}
            opacity={dimmedByChain ? 0.35 : 1}
          >
            {/* Selection glow */}
            {isSel && (
              <line x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                stroke="rgba(34,211,238,0.15)" strokeWidth={bw + 16} strokeLinecap="round"
              />
            )}

            {/* Pipe background band */}
            <line x1={from.x} y1={from.y} x2={to.x} y2={to.y}
              stroke={bg} strokeWidth={bw} strokeLinecap="round"
              strokeDasharray={seg.inspected ? undefined : '10 8'}
            />

            {/* Pipe border (top & bottom edges) */}
            <line x1={from.x} y1={from.y} x2={to.x} y2={to.y}
              stroke={color} strokeWidth={bw} strokeLinecap="round"
              opacity={seg.inspected ? 0.35 : 0.22} fill="none"
              strokeDasharray={seg.inspected ? undefined : '10 8'}
            />
            {/* Pipe center bright line */}
            <line x1={from.x} y1={from.y} x2={to.x} y2={to.y}
              stroke={color} strokeWidth={3} strokeLinecap="round"
              opacity={isSel ? 0.9 : 0.6}
              strokeDasharray={seg.inspected ? undefined : '10 8'}
            />

            {/* Flow animation (dashed overlay) */}
            {seg.inspected && (
              <line x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                stroke={color} strokeWidth={1.5} strokeLinecap="round"
                strokeDasharray="3 21" opacity={0.2}
                style={{ animation: 'pm2-flow 2.5s linear infinite' }}
              />
            )}

            {/* 处置状态外环:颜色仍表示风险,外环表示处置进度 */}
            {(hasNew || hasAckOnly || allClosed) && (
              <line
                x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                stroke={allClosed ? 'rgba(148,163,184,0.32)' : hasNew ? 'rgba(255,255,255,0.62)' : 'rgba(255,255,255,0.42)'}
                strokeWidth={bw + 8}
                strokeLinecap="round"
                strokeDasharray={hasAckOnly ? '8 7' : seg.inspected ? undefined : '10 8'}
                opacity={allClosed ? 0.42 : 0.55}
                fill="none"
              />
            )}
            {allClosed && (
              <line
                x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                stroke="rgba(15,23,42,0.45)"
                strokeWidth={bw + 2}
                strokeLinecap="round"
              />
            )}

            {/* ── Inspected trail ── */}
            {segRobot && trailEnd > 0.01 && (
              <line
                x1={from.x} y1={from.y}
                x2={lerp(from.x, to.x, trailEnd)}
                y2={lerp(from.y, to.y, trailEnd)}
                stroke={riskTrail(seg.riskLevel)}
                strokeWidth={bw - 4} strokeLinecap="round"
              />
            )}

            {/* ── Segment label (ABOVE) ── */}
            <text x={midX} y={midY - bw / 2 - 12}
              textAnchor="middle" fill="rgba(255,255,255,0.85)"
              fontSize="13" fontWeight="600"
            >
              {seg.id}
            </text>

            {/* ── Temp / Humidity (BELOW) ── */}
            <text x={midX} y={midY + bw / 2 + 18}
              textAnchor="middle" fill="rgba(148,163,184,0.45)"
              fontSize="10"
            >
              {seg.temperatureC}°C · {seg.humidityPct}%
            </text>
          </g>
        )
      })}

      {/* ═══════════════════════════════════════════════
          传播链可视化层(论文第 5.4 节核心)
          仅在 propagationChain 存在时渲染
          层级顺序:inferred → related → origin
         ═══════════════════════════════════════════════ */}

      {showChain && propagationChain && (
        <g className="propagation-layer">

          {/* ─── A. inferred 区段:虚线半透明色带 ─── */}
          {propagationChain.inferred.map((link) => {
            const seg = segments.find((s) => s.id === link.segmentId)
            if (!seg) return null
            const from = nodeById(nodes, seg.fromNode)
            const to = nodeById(nodes, seg.toNode)
            if (!from || !to) return null

            // 推测影响范围用虚线表达,无方向箭头(因为未实证)
            return (
              <g key={`inf-${link.segmentId}`}>
                <line
                  x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                  stroke={PROP_INFERRED}
                  strokeWidth={BAND_W + 6}
                  strokeLinecap="round"
                  strokeDasharray="6 8"
                  opacity={0.5}
                  fill="none"
                />
              </g>
            )
          })}

          {/* ─── B. related 区段:实色脉冲流光 + 方向箭头 ─── */}
          {propagationChain.related.map((link) => {
            const seg = segments.find((s) => s.id === link.segmentId)
            if (!seg) return null
            const from = nodeById(nodes, seg.fromNode)
            const to = nodeById(nodes, seg.toNode)
            if (!from || !to) return null

            // 方向逻辑:
            // - 'downstream' 链接 → 流光从上游端流向下游端
            // - 'upstream' 链接 → 流光反向
            // 段的几何方向 = fromNode → toNode = 下游
            // 因此 downstream link 用正向流,upstream link 用反向流
            const animation =
              link.direction === 'downstream'
                ? 'pm3-prop-flow 2s linear infinite'
                : 'pm3-prop-flow-rev 2s linear infinite'

            return (
              <g key={`rel-${link.segmentId}`}>
                {/* 外发光圈 */}
                <line
                  x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                  stroke={PROP_RELATED_GLOW}
                  strokeWidth={BAND_W + 14}
                  strokeLinecap="round"
                  opacity={0.7}
                />
                {/* 流光主体 */}
                <line
                  x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                  stroke={PROP_RELATED}
                  strokeWidth={BAND_W + 4}
                  strokeLinecap="round"
                  strokeDasharray="10 8"
                  opacity={0.85}
                  style={{ animation }}
                />
              </g>
            )
          })}

          {/* ─── C. 方向箭头(只为 related 绘制,且只对 thermal/gas/moisture/water) ─── */}
          {propagationChain.direction !== 'none' && propagationChain.related.map((link) => {
            const seg = segments.find((s) => s.id === link.segmentId)
            if (!seg) return null
            const from = nodeById(nodes, seg.fromNode)
            const to = nodeById(nodes, seg.toNode)
            if (!from || !to) return null

            // 箭头放在段中点,沿管段方向(downstream)或反向(upstream)
            const mx = lerp(from.x, to.x, 0.5)
            const my = lerp(from.y, to.y, 0.5)
            const dx = to.x - from.x
            const dy = to.y - from.y
            const len = Math.sqrt(dx * dx + dy * dy) || 1
            const ux = dx / len
            const uy = dy / len
            const armLen = 10
            // 让箭头紧贴段中点,前后各延伸 armLen
            const x1 = mx - ux * armLen
            const y1 = my - uy * armLen
            const x2 = mx + ux * armLen
            const y2 = my + uy * armLen

            // upstream 方向的箭头反向
            const [ax1, ay1, ax2, ay2] = link.direction === 'downstream'
              ? [x1, y1, x2, y2]
              : [x2, y2, x1, y1]

            return (
              <line
                key={`arr-${link.segmentId}`}
                x1={ax1} y1={ay1} x2={ax2} y2={ay2}
                stroke={PROP_RELATED}
                strokeWidth={2.5}
                markerEnd="url(#pm3-arrow-related)"
                opacity={0.95}
              />
            )
          })}

          {/* ─── D. 起点区段:外发光环 ─── */}
          {(() => {
            const seg = segments.find((s) => s.id === propagationChain.originSegmentId)
            if (!seg) return null
            const from = nodeById(nodes, seg.fromNode)
            const to = nodeById(nodes, seg.toNode)
            if (!from || !to) return null
            return (
              <g key="origin">
                {/* 起点段强发光 */}
                <line
                  x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                  stroke={PROP_ORIGIN}
                  strokeWidth={BAND_W + 22}
                  strokeLinecap="round"
                  opacity={0.18}
                  style={{ animation: 'pm3-origin-pulse 2.4s ease-in-out infinite' }}
                />
                <line
                  x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                  stroke={PROP_ORIGIN}
                  strokeWidth={BAND_W + 8}
                  strokeLinecap="round"
                  opacity={0.6}
                />
              </g>
            )
          })()}
        </g>
      )}

      {/* ═══ Nodes (junctions / entries) ═══ */}
      {nodes.map((node) => {
        const isEntry = node.type === 'entry'
        return (
          <g key={node.id}>
            {/* Outer ring */}
            <circle cx={node.x} cy={node.y}
              r={isEntry ? 7 : 5}
              fill="rgba(15,23,42,0.8)"
              stroke={isEntry ? 'rgba(34,211,238,0.5)' : 'rgba(100,116,139,0.3)'}
              strokeWidth={1.5}
            />
            {/* Inner dot */}
            <circle cx={node.x} cy={node.y}
              r={2}
              fill={isEntry ? '#22d3ee' : '#475569'}
            />
          </g>
        )
      })}

      {/* ═══ Alert dots ═══ */}
      {alerts.map((alert) => {
        const seg = segments.find((s) => s.id === alert.segmentId)
        if (!seg) return null
        const from = nodeById(nodes, seg.fromNode)
        const to = nodeById(nodes, seg.toNode)
        if (!from || !to) return null
        const px = lerp(from.x, to.x, alert.progress)
        const py = lerp(from.y, to.y, alert.progress)
        const c = alert.status === 'closed' ? '#94a3b8' : alertDot(alert.severity)
        const radius = alert.status === 'new' ? 4.2 : alert.status === 'acknowledged' ? 3.8 : 3

        // 传播链激活时:起点告警保持高亮;链上其他告警正常显示;链外告警暗化
        const isOriginAlert =
          showChain && propagationChain && alert.id === propagationChain.originAlertId
        const isOnChainSeg = showChain && isInChain(alert.segmentId)
        const dotOpacity = !showChain
          ? alertStatusOpacity(alert.status)
          : isOriginAlert
            ? 1
            : isOnChainSeg
              ? alertStatusOpacity(alert.status)
              : 0.3

        return (
          <g key={alert.id}
            onMouseEnter={() => setTip({ x: px, y: py - 24, text: `${alert.label} · ${alertStatusLabel(alert.status)}` })}
            onMouseLeave={() => setTip(null)}
            onClick={(e) => {
              e.stopPropagation()
              if (onSelectAlert) onSelectAlert(alert.id)
            }}
            className={onSelectAlert ? 'cursor-pointer' : 'cursor-default'}
            opacity={dotOpacity}
          >
            {/* Ping ring — 仅起点告警在传播链激活时持续 ping;
                其它告警仅在未激活传播链或为 critical 新告警时 ping。
                这里保留原行为以避免与 #11 动画规范冲突;
                #11 后续会统一处理。 */}
            {alert.status === 'new' && (!showChain || isOriginAlert) && (
              <circle cx={px} cy={py} r="5" fill="none" stroke={c} strokeWidth="1.2" opacity="0.8">
                <animate attributeName="r" values="5;14" dur="2.2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.8;0" dur="2.2s" repeatCount="indefinite" />
              </circle>
            )}
            {alert.status === 'acknowledged' && (
              <circle cx={px} cy={py} r="7" fill="none" stroke={c} strokeWidth="1" strokeDasharray="2 3" opacity="0.65" />
            )}
            {/* Solid dot */}
            <circle cx={px} cy={py} r={radius} fill={c} />
            {/* White inner dot for visibility */}
            {alert.status !== 'closed' && (
              <circle cx={px} cy={py} r="1.5" fill="rgba(255,255,255,0.7)" />
            )}
          </g>
        )
      })}

      {/* ═══ Robots (arrow + fixed label, clickable) ═══ */}
      {robots.map((robot) => {
        const seg = segments.find((s) => s.id === robot.segmentId)
        if (!seg) return null
        const from = nodeById(nodes, seg.fromNode)
        const to = nodeById(nodes, seg.toNode)
        if (!from || !to) return null

        const px = lerp(from.x, to.x, robot.progress)
        const py = lerp(from.y, to.y, robot.progress)
        const c = robotFill(robot.status)
        const isSel = robot.id === selectedRobot

        /* Arrow direction */
        const dx = robot.direction * 6
        const triPoints = `${px + dx},${py} ${px - dx / 2},${py - 5} ${px - dx / 2},${py + 5}`

        /* Fixed label position: near segment start, offset above */
        const labelX = from.x + 25
        const labelY = from.y - BAND_W / 2 - 28

        return (
          <g key={robot.id}
            className="cursor-pointer"
            onClick={(e) => { e.stopPropagation(); onSelectRobot(robot.id) }}
          >
            {/* Selected outer ring */}
            {isSel && (
              <circle cx={px} cy={py} r="16" fill="none"
                stroke={c} strokeWidth="2" opacity="0.6"
                strokeDasharray="4 3"
                style={{ animation: 'pm2-glow 1.5s ease-in-out infinite' }}
              />
            )}
            {/* Glow ring */}
            <circle cx={px} cy={py} r="10" fill="none" stroke={c} strokeWidth="1"
              opacity={isSel ? 0.6 : 0.3}
              style={{ animation: 'pm2-glow 2s ease-in-out infinite' }}
            />
            {/* Robot body circle */}
            <circle cx={px} cy={py} r="7" fill={c} opacity={isSel ? 0.4 : 0.2} />
            <circle cx={px} cy={py} r="5" fill={c} />
            {/* Direction arrow inside */}
            <polygon points={triPoints} fill="rgba(255,255,255,0.85)" />

            {/* ── Fixed name label ── */}
            <g>
              <rect x={labelX - 2} y={labelY - 10} width={72} height={16} rx="4"
                fill={isSel ? 'rgba(15,23,42,0.95)' : 'rgba(15,23,42,0.85)'}
                stroke={c} strokeWidth={isSel ? 1.5 : 0.8} />
              <text x={labelX + 34} y={labelY - 2}
                textAnchor="middle" dominantBaseline="central"
                fill={c} fontSize="9" fontWeight="500"
              >
                {robot.name}
              </text>
            </g>

            {/* Thin connecting line from label to robot */}
            <line x1={labelX + 34} y1={labelY + 6} x2={px} y2={py - 8}
              stroke={c} strokeWidth={isSel ? 1 : 0.5} strokeDasharray="2 3"
              opacity={isSel ? 0.7 : 0.4}
            />
          </g>
        )
      })}

      {/* ═══ Hover tooltip ═══ */}
      {tip && (
        <g>
          <rect x={tip.x - 50} y={tip.y - 14} width="100" height="20" rx="6"
            fill="rgba(15,23,42,0.92)" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8"
          />
          <text x={tip.x} y={tip.y}
            textAnchor="middle" dominantBaseline="central"
            fill="rgba(255,255,255,0.9)" fontSize="10"
          >
            {tip.text}
          </text>
        </g>
      )}

      {/* ═══ Legend ═══ */}
      {!showChain && (
        <g transform={`translate(20, ${H - 28})`}>
          {[
            { color: '#f43f5e', label: '高风险' },
            { color: '#f59e0b', label: '中风险' },
            { color: '#3b82f6', label: '低风险' },
            { color: '#334155', label: '正常' },
          ].map((item, i) => (
            <g key={i} transform={`translate(${i * 90}, 0)`}>
              <line x1="0" y1="0" x2="16" y2="0" stroke={item.color} strokeWidth="4" strokeLinecap="round" />
              <text x="22" y="1" dominantBaseline="central" fill="rgba(148,163,184,0.5)" fontSize="10">{item.label}</text>
            </g>
          ))}
          <g transform="translate(400, 0)">
            <circle cx="4" cy="0" r="3.5" fill="#f43f5e" />
            <text x="14" y="1" dominantBaseline="central" fill="rgba(148,163,184,0.5)" fontSize="10">告警点(悬停查看,点击查传播链)</text>
          </g>
          <g transform="translate(640, 0)">
            <circle cx="4" cy="0" r="3.5" fill="#22d3ee" />
            <text x="14" y="1" dominantBaseline="central" fill="rgba(148,163,184,0.5)" fontSize="10">机器人</text>
          </g>
          <g transform="translate(720, 0)">
            <line x1="0" y1="0" x2="16" y2="0" stroke="rgba(148,163,184,0.65)" strokeWidth="3" strokeLinecap="round" />
            <text x="22" y="1" dominantBaseline="central" fill="rgba(148,163,184,0.5)" fontSize="10">已巡检</text>
          </g>
          <g transform="translate(805, 0)">
            <line x1="0" y1="0" x2="16" y2="0" stroke="rgba(148,163,184,0.65)" strokeWidth="3" strokeLinecap="round" strokeDasharray="5 4" />
            <text x="22" y="1" dominantBaseline="central" fill="rgba(148,163,184,0.5)" fontSize="10">未巡检</text>
          </g>
        </g>
      )}

      {/* ═══ Legend(传播链激活态) ═══ */}
      {showChain && propagationChain && (
        <g transform={`translate(20, ${H - 50})`}>
          {/* 标题行 */}
          <text x="0" y="0" fill="rgba(199,210,254,0.85)" fontSize="11" fontWeight="600">
            拓扑传播链 · {getAlertTypeLabel(propagationChain.alertType)} · {getPropagationDirectionLabel(propagationChain.direction)}
          </text>
          {/* 图例三档 */}
          <g transform="translate(0, 18)">
            <g transform="translate(0, 0)">
              <line x1="0" y1="0" x2="20" y2="0" stroke={PROP_ORIGIN} strokeWidth="6" strokeLinecap="round" opacity="0.85" />
              <text x="26" y="1" dominantBaseline="central" fill="rgba(148,163,184,0.7)" fontSize="10">起点</text>
            </g>
            <g transform="translate(80, 0)">
              <line x1="0" y1="0" x2="20" y2="0" stroke={PROP_RELATED} strokeWidth="5" strokeLinecap="round" strokeDasharray="6 4" />
              <text x="26" y="1" dominantBaseline="central" fill="rgba(148,163,184,0.7)" fontSize="10">关联区段</text>
            </g>
            <g transform="translate(180, 0)">
              <line x1="0" y1="0" x2="20" y2="0" stroke={PROP_INFERRED} strokeWidth="5" strokeLinecap="round" strokeDasharray="3 4" opacity="0.6" />
              <text x="26" y="1" dominantBaseline="central" fill="rgba(148,163,184,0.7)" fontSize="10">推测影响</text>
            </g>
            <g transform="translate(290, 0)">
              <text x="0" y="1" dominantBaseline="central" fill="rgba(148,163,184,0.5)" fontSize="10">
                {propagationChain.related.length} 段已关联 · {propagationChain.inferred.length} 段推测
              </text>
            </g>
          </g>
        </g>
      )}
    </svg>
  )
}
