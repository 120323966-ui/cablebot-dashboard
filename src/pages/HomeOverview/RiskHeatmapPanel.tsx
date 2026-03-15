import { Card } from '@/components/ui/Card'
import type { HeatCell, RiskHeatmap } from '@/types/dashboard'

function colorOf(cell: HeatCell) {
  if (cell.risk >= 0.8) return 'from-rose-500/90 to-rose-300/70'
  if (cell.risk >= 0.55) return 'from-amber-400/85 to-amber-200/65'
  if (cell.risk >= 0.35) return 'from-sky-400/75 to-cyan-200/50'
  return 'from-emerald-400/60 to-emerald-200/40'
}

export function RiskHeatmapPanel({ risk }: { risk: RiskHeatmap }) {
  return (
    <Card className="h-full" eyebrow="Risk Map" title="区段风险热力图">
      <div className="space-y-3">
        <div className="grid grid-cols-[64px_repeat(8,minmax(0,1fr))] gap-2 text-center text-xs text-slate-500">
          <div />
          {risk.columns.map((col) => (
            <div key={col}>{col}</div>
          ))}
        </div>
        {risk.rows.map((row, rowIndex) => (
          <div key={row} className="grid grid-cols-[64px_repeat(8,minmax(0,1fr))] gap-2">
            <div className="flex items-center text-xs text-slate-500">{row}</div>
            {risk.columns.map((_, colIndex) => {
              const cell = risk.cells.find((item) => item.x === colIndex && item.y === rowIndex)
              if (!cell) return <div key={`${rowIndex}-${colIndex}`} className="h-16 rounded-2xl border border-white/5 bg-white/[0.02]" />
              return (
                <div key={`${rowIndex}-${colIndex}`} className="group relative h-16 overflow-hidden rounded-2xl border border-white/8 bg-slate-950/30">
                  <div className={`absolute inset-0 bg-gradient-to-br ${colorOf(cell)}`} />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.22),transparent_50%)] opacity-60" />
                  <div className="relative flex h-full items-end justify-between p-3">
                    <div className="text-xs font-medium text-white">{Math.round(cell.risk * 100)}</div>
                    <div className="hidden text-[11px] text-white/80 xl:block">{cell.label}</div>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </Card>
  )
}
