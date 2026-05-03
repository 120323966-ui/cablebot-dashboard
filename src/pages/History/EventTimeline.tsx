import { AlertTriangle, CheckCircle2, Pause, Radio, ShieldAlert } from 'lucide-react'
import type { AlertRecord, HistoryPageResponse, InspectionRecord } from '@/types/history'

type TimelineEventType = 'task-start' | 'task-end' | 'alert' | 'takeover' | 'pause' | 'comm'

interface TimelineEvent {
  id: string
  type: TimelineEventType
  title: string
  time: string
  segmentId?: string
  severity?: AlertRecord['severity']
  detail: string
}

function eventIcon(type: TimelineEventType, severity?: AlertRecord['severity']) {
  if (type === 'alert') return <AlertTriangle className={`h-3.5 w-3.5 ${severity === 'critical' ? 'text-rose-300' : severity === 'warning' ? 'text-amber-300' : 'text-cyan-300'}`} />
  if (type === 'task-end') return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
  if (type === 'takeover') return <ShieldAlert className="h-3.5 w-3.5 text-violet-300" />
  if (type === 'pause') return <Pause className="h-3.5 w-3.5 text-amber-300" />
  if (type === 'comm') return <Radio className="h-3.5 w-3.5 text-cyan-300" />
  return <CheckCircle2 className="h-3.5 w-3.5 text-slate-300" />
}

function typeLabel(type: TimelineEventType) {
  const map: Record<TimelineEventType, string> = {
    'task-start': '任务开始',
    'task-end': '任务结束',
    alert: '告警',
    takeover: '人工接管',
    pause: '暂停/恢复',
    comm: '通信中断',
  }
  return map[type]
}

function eventTone(type: TimelineEventType, severity?: AlertRecord['severity']) {
  if (type === 'alert' && severity === 'critical') return 'border-rose-400/30 bg-rose-400/10'
  if (type === 'alert' && severity === 'warning') return 'border-amber-400/25 bg-amber-400/10'
  if (type === 'task-end') return 'border-emerald-400/20 bg-emerald-400/8'
  if (type === 'takeover') return 'border-violet-300/20 bg-violet-300/8'
  return 'border-white/8 bg-white/[0.025]'
}

function addMinutes(iso: string, minutes: number) {
  const date = new Date(iso)
  date.setMinutes(date.getMinutes() + minutes)
  return date.toISOString()
}

function buildTimelineEvents(data: HistoryPageResponse): TimelineEvent[] {
  const latestInspection = [...data.inspections].sort((a, b) => b.date.localeCompare(a.date))[0]
  const events: TimelineEvent[] = []

  if (latestInspection) {
    events.push(...inspectionEvents(latestInspection))
  }

  events.push(
    ...data.alertRecords
      .slice(0, 10)
      .map((alert): TimelineEvent => ({
        id: `alert-${alert.id}`,
        type: 'alert',
        title: `${alert.segmentId} · ${alert.type}`,
        time: alert.date,
        segmentId: alert.segmentId,
        severity: alert.severity,
        detail: `${alert.id} · ${alert.severity}`,
      })),
  )

  return events
    .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
    .slice(-14)
}

function inspectionEvents(record: InspectionRecord): TimelineEvent[] {
  const base: TimelineEvent[] = [
    {
      id: `${record.id}-start`,
      type: 'task-start',
      title: `${record.segmentId} 区段巡检开始`,
      time: record.date,
      segmentId: record.segmentId,
      detail: `${record.robotName} · ${record.mode}`,
    },
  ]

  if (record.mode === 'manual') {
    base.push({
      id: `${record.id}-takeover`,
      type: 'takeover',
      title: '人工接管',
      time: addMinutes(record.date, Math.max(3, Math.round(record.durationMinutes * 0.35))),
      segmentId: record.segmentId,
      detail: '操作员介入运动控制',
    })
  }

  if (record.status === 'partial') {
    base.push({
      id: `${record.id}-pause`,
      type: 'pause',
      title: '任务暂停后恢复',
      time: addMinutes(record.date, Math.max(5, Math.round(record.durationMinutes * 0.55))),
      segmentId: record.segmentId,
      detail: '巡检过程存在中断',
    })
  }

  if (record.alertsFound > 2) {
    base.push({
      id: `${record.id}-comm`,
      type: 'comm',
      title: '通信质量波动',
      time: addMinutes(record.date, Math.max(7, Math.round(record.durationMinutes * 0.7))),
      segmentId: record.segmentId,
      detail: '多告警期间链路质量需复核',
    })
  }

  base.push({
    id: `${record.id}-end`,
    type: 'task-end',
    title: `${record.segmentId} 区段巡检结束`,
    time: addMinutes(record.date, record.durationMinutes),
    segmentId: record.segmentId,
    detail: `${record.status} · ${record.checksDone}/${record.checksTotal}`,
  })

  return base
}

export function EventTimeline({
  data,
  onSelectSegment,
}: {
  data: HistoryPageResponse
  onSelectSegment: (segmentId: string) => void
}) {
  const events = buildTimelineEvents(data)

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
          事件时间轴
        </span>
        <span className="text-[9px] text-slate-600">点击区段事件进入空间定位</span>
      </div>

      <div className="overflow-x-auto pb-1 [scrollbar-gutter:stable]">
        <div className="relative flex min-w-[760px] items-stretch gap-2">
          <div className="absolute left-4 right-4 top-[30px] h-px bg-white/8" />
          {events.map((event) => (
            <button
              key={event.id}
              onClick={() => event.segmentId && onSelectSegment(event.segmentId)}
              className={`relative z-10 flex w-[136px] shrink-0 flex-col rounded-xl border px-3 py-2 text-left transition hover:border-cyan-400/25 hover:bg-white/[0.045] ${eventTone(event.type, event.severity)}`}
            >
              <span className="mb-2 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-slate-950">
                {eventIcon(event.type, event.severity)}
              </span>
              <span className="text-[10px] text-slate-500">
                {new Date(event.time).toLocaleDateString('zh-CN', {
                  month: '2-digit',
                  day: '2-digit',
                })}
              </span>
              <span className="mt-0.5 truncate text-[12px] font-medium text-white">
                {event.title}
              </span>
              <span className="mt-1 text-[10px] text-slate-500">{typeLabel(event.type)}</span>
              <span className="mt-1 line-clamp-2 text-[10px] leading-4 text-slate-400">
                {event.detail}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
