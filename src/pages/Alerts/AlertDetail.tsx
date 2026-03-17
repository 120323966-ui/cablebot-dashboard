import { useState } from 'react'
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Camera,
  CheckCircle2,
  Clock,
  FileText,
  Minus,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { SegmentMiniMap } from './SegmentMiniMap'
import type { AlertItem } from '@/types/dashboard'
import type { SegmentAlertHistory } from '@/types/alerts'

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

      {/* ===== Module 1: 关联视觉证据 ===== */}
      <div className="shrink-0 border-b border-white/6 p-5">
        <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-500">
          <Camera className="h-3.5 w-3.5" />
          抓拍证据
        </div>
        {/* 模拟摄像头抓拍画面 */}
        <div className="relative aspect-video overflow-hidden rounded-xl border border-white/8 bg-[#060e18]">
          {/* 模拟隧道截图 — 用渐变+色块表示 */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_40%,rgba(20,30,45,1),rgba(6,14,24,1))]" />
          {/* 隧道轮廓 */}
          <div className="absolute inset-[15%] rounded-[50%] border border-white/[0.06] bg-[radial-gradient(circle_at_50%_30%,rgba(40,55,75,0.4),transparent_60%)]" />
          {/* 模拟标注框 */}
          <div className="absolute right-[18%] top-[20%] h-[30%] w-[25%] rounded-lg border border-rose-400/50">
            <div className="absolute -top-5 left-0 whitespace-nowrap text-[10px] text-rose-300">
              异常区域标注
            </div>
          </div>
          {/* 时间戳 overlay */}
          <div className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-[10px] text-slate-300">
            {new Date(alert.occurredAt).toLocaleString('zh-CN')} · {alert.segmentId}
          </div>
          {/* 伪彩色热像 overlay */}
          {alert.severity === 'critical' && (
            <div className="absolute right-[20%] top-[25%] h-[20%] w-[18%] rounded-full bg-[radial-gradient(circle,rgba(255,60,30,0.35),rgba(255,140,0,0.15),transparent)]" />
          )}
        </div>
      </div>

      {/* ===== Module 2: 区段定位小地图 ===== */}
      <div className="shrink-0 border-b border-white/6 p-5">
        <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-500">
          <FileText className="h-3.5 w-3.5" />
          区段定位
        </div>
        <SegmentMiniMap highlightSegment={alert.segmentId} alerts={allAlerts} />
      </div>

      {/* ===== Module 3: 历史关联 ===== */}
      {segHistory && (
        <div className="shrink-0 border-b border-white/6 p-5">
          <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-500">
            <Clock className="h-3.5 w-3.5" />
            区段历史
          </div>
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
        </div>
      )}

      {/* ===== Module 4: 处置操作 ===== */}
      <div className="shrink-0 p-5">
        <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-500">
          <ShieldCheck className="h-3.5 w-3.5" />
          处置操作
        </div>

        {/* 状态流转按钮 */}
        <div className="flex items-center gap-2">
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
      </div>
    </div>
  )
}
