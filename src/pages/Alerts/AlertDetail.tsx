import { useState } from 'react'
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Camera,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileText,
  Gauge,
  Minus,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { AlertGradingBasis } from './AlertGradingBasis'
import { MultiSourceJudgmentCard } from './MultiSourceJudgmentCard'
import { SegmentMiniMap } from './SegmentMiniMap'
import { buildAIJudgment } from '@/utils/aiJudgment'
import type { AlertItem } from '@/types/dashboard'
import type { SegmentAlertHistory } from '@/types/alerts'

/* ───────── Collapsible section wrapper ───────── */

function Section({
  icon,
  title,
  defaultOpen = false,
  children,
}: {
  icon: React.ReactNode
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="shrink-0 border-b border-white/6">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-2 px-5 py-3.5 text-left transition hover:bg-white/[0.02]"
      >
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-500">
          {icon}
          {title}
        </div>
        <ChevronDown
          className={`h-3.5 w-3.5 text-slate-500 transition-transform ${open ? 'rotate-0' : '-rotate-90'}`}
        />
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  )
}

/* ───────── helpers ───────── */

function toneOf(severity: AlertItem['severity']) {
  if (severity === 'critical') return 'danger' as const
  if (severity === 'warning') return 'warning' as const
  return 'neutral' as const
}

function statusLabel(status: AlertItem['status']) {
  if (status === 'new') return '待处置'
  if (status === 'acknowledged') return '已确认'
  return '已关闭'
}

