import { useState } from 'react'
import type { PipeAlert, PipeNode, PipeSegment, RobotOnMap } from '@/types/spatial'

/* ───────── Inject keyframes once ───────── */

const STYLE_ID = '__pipe-map-v2'
function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return
  const el = document.createElement('style')
  el.id = STYLE_ID
  el.textContent = `
    @keyframes pm2-ping { 0% { r: 5; opacity: 0.9; } 100% { r: 14; opacity: 0; } }
    @keyframes pm2-glow { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }
    @keyframes pm2-flow { 0% { stroke-dashoffset: 24; } 100% { stroke-dashoffset: 0; } }
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

function robotFill(s: RobotOnMap['status']) {
  if (s === 'inspecting') return '#22d3ee'
  if (s === 'moving') return '#34d399'
  return '#64748b'
}

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
  onSelectSegment,
  onSelectRobot,
}: {
  nodes: PipeNode[]
  segments: PipeSegment[]
  alerts: PipeAlert[]
  robots: RobotOnMap[]
  selectedSegment: string | null
  selectedRobot: string | null
  onSelectSegment: (id: string) => void
  onSelectRobot: (id: string) => void
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
      </defs>
      <rect width={W} height={H} fill="url(#pm2-grid)" />

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

        return (
          <g key={seg.id} className="cursor-pointer" onClick={() => onSelectSegment(seg.id)}>
            {/* Selection glow */}
            {isSel && (
              <line x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                stroke="rgba(34,211,238,0.15)" strokeWidth={bw + 16} strokeLinecap="round"
              />
            )}

            {/* Pipe background band */}
            <line x1={from.x} y1={from.y} x2={to.x} y2={to.y}
              stroke={bg} strokeWidth={bw} strokeLinecap="round"
            />

            {/* Pipe border (top & bottom edges) */}
            <line x1={from.x} y1={from.y} x2={to.x} y2={to.y}
              stroke={color} strokeWidth={bw} strokeLinecap="round"
              opacity={0.35} fill="none"
            />
            {/* Pipe center bright line */}
            <line x1={from.x} y1={from.y} x2={to.x} y2={to.y}
              stroke={color} strokeWidth={3} strokeLinecap="round"
              opacity={isSel ? 0.9 : 0.6}
            />

            {/* Flow animation (dashed overlay) */}
            <line x1={from.x} y1={from.y} x2={to.x} y2={to.y}
              stroke={color} strokeWidth={1.5} strokeLinecap="round"
              strokeDasharray="3 21" opacity={0.2}
              style={{ animation: 'pm2-flow 2.5s linear infinite' }}
            />

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

      {/* ═══ Alert dots (no text, tooltip on hover) ═══ */}
      {alerts.map((alert) => {
        const seg = segments.find((s) => s.id === alert.segmentId)
        if (!seg) return null
        const from = nodeById(nodes, seg.fromNode)
        const to = nodeById(nodes, seg.toNode)
        if (!from || !to) return null
        const px = lerp(from.x, to.x, alert.progress)
        const py = lerp(from.y, to.y, alert.progress)
        const c = alertDot(alert.severity)

        return (
          <g key={alert.id}
            onMouseEnter={() => setTip({ x: px, y: py - 24, text: alert.label })}
            onMouseLeave={() => setTip(null)}
            className="cursor-default"
          >
            {/* Ping ring */}
            <circle cx={px} cy={py} r="5" fill="none" stroke={c} strokeWidth="1.2" opacity="0.8">
              <animate attributeName="r" values="5;14" dur="2.2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;0" dur="2.2s" repeatCount="indefinite" />
            </circle>
            {/* Solid dot */}
            <circle cx={px} cy={py} r="4" fill={c} />
            {/* White inner dot for visibility */}
            <circle cx={px} cy={py} r="1.5" fill="rgba(255,255,255,0.7)" />
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
          <text x="14" y="1" dominantBaseline="central" fill="rgba(148,163,184,0.5)" fontSize="10">告警点（悬停查看）</text>
        </g>
        <g transform="translate(560, 0)">
          <circle cx="4" cy="0" r="3.5" fill="#22d3ee" />
          <text x="14" y="1" dominantBaseline="central" fill="rgba(148,163,184,0.5)" fontSize="10">机器人</text>
        </g>
      </g>
    </svg>
  )
}
