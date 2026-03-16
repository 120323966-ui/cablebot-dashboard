import { Mic, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import type { AuxView, CommandEvent, VoicePanelState } from '@/types/command'

function viewTone(status: AuxView['status']) {
  if (status === 'live') return 'danger' as const
  if (status === 'queued') return 'warning' as const
  return 'neutral' as const
}

function eventTone(severity: CommandEvent['severity']) {
  if (severity === 'critical') return 'danger' as const
  if (severity === 'warning') return 'warning' as const
  return 'neutral' as const
}

function eventStatusLabel(status: CommandEvent['status']) {
  if (status === 'new') return 'new'
  if (status === 'processing') return 'processing'
  return 'ack'
}

export function RightCommandRail({
  auxViews,
  events,
  voice,
}: {
  auxViews: AuxView[]
  events: CommandEvent[]
  voice: VoicePanelState
}) {
  const primaryAux = auxViews[0]
  const secondaryAux = auxViews.slice(1, 4)

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <Card className="shrink-0" eyebrow="Aux Visuals" title="辅助画面">
        <div className="rounded-[22px] border border-white/8 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_36%),linear-gradient(180deg,rgba(15,23,42,0.6),rgba(2,6,23,0.92))] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[28px] font-semibold tracking-tight text-white">
                {primaryAux.title}
              </div>
              <div className="mt-1 text-sm text-slate-300">{primaryAux.subtitle}</div>
            </div>

            <Badge tone={viewTone(primaryAux.status)}>{primaryAux.status}</Badge>
          </div>

          <div className="mt-4 h-36 rounded-[20px] border border-white/8 bg-[linear-gradient(180deg,rgba(56,189,248,0.12),rgba(2,6,23,0.84))]" />
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {secondaryAux.map((view) => (
            <div
              key={view.id}
              className="rounded-[18px] border border-white/8 bg-white/[0.03] p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-medium text-white">{view.title}</div>
                <Badge tone={viewTone(view.status)}>{view.status}</Badge>
              </div>
              <div className="mt-2 line-clamp-2 text-[11px] leading-5 text-slate-400">
                {view.subtitle}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="min-h-0 flex-1" eyebrow="Event Stream" title="事件流">
        <div className="flex h-full min-h-0 flex-col">
          <div className="mb-3 text-sm leading-6 text-slate-300">
            仅保留与主视频联动最强的最近事件。
          </div>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {events.map((event) => (
              <article
                key={event.id}
                className="rounded-[18px] border border-white/8 bg-white/[0.03] p-4 transition hover:border-cyan-400/20 hover:bg-white/[0.05]"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <div className="font-medium text-white">{event.title}</div>
                  <Badge tone={eventTone(event.severity)}>{event.severity}</Badge>
                  <Badge tone="neutral">{eventStatusLabel(event.status)}</Badge>
                </div>

                <div className="mt-2 text-sm leading-6 text-slate-300">{event.detail}</div>

                <div className="mt-2 text-xs text-slate-500">
                  {event.segmentId} · {event.source} ·{' '}
                  {new Date(event.occurredAt).toLocaleTimeString('zh-CN')}
                </div>
              </article>
            ))}
          </div>
        </div>
      </Card>

      <Card className="shrink-0" eyebrow="Multimodal" title="语音 / 指令">
        <div className="rounded-[20px] border border-cyan-400/15 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.12),transparent_42%)] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-base font-medium text-white">人机协同待命</div>
              <div className="mt-1 text-sm text-slate-300">
                保留轻量语音入口，不打断主视频判断。
              </div>
            </div>
            <Badge tone={voice.listening ? 'danger' : 'good'}>
              {voice.listening ? 'Listening' : 'Standby'}
            </Badge>
          </div>

          <div className="mt-3 rounded-[16px] border border-white/8 bg-white/[0.03] px-3 py-2.5 text-sm text-slate-200">
            <div className="flex items-center gap-2">
              <Mic className="h-4 w-4 text-cyan-300" />
              最近识别：{voice.transcript || '暂无'}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {voice.suggested.slice(0, 3).map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-1 rounded-full border border-cyan-400/15 bg-cyan-400/10 px-3 py-1.5 text-xs text-cyan-100"
              >
                <Sparkles className="h-3 w-3" />
                {item}
              </span>
            ))}
          </div>
        </div>
      </Card>
    </div>
  )
}