function statusTone(status: AlertItem['status']) {
  if (status === 'new') return 'danger' as const
  if (status === 'acknowledged') return 'warning' as const
  return 'good' as const
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return '刚刚'
  if (m < 60) return `${m} 分钟前`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} 小时前`
  return `${Math.floor(h / 24)} 天前`
}

function trendIcon(trend: 'up' | 'down' | 'steady') {
  if (trend === 'up') return <ArrowUp className="h-3 w-3 text-rose-400" />
  if (trend === 'down') return <ArrowDown className="h-3 w-3 text-emerald-400" />
  return <Minus className="h-3 w-3 text-slate-500" />
}

/* ───────── Capture Snapshot ───────── */

/** Anomaly type → visual config for the simulated capture */
function getAnomalyConfig(alert: AlertItem) {
  const title = alert.title.toLowerCase()
  if (title.includes('热像') || title.includes('温升') || title.includes('温度'))
    return { type: 'thermal' as const, label: '热像异常区域', color: '#f43f5e', fillColors: ['rgba(255,50,20,0.8)', 'rgba(255,120,0,0.5)', 'rgba(255,180,0,0.15)'] }
  if (title.includes('湿度') || title.includes('渗漏') || title.includes('积水'))
    return { type: 'moisture' as const, label: '湿度异常区域', color: '#22d3ee', fillColors: ['rgba(34,211,238,0.6)', 'rgba(56,189,248,0.3)', 'rgba(34,211,238,0.08)'] }
  if (title.includes('气体') || title.includes('ch'))
    return { type: 'gas' as const, label: '气体浓度异常', color: '#a3e635', fillColors: ['rgba(163,230,53,0.5)', 'rgba(132,204,22,0.25)', 'rgba(163,230,53,0.05)'] }
  if (title.includes('振动') || title.includes('结构') || title.includes('螺栓'))
    return { type: 'structural' as const, label: '结构异常标注', color: '#f59e0b', fillColors: ['rgba(245,158,11,0.6)', 'rgba(252,211,77,0.3)', 'rgba(245,158,11,0.08)'] }
  return { type: 'generic' as const, label: '异常区域', color: '#f43f5e', fillColors: ['rgba(244,63,94,0.5)', 'rgba(244,63,94,0.2)', 'rgba(244,63,94,0.05)'] }
}

/** Hash alert.id → deterministic position offset so each alert looks different */
function idToOffset(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0
  return { x: ((Math.abs(h) % 120) - 60), y: ((Math.abs(h >> 8) % 60) - 30) }
}

function CaptureSnapshot({ alert }: { alert: AlertItem }) {
  const cfg = getAnomalyConfig(alert)
  const off = idToOffset(alert.id)
  const W = 480, H = 270

  // Pick wall side and cable tray based on alert hash
  const onRight = (Math.abs(off.x) % 2) === 0
  const trayIndex = Math.abs(off.y) % 3  // 0=upper, 1=mid, 2=lower
  const trayNearY = [90, 135, 180][trayIndex]
  const depth = 0.3 + (Math.abs(off.x) % 40) / 100  // 0.3 ~ 0.7 depth

  // Wall geometry: near edge → far edge
  const wallNearX = onRight ? 480 : 0
  const wallFarX  = onRight ? 320 : 160
  const farY = 70 + (trayNearY / 270) * 130

  // Interpolate position at depth on the wall
  const cx = wallNearX + (wallFarX - wallNearX) * depth
  const cy = trayNearY + (farY - trayNearY) * depth
  const scale = 1 - depth * 0.4  // perspective shrink

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ aspectRatio: '16/9' }}>
      {/* Background */}
      <rect width={W} height={H} fill="#070f19" />

      {/* Tunnel structure — simplified perspective */}
      <polygon points="0,0 160,70 160,200 0,270" fill="#111d2a" />
      <polygon points="480,0 320,70 320,200 480,270" fill="#101b27" />
      <polygon points="0,0 480,0 320,70 160,70" fill="#0c1720" />
      <polygon points="0,270 480,270 320,200 160,200" fill="#0e1922" />
      <rect x="160" y="70" width="160" height="130" fill="#0a151f" />

      {/* Perspective lines */}
      <line x1="0" y1="0" x2="160" y2="70" stroke="rgba(100,130,155,0.18)" strokeWidth="1" />
      <line x1="480" y1="0" x2="320" y2="70" stroke="rgba(100,130,155,0.18)" strokeWidth="1" />
      <line x1="0" y1="270" x2="160" y2="200" stroke="rgba(80,110,135,0.22)" strokeWidth="1.5" />
      <line x1="480" y1="270" x2="320" y2="200" stroke="rgba(80,110,135,0.22)" strokeWidth="1.5" />

      {/* Cable trays — left */}
      {[90, 135, 180].map((nearY, i) => (
        <line key={`lt-${i}`} x1="0" y1={nearY} x2="160" y2={70 + (nearY / 270) * 130} stroke="rgba(100,130,155,0.15)" strokeWidth={2.5 - i * 0.5} />
      ))}
      {/* Cable trays — right */}
      {[90, 135, 180].map((nearY, i) => (
        <line key={`rt-${i}`} x1="480" y1={nearY} x2="320" y2={70 + (nearY / 270) * 130} stroke="rgba(100,130,155,0.15)" strokeWidth={2.5 - i * 0.5} />
      ))}

      {/* Headlight glow */}
      <ellipse cx="240" cy="240" rx="200" ry="80" fill="rgba(140,180,210,0.06)" />

      {/* ── Anomaly visualization ── */}
      <defs>
        <radialGradient id={`snap-anom-${alert.id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={cfg.fillColors[0]} />
          <stop offset="45%" stopColor={cfg.fillColors[1]} />
          <stop offset="100%" stopColor={cfg.fillColors[2]} />
        </radialGradient>
      </defs>

      {/* Anomaly glow on wall */}
      <ellipse cx={cx} cy={cy} rx={45 * scale} ry={28 * scale} fill={`url(#snap-anom-${alert.id})`} />

      {/* Cable fault recolor at anomaly (3 cables along the wall) */}
      {cfg.type === 'thermal' && [-6, 0, 6].map((dy, i) => {
        const x1 = wallNearX + (wallFarX - wallNearX) * (depth - 0.12)
        const y1base = trayNearY + dy + (farY + dy * 0.3 - trayNearY - dy) * (depth - 0.12)
        const x2 = wallNearX + (wallFarX - wallNearX) * (depth + 0.12)
        const y2base = trayNearY + dy + (farY + dy * 0.3 - trayNearY - dy) * (depth + 0.12)
        return (
          <line key={`fc-${i}`}
            x1={x1} y1={y1base} x2={x2} y2={y2base}
            stroke={cfg.fillColors[i] ?? cfg.fillColors[0]}
            strokeWidth={3 * scale} strokeLinecap="round" />
        )
      })}

      {/* Moisture: drip streaks down the wall */}
      {cfg.type === 'moisture' && [-12, 0, 12].map((dx, i) => (
        <line key={`drip-${i}`}
          x1={cx + dx * scale} y1={cy - 10 * scale}
          x2={cx + dx * scale + 2} y2={cy + 22 * scale + i * 5}
          stroke={cfg.fillColors[0]} strokeWidth={1.5 * scale} strokeLinecap="round" opacity={0.7 - i * 0.15} />
      ))}

      {/* Detection box */}
      <rect x={cx - 42 * scale} y={cy - 24 * scale} width={84 * scale} height={48 * scale} rx="3"
        fill="none" stroke={cfg.color} strokeWidth="1.5" strokeDasharray="4,3" opacity="0.7" />

      {/* Label */}
      <rect x={cx - 42 * scale} y={cy - 24 * scale - 13} width={cfg.label.length * 7 + 10} height="12" rx="2" fill="rgba(0,0,0,0.65)" />
      <text x={cx - 38 * scale} y={cy - 24 * scale - 4} fill={cfg.color} fontSize="8" fontWeight="600" fontFamily="sans-serif">
        {cfg.label}
      </text>

      {/* Timestamp bar */}
      <rect x="8" y={H - 22} width="170" height="16" rx="3" fill="rgba(0,0,0,0.6)" />
      <text x="14" y={H - 10} fill="#94a3b8" fontSize="9" fontFamily="sans-serif">
        {new Date(alert.occurredAt).toLocaleString('zh-CN')} · {alert.segmentId}
      </text>

      {/* Camera info */}
      <rect x={W - 78} y="8" width="70" height="14" rx="2" fill="rgba(0,0,0,0.5)" />
      <text x={W - 72} y="18" fill="#64748b" fontSize="8" fontFamily="sans-serif">Front Camera</text>

      {/* Scanline hint */}
      <line x1="0" y1={110 + off.y * 0.5} x2={W} y2={110 + off.y * 0.5} stroke="rgba(100,200,255,0.06)" strokeWidth="1" />
    </svg>
  )
}

