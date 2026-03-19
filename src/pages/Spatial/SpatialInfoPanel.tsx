import {
  AlertTriangle,
  Battery,
  Clock,
  Crosshair,
  Gauge,
  MapPin,
  Thermometer,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import type { PipeAlert, PipeSegment, RobotOnMap } from '@/types/spatial'

/* ───────── helpers ───────── */

function riskTone(risk: number) {
  if (risk >= 0.8) return 'danger' as const
  if (risk >= 0.6) return 'warning' as const
  return 'neutral' as const
}

function riskLabel(risk: number) {
  if (risk >= 0.8) return '高风险'
  if (risk >= 0.6) return '中风险'
  if (risk >= 0.4) return '低风险'
  return '正常'
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return '刚刚'
  if (m < 60) return `${m}分钟前`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}小时前`
  return `${Math.floor(h / 24)}天前`
}

function alertTone(severity: PipeAlert['severity']) {
  if (severity === 'critical') return 'danger' as const
  if (severity === 'warning') return 'warning' as const
  return 'neutral' as const
}

/* ───────── Component ───────── */

export function SpatialInfoPanel({
  segment,
  alerts,
  robots,
  onAlertClick,
}: {
  segment: PipeSegment
  alerts: PipeAlert[]
  robots: RobotOnMap[]
  onAlertClick?: (alertId: string) => void
}) {
  const segAlerts = alerts.filter((a) => a.segmentId === segment.id)
  const segRobots = robots.filter((r) => r.segmentId === segment.id)

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* ── Header ── */}
      <div className="shrink-0 border-b border-white/6 p-5">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-white">{segment.id} 区段</span>
          <Badge tone={riskTone(segment.riskLevel)}>{riskLabel(segment.riskLevel)}</Badge>
        </div>
        <div className="mt-1 text-xs text-slate-500">
          长度 {segment.length}m · 最近巡检 {relativeTime(segment.lastInspected)}
        </div>
      </div>

      {/* ── Environment data ── */}
      <div className="shrink-0 border-b border-white/6 p-5">
        <div className="mb-3 text-[11px] uppercase tracking-[0.2em] text-slate-500">
          环境数据
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <Thermometer className="h-3 w-3" /> 温度
            </div>
            <div className={`mt-1 text-xl font-semibold ${segment.temperatureC > 60 ? 'text-rose-400' : segment.temperatureC > 40 ? 'text-amber-400' : 'text-white'}`}>
              {segment.temperatureC}°C
            </div>
          </div>
          <div className="rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <Gauge className="h-3 w-3" /> 湿度
            </div>
            <div className={`mt-1 text-xl font-semibold ${segment.humidityPct > 80 ? 'text-amber-400' : 'text-white'}`}>
              {segment.humidityPct}%
            </div>
          </div>
          <div className="rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <AlertTriangle className="h-3 w-3" /> 活跃告警
            </div>
            <div className={`mt-1 text-xl font-semibold ${segment.activeAlerts > 0 ? 'text-rose-400' : 'text-white'}`}>
              {segment.activeAlerts}
            </div>
          </div>
          <div className="rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <Clock className="h-3 w-3" /> 风险指数
            </div>
            <div className="mt-1 text-xl font-semibold text-white">
              {(segment.riskLevel * 100).toFixed(0)}
            </div>
          </div>
        </div>
      </div>

      {/* ── Robots in segment ── */}
      {segRobots.length > 0 && (
        <div className="shrink-0 border-b border-white/6 p-5">
          <div className="mb-3 text-[11px] uppercase tracking-[0.2em] text-slate-500">
            区段内机器人
          </div>
          <div className="space-y-2">
            {segRobots.map((r) => (
              <div key={r.id} className="rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white">{r.name}</span>
                  <Badge tone={r.status === 'inspecting' ? 'good' : r.status === 'moving' ? 'neutral' : 'warning'}>
                    {r.status === 'inspecting' ? '巡检中' : r.status === 'moving' ? '移动中' : '待命'}
                  </Badge>
                </div>
                <div className="mt-2 flex items-center gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Battery className="h-3 w-3" /> {r.batteryPct.toFixed(0)}%
                  </span>
                  <span className="flex items-center gap-1">
                    <Gauge className="h-3 w-3" /> {r.speedKmh}km/h
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {(r.progress * 100).toFixed(0)}%处
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Alerts in segment ── */}
      {segAlerts.length > 0 && (
        <div className="shrink-0 p-5">
          <div className="mb-3 text-[11px] uppercase tracking-[0.2em] text-slate-500">
            告警标记 · {segAlerts.length} 条
          </div>
          <div className="space-y-2">
            {segAlerts.map((a) => (
              <button
                key={a.id}
                onClick={() => onAlertClick?.(a.id)}
                className="group flex w-full items-center gap-3 rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2 text-left transition hover:border-cyan-400/25 hover:bg-cyan-400/[0.04]"
              >
                <AlertTriangle className={`h-3.5 w-3.5 shrink-0 ${
                  a.severity === 'critical' ? 'text-rose-400' : a.severity === 'warning' ? 'text-amber-400' : 'text-slate-400'
                }`} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-white">{a.label}</div>
                  <div className="text-[10px] text-slate-500">位置 {(a.progress * 100).toFixed(0)}%</div>
                </div>
                <Crosshair className="h-3.5 w-3.5 shrink-0 text-slate-600 transition group-hover:text-cyan-400" />
                <Badge tone={alertTone(a.severity)}>{a.severity}</Badge>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── No alerts ── */}
      {segAlerts.length === 0 && (
        <div className="p-5 text-center text-sm text-slate-600">
          该区段暂无告警标记
        </div>
      )}
    </div>
  )
}
