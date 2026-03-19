import type { CrossSectionSensor, PipeSegment } from '@/types/spatial'

/* ───────── Sensor icon/color ───────── */

function sensorColor(status: CrossSectionSensor['status']) {
  if (status === 'danger') return { fill: '#f43f5e', text: '#fda4af' }
  if (status === 'warning') return { fill: '#f59e0b', text: '#fcd34d' }
  return { fill: '#22d3ee', text: '#a5f3fc' }
}

function sensorIcon(type: CrossSectionSensor['type']) {
  if (type === 'temperature') return '🌡'
  if (type === 'humidity') return '💧'
  if (type === 'gas') return '⚗'
  if (type === 'water') return '🌊'
  return '📷'
}

/* ───────── Component ───────── */

export function CrossSectionView({
  segment,
  sensors,
}: {
  segment: PipeSegment
  sensors: CrossSectionSensor[]
}) {
  const W = 560, H = 320

  // 隧道剖面参数（等轴测视角）
  const cx = W / 2, cy = 150
  const outerW = 200, outerH = 150
  const depth = 60 // 纵深偏移
  const isoX = 30  // 等轴 x 偏移

  // 前面矩形
  const frontTL = { x: cx - outerW / 2, y: cy - outerH / 2 }
  const frontTR = { x: cx + outerW / 2, y: cy - outerH / 2 }
  const frontBL = { x: cx - outerW / 2, y: cy + outerH / 2 }
  const frontBR = { x: cx + outerW / 2, y: cy + outerH / 2 }

  // 后面矩形（等轴偏移）
  const backTL = { x: frontTL.x + isoX, y: frontTL.y - depth }
  const backTR = { x: frontTR.x + isoX, y: frontTR.y - depth }
  const backBL = { x: frontBL.x + isoX, y: frontBL.y - depth }
  const backBR = { x: frontBR.x + isoX, y: frontBR.y - depth }

  // 电缆托架 y 位置（从上到下的比例）
  const trayRatios = [0.3, 0.55, 0.8]

  // 风险色
  const riskColor = segment.riskLevel >= 0.8 ? 'rgba(244,63,94,0.08)'
    : segment.riskLevel >= 0.6 ? 'rgba(245,158,11,0.06)'
    : 'rgba(34,211,238,0.04)'

  return (
    <div className="rounded-xl border border-white/8 bg-[#060e18] p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
          {segment.id} 区段剖面视图
        </span>
        <span className="text-[10px] text-slate-600">
          等轴测示意 · 非精确比例
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {/* ── Back wall ── */}
        <polygon
          points={`${backTL.x},${backTL.y} ${backTR.x},${backTR.y} ${backBR.x},${backBR.y} ${backBL.x},${backBL.y}`}
          fill="#0d161e" stroke="rgba(100,130,155,0.2)" strokeWidth="0.8"
        />

        {/* ── Top face ── */}
        <polygon
          points={`${frontTL.x},${frontTL.y} ${frontTR.x},${frontTR.y} ${backTR.x},${backTR.y} ${backTL.x},${backTL.y}`}
          fill="#0a1420" stroke="rgba(100,130,155,0.15)" strokeWidth="0.5"
        />

        {/* ── Right face ── */}
        <polygon
          points={`${frontTR.x},${frontTR.y} ${backTR.x},${backTR.y} ${backBR.x},${backBR.y} ${frontBR.x},${frontBR.y}`}
          fill="#0c1824" stroke="rgba(100,130,155,0.15)" strokeWidth="0.5"
        />

        {/* ── Bottom face ── */}
        <polygon
          points={`${frontBL.x},${frontBL.y} ${frontBR.x},${frontBR.y} ${backBR.x},${backBR.y} ${backBL.x},${backBL.y}`}
          fill="#0e1a26" stroke="rgba(100,130,155,0.12)" strokeWidth="0.5"
        />

        {/* ── Risk tint overlay inside tunnel ── */}
        <polygon
          points={`${frontTL.x + 2},${frontTL.y + 2} ${frontTR.x - 2},${frontTR.y + 2} ${frontBR.x - 2},${frontBR.y - 2} ${frontBL.x + 2},${frontBL.y - 2}`}
          fill={riskColor}
        />

        {/* ── Cable trays (left wall, front face) ── */}
        {trayRatios.map((r, i) => {
          const y = frontTL.y + outerH * r
          const yBack = backTL.y + outerH * r
          const cableColors = ['#b03030', '#2d2d2d', '#c88520']
          return (
            <g key={`tray-l-${i}`}>
              {/* Tray bracket front */}
              <line x1={frontTL.x} y1={y} x2={frontTL.x + 20} y2={y}
                stroke="rgba(120,145,165,0.4)" strokeWidth="2" />
              {/* Tray depth line */}
              <line x1={frontTL.x + 18} y1={y} x2={backTL.x + 18} y2={yBack}
                stroke="rgba(120,145,165,0.2)" strokeWidth="1.5" />
              {/* Cables */}
              {cableColors.map((c, ci) => (
                <line key={ci}
                  x1={frontTL.x + 6 + ci * 5} y1={y - 3}
                  x2={backTL.x + 6 + ci * 5} y2={yBack - 3}
                  stroke={c} strokeWidth="3" strokeLinecap="round" opacity="0.7"
                />
              ))}
            </g>
          )
        })}

        {/* ── Cable trays (right wall, front face) ── */}
        {trayRatios.map((r, i) => {
          const y = frontTR.y + outerH * r
          const yBack = backTR.y + outerH * r
          const cableColors = ['#1a5276', '#2d2d2d', '#1e8449']
          return (
            <g key={`tray-r-${i}`}>
              <line x1={frontTR.x} y1={y} x2={frontTR.x - 20} y2={y}
                stroke="rgba(120,145,165,0.4)" strokeWidth="2" />
              <line x1={frontTR.x - 18} y1={y} x2={backTR.x - 18} y2={yBack}
                stroke="rgba(120,145,165,0.2)" strokeWidth="1.5" />
              {cableColors.map((c, ci) => (
                <line key={ci}
                  x1={frontTR.x - 6 - ci * 5} y1={y - 3}
                  x2={backTR.x - 6 - ci * 5} y2={yBack - 3}
                  stroke={c} strokeWidth="3" strokeLinecap="round" opacity="0.7"
                />
              ))}
            </g>
          )
        })}

        {/* ── Floor rail ── */}
        <line x1={cx - 30} y1={frontBL.y - 5} x2={cx - 30 + isoX} y2={backBL.y - 5}
          stroke="rgba(90,115,140,0.3)" strokeWidth="2" />
        <line x1={cx + 30} y1={frontBR.y - 5} x2={cx + 30 + isoX} y2={backBR.y - 5}
          stroke="rgba(90,115,140,0.3)" strokeWidth="2" />

        {/* ── Ceiling light ── */}
        <rect x={cx - 15} y={frontTL.y + 4} width="30" height="3" rx="1.5"
          fill="rgba(200,220,240,0.4)" />
        <ellipse cx={cx} cy={frontTL.y + 12} rx="25" ry="8"
          fill="rgba(170,200,225,0.05)" />

        {/* ── Front face outline (drawn last for z-order) ── */}
        <polygon
          points={`${frontTL.x},${frontTL.y} ${frontTR.x},${frontTR.y} ${frontBR.x},${frontBR.y} ${frontBL.x},${frontBL.y}`}
          fill="none" stroke="rgba(100,130,155,0.3)" strokeWidth="1.5"
        />

        {/* ── Sensor markers ── */}
        {sensors.map((sensor) => {
          const sc = sensorColor(sensor.status)
          let sx: number, sy: number
          switch (sensor.position) {
            case 'top-left':    sx = frontTL.x + 40;  sy = frontTL.y + 20; break
            case 'top-right':   sx = frontTR.x - 40;  sy = frontTR.y + 20; break
            case 'bottom-left': sx = frontBL.x + 40;  sy = frontBL.y - 25; break
            case 'bottom-right':sx = frontBR.x - 40;  sy = frontBR.y - 25; break
            default:            sx = cx;               sy = cy;             break
          }
          return (
            <g key={sensor.id}>
              <circle cx={sx} cy={sy} r="10" fill="rgba(0,0,0,0.5)" stroke={sc.fill} strokeWidth="1" />
              <text x={sx} y={sy + 1} textAnchor="middle" dominantBaseline="central" fontSize="9">
                {sensorIcon(sensor.type)}
              </text>
              {/* Value label */}
              <text x={sx} y={sy + 20} textAnchor="middle" fill={sc.text} fontSize="10" fontWeight="500">
                {sensor.value}
              </text>
              <text x={sx} y={sy + 32} textAnchor="middle" fill="rgba(148,163,184,0.5)" fontSize="8">
                {sensor.label}
              </text>
            </g>
          )
        })}

        {/* ── Dimension labels ── */}
        <text x={cx} y={H - 10} textAnchor="middle" fill="rgba(148,163,184,0.4)" fontSize="10">
          管道长度 {segment.length}m · 温度 {segment.temperatureC}°C · 湿度 {segment.humidityPct}%
        </text>
      </svg>
    </div>
  )
}