/* ───────── Main component ───────── */

export function AlertDetail({
  alert,
  allAlerts,
  history,
  onStatusChange,
}: {
  alert: AlertItem
  allAlerts: AlertItem[]
  history: SegmentAlertHistory[]
  onStatusChange: (alertId: string, status: AlertItem['status']) => void
}) {
  const [note, setNote] = useState('')
  const [notes, setNotes] = useState<{ text: string; time: string }[]>([])

  const segHistory = history.find((h) => h.segmentId === alert.segmentId)
  const judgment = buildAIJudgment(alert, allAlerts)

  const handleAddNote = () => {
    if (!note.trim()) return
    setNotes((prev) => [
      { text: note.trim(), time: new Date().toLocaleTimeString('zh-CN') },
      ...prev,
    ])
    setNote('')
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* ===== Header ===== */}
      <div className="shrink-0 border-b border-white/6 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Badge tone={toneOf(alert.severity)}>{alert.severity}</Badge>
              <Badge tone={statusTone(alert.status)}>{statusLabel(alert.status)}</Badge>
            </div>
            <h3 className="mt-2 text-lg font-semibold text-white">{alert.title}</h3>
          </div>
          <span className="shrink-0 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-1.5 text-xs text-slate-400">
            {alert.id}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div className="text-slate-500">区段</div>
          <div className="text-white">{alert.segmentId}</div>
          <div className="text-slate-500">发生时间</div>
          <div className="text-white">{relativeTime(alert.occurredAt)}</div>
          <div className="text-slate-500">检测证据</div>
          <div className="text-white">{alert.evidence}</div>
          <div className="text-slate-500">偏离值</div>
          <div className="text-white">{alert.value}</div>
        </div>
      </div>

      {/* ===== Module 1: 分级依据 ===== */}
      <Section icon={<Gauge className="h-3.5 w-3.5" />} title="分级依据" defaultOpen>
        <AlertGradingBasis
          alert={alert}
          allAlerts={allAlerts}
          history={segHistory}
        />
      </Section>

      {/* ===== Module 1: 关联视觉证据 ===== */}
      <Section icon={<Camera className="h-3.5 w-3.5" />} title="抓拍证据">
        <div className="relative overflow-hidden rounded-xl border border-white/8 bg-[#060e18]">
          <CaptureSnapshot alert={alert} />
        </div>
      </Section>

      {/* ===== Module 2: 区段定位小地图 ===== */}
      <Section icon={<FileText className="h-3.5 w-3.5" />} title="区段定位">
        <SegmentMiniMap highlightSegment={alert.segmentId} alerts={allAlerts} />
      </Section>

      {/* ===== Module 3: 历史关联 ===== */}
      {segHistory && (
        <Section icon={<Clock className="h-3.5 w-3.5" />} title="区段历史">
          <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
            <div className="text-sm font-medium text-white">
              {alert.segmentId} 区段近期告警
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-white/6 bg-white/[0.02] px-3 py-2">
                <div className="text-[11px] text-slate-500">近 7 天</div>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="text-xl font-semibold text-white">{segHistory.recent7d}</span>
                  <span className="text-xs text-slate-500">次</span>
                  {trendIcon(segHistory.trend)}
                </div>
              </div>
              <div className="rounded-lg border border-white/6 bg-white/[0.02] px-3 py-2">
                <div className="text-[11px] text-slate-500">近 30 天</div>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="text-xl font-semibold text-white">{segHistory.recent30d}</span>
                  <span className="text-xs text-slate-500">次</span>
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
              <span>高频类型：</span>
              <Badge tone="neutral">{segHistory.topType}</Badge>
              <span className="ml-auto flex items-center gap-1">
                趋势 {trendIcon(segHistory.trend)}
                <span>{segHistory.trend === 'up' ? '上升' : segHistory.trend === 'down' ? '下降' : '平稳'}</span>
              </span>
            </div>
          </div>
        </Section>
      )}

      {/* ===== Module 4: 处置操作 ===== */}
      <Section icon={<ShieldCheck className="h-3.5 w-3.5" />} title="处置操作" defaultOpen>
        <MultiSourceJudgmentCard
          judgment={judgment}
          onAdopt={(item) => {
            setNote(`AI辅助研判：${item.summary}`)
          }}
        />

        {/* 状态流转按钮 */}
        <div className="mt-4 flex items-center gap-2">
          {alert.status === 'new' && (
            <Button
              variant="primary"
              className="gap-1.5 text-xs"
              onClick={() => onStatusChange(alert.id, 'acknowledged')}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              确认告警
            </Button>
          )}
          {alert.status === 'acknowledged' && (
            <Button
              variant="primary"
              className="gap-1.5 text-xs"
              onClick={() => onStatusChange(alert.id, 'closed')}
            >
              <XCircle className="h-3.5 w-3.5" />
              关闭告警
            </Button>
          )}
          {alert.status === 'closed' && (
            <div className="flex items-center gap-2 text-sm text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
              该告警已关闭
            </div>
          )}
          {alert.status !== 'closed' && (
            <Button
              variant="ghost"
              className="gap-1.5 text-xs"
              onClick={() => onStatusChange(alert.id, 'closed')}
            >
              直接关闭
            </Button>
          )}
        </div>

        {/* 备注 */}
        <div className="mt-4">
          <div className="flex gap-2">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
              placeholder="输入处置备注…"
              className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-cyan-400/30 focus:outline-none"
            />
            <Button variant="ghost" className="shrink-0 text-xs" onClick={handleAddNote}>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
          {notes.length > 0 && (
            <div className="mt-3 space-y-2">
              {notes.map((n, i) => (
                <div key={i} className="rounded-lg border border-white/6 bg-white/[0.02] px-3 py-2">
                  <div className="text-sm text-white">{n.text}</div>
                  <div className="mt-1 text-[10px] text-slate-500">
                    值班员 · Cris · {n.time}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Section>
    </div>
  )
}
