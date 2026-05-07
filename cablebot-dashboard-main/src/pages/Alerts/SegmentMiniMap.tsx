import type { AlertItem } from '@/types/dashboard'

const SEGMENTS = ['A1', 'A2', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3']

const COLS = ['A', 'B', 'C']
const ROWS = ['1', '2', '3']

// 每个区段在网格中的坐标 (col, row) 和颜色级别
function segPos(id: string): { col: number; row: number } | null {
  const c = COLS.indexOf(id[0])
  const r = ROWS.indexOf(id[1])
  if (c < 0 || r < 0) return null
  return { col: c, row: r }
}

export function SegmentMiniMap({
  highlightSegment,
  alerts,
}: {
  highlightSegment: string | null
  alerts: AlertItem[]
}) {
  const cellW = 68, cellH = 36, gap = 4
  const padX = 32, padY = 28
  const totalW = COLS.length * cellW + (COLS.length - 1) * gap + padX * 2
  const totalH = ROWS.length * cellH + (ROWS.length - 1) * gap + padY * 2 + 16

  // 每个区段的告警数量（仅 new + acknowledged）
  const countMap: Record<string, number> = {}
  for (const a of alerts) {
    if (a.status !== 'closed') {
      countMap[a.segmentId] = (countMap[a.segmentId] || 0) + 1
    }
  }

  // 最高严重等级
  const severityMap: Record<string, AlertItem['severity']> = {}
  for (const a of alerts) {
    if (a.status === 'closed') continue
    const cur = severityMap[a.segmentId]
    if (!cur || a.severity === 'critical' || (a.severity === 'warning' && cur === 'info')) {
      severityMap[a.segmentId] = a.severity
    }
  }

  function cellFill(id: string, isHighlight: boolean) {
    if (isHighlight) return 'rgba(34,211,238,0.2)'
    const sev = severityMap[id]
    if (sev === 'critical') return 'rgba(244,63,94,0.18)'
    if (sev === 'warning') return 'rgba(245,158,11,0.12)'
    return 'rgba(255,255,255,0.03)'
  }

  function cellStroke(id: string, isHighlight: boolean) {
    if (isHighlight) return 'rgba(34,211,238,0.6)'
    const sev = severityMap[id]
    if (sev === 'critical') return 'rgba(244,63,94,0.4)'
    if (sev === 'warning') return 'rgba(245,158,11,0.25)'
    return 'rgba(255,255,255,0.08)'
  }

  return (
    <svg viewBox={`0 0 ${totalW} ${totalH}`} className="w-full">
      {/* Column headers */}
      {COLS.map((c, ci) => (
        <text
          key={`ch-${c}`}
          x={padX + ci * (cellW + gap) + cellW / 2}
          y={14}
          textAnchor="middle"
          className="fill-slate-500 text-[10px]"
        >
          {c} 区
        </text>
      ))}

      {/* Row headers */}
      {ROWS.map((r, ri) => (
        <text
          key={`rh-${r}`}
          x={14}
          y={padY + ri * (cellH + gap) + cellH / 2 + 4}
          textAnchor="middle"
          className="fill-slate-500 text-[10px]"
        >
          {r}
        </text>
      ))}

      {/* Cells */}
      {SEGMENTS.map((id) => {
        const pos = segPos(id)
        if (!pos) return null
        const x = padX + pos.col * (cellW + gap)
        const y = padY + pos.row * (cellH + gap)
        const isHL = id === highlightSegment
        const count = countMap[id] || 0

        return (
          <g key={id}>
            <rect
              x={x} y={y} width={cellW} height={cellH} rx={6}
              fill={cellFill(id, isHL)}
              stroke={cellStroke(id, isHL)}
              strokeWidth={isHL ? 1.5 : 0.8}
            />
            {/* 如果高亮，加一个呼吸光晕 */}
            {isHL && (
              <rect
                x={x - 2} y={y - 2} width={cellW + 4} height={cellH + 4} rx={8}
                fill="none"
                stroke="rgba(34,211,238,0.3)"
                strokeWidth={1}
              >
                <animate attributeName="opacity" values="0.3;0.8;0.3" dur="2s" repeatCount="indefinite" />
              </rect>
            )}
            {/* Segment label */}
            <text
              x={x + 10} y={y + cellH / 2 + 1}
              dominantBaseline="central"
              className="fill-slate-300 text-[11px] font-medium"
            >
              {id}
            </text>
            {/* Alert count badge */}
            {count > 0 && (
              <>
                <circle
                  cx={x + cellW - 14} cy={y + cellH / 2}
                  r={9}
                  fill={severityMap[id] === 'critical' ? 'rgba(244,63,94,0.3)' : 'rgba(245,158,11,0.2)'}
                />
                <text
                  x={x + cellW - 14} y={y + cellH / 2 + 1}
                  textAnchor="middle" dominantBaseline="central"
                  className="text-[9px] font-semibold"
                  fill={severityMap[id] === 'critical' ? '#fda4af' : '#fcd34d'}
                >
                  {count}
                </text>
              </>
            )}
          </g>
        )
      })}

      {/* Legend */}
      <g transform={`translate(${padX}, ${totalH - 14})`}>
        <circle cx={0} cy={0} r={4} fill="rgba(244,63,94,0.3)" />
        <text x={8} y={1} dominantBaseline="central" className="fill-slate-500 text-[9px]">critical</text>
        <circle cx={60} cy={0} r={4} fill="rgba(245,158,11,0.2)" />
        <text x={68} y={1} dominantBaseline="central" className="fill-slate-500 text-[9px]">warning</text>
        <circle cx={124} cy={0} r={4} fill="rgba(34,211,238,0.2)" />
        <text x={132} y={1} dominantBaseline="central" className="fill-slate-500 text-[9px]">当前选中</text>
      </g>
    </svg>
  )
}
