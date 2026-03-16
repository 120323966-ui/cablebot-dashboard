import {
  Camera,
  Disc3,
  Maximize2,
  Radar,
  ScanSearch,
  Waves,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import type {
  ControlState,
  CommandMission,
  PrimaryVideoFeed,
  VideoTarget,
} from '@/types/command'

function severityTone(severity: VideoTarget['severity']) {
  if (severity === 'critical') return 'danger' as const
  if (severity === 'warning') return 'warning' as const
  return 'neutral' as const
}

function modeLabel(mode: CommandMission['mode']) {
  if (mode === 'auto') return '自动'
  if (mode === 'manual') return '人工接管'
  return '半自动'
}

function targetStyles(severity: VideoTarget['severity']) {
  if (severity === 'critical') {
    return {
      border: 'border-rose-400/80',
      glow: 'shadow-[0_0_0_1px_rgba(251,113,133,0.25),0_0_24px_rgba(244,63,94,0.12)]',
      chip: 'border-rose-400/25 bg-rose-500/12 text-rose-100',
    }
  }

  if (severity === 'warning') {
    return {
      border: 'border-amber-300/80',
      glow: 'shadow-[0_0_0_1px_rgba(253,224,71,0.18),0_0_20px_rgba(245,158,11,0.08)]',
      chip: 'border-amber-300/20 bg-amber-400/10 text-amber-100',
    }
  }

  return {
    border: 'border-cyan-300/70',
    glow: 'shadow-[0_0_0_1px_rgba(34,211,238,0.18)]',
    chip: 'border-cyan-300/20 bg-cyan-400/10 text-cyan-100',
  }
}

export function CenterVideoStage({
  video,
  mission,
  control,
}: {
  video: PrimaryVideoFeed
  mission: CommandMission
  control: ControlState
}) {
  return (
    <section className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[32px] border border-white/8 bg-slate-950/60 shadow-2xl shadow-cyan-950/15">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.14),transparent_18%),linear-gradient(180deg,#06111e_0%,#07111f_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.04)_1px,transparent_1px)] bg-[size:32px_32px] opacity-30" />

      <div className="relative z-10 flex items-start justify-between gap-4 border-b border-white/6 px-5 pb-4 pt-5">
        <div>
          <div className="panel-eyebrow">Primary Visual</div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h3 className="text-2xl font-semibold tracking-tight text-white">主巡检视频流</h3>
            <Badge tone="good">LIVE</Badge>
            <Badge tone="neutral">{modeLabel(mission.mode)}</Badge>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            以主视频为中心联动热像、异常事件与遥操作反馈。
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button className="rounded-2xl border border-white/8 bg-white/[0.04] p-3 text-slate-300 transition hover:border-cyan-400/20 hover:bg-white/[0.06] hover:text-white">
            <Camera className="h-4 w-4" />
          </button>
          <button className="rounded-2xl border border-white/8 bg-white/[0.04] p-3 text-slate-300 transition hover:border-cyan-400/20 hover:bg-white/[0.06] hover:text-white">
            <Disc3 className="h-4 w-4" />
          </button>
          <button className="rounded-2xl border border-white/8 bg-white/[0.04] p-3 text-slate-300 transition hover:border-cyan-400/20 hover:bg-white/[0.06] hover:text-white">
            <ScanSearch className="h-4 w-4" />
          </button>
          <button className="rounded-2xl border border-white/8 bg-white/[0.04] p-3 text-slate-300 transition hover:border-cyan-400/20 hover:bg-white/[0.06] hover:text-white">
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="relative z-10 min-h-0 flex-1 px-5 pb-5">
        <div className="flex h-full min-h-0 flex-col">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge tone="neutral">{video.cameraLabel}</Badge>
            <Badge tone="neutral">{video.resolution}</Badge>
            <Badge tone="good">FPS {video.fps}</Badge>
            <Badge tone={video.latencyMs > 220 ? 'warning' : 'good'}>
              延迟 {video.latencyMs}ms
            </Badge>
            <Badge tone={control.recording ? 'danger' : 'neutral'}>
              {control.recording ? '录制中' : '未录制'}
            </Badge>
          </div>

          <div className="relative min-h-0 flex-1 overflow-hidden rounded-[28px] border border-white/8 bg-[#05101a]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(34,211,238,0.14),transparent_24%),linear-gradient(180deg,rgba(8,23,37,0.62),rgba(3,9,17,0.96))]" />

            <div className="absolute inset-x-[6%] top-[16%] h-[60%] rounded-[999px] border border-white/6 bg-[radial-gradient(circle_at_50%_2%,rgba(148,163,184,0.14),transparent_18%),linear-gradient(180deg,rgba(19,32,52,0.18),rgba(2,6,23,0.82))]" />
            <div className="absolute inset-x-[18%] top-[40%] h-[34%] rounded-[999px] border border-white/5 bg-[radial-gradient(circle_at_50%_0%,rgba(56,189,248,0.12),transparent_16%),linear-gradient(180deg,rgba(10,20,34,0.08),rgba(2,6,23,0.64))]" />

            <div className="pointer-events-none absolute left-1/2 top-[56%] z-10 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/25">
              <div className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/35" />
              <div className="absolute left-1/2 top-1/2 h-[1px] w-12 -translate-x-1/2 -translate-y-1/2 bg-cyan-300/40" />
              <div className="absolute left-1/2 top-1/2 h-12 w-[1px] -translate-x-1/2 -translate-y-1/2 bg-cyan-300/40" />
            </div>

            <div className="absolute left-4 top-4 z-20 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/10 bg-slate-950/55 px-3 py-1 text-xs text-white/85">
                {video.location}
              </span>
              <span className="rounded-full border border-white/10 bg-slate-950/55 px-3 py-1 text-xs text-slate-300">
                {new Date(video.timestamp).toLocaleTimeString('zh-CN')}
              </span>
            </div>

            <div className="absolute bottom-4 left-4 z-20 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/10 bg-slate-950/55 px-3 py-1 text-xs text-slate-300">
                任务 {mission.segmentId}
              </span>
              <span className="rounded-full border border-white/10 bg-slate-950/55 px-3 py-1 text-xs text-slate-300">
                完成度 {mission.progressPct}%
              </span>
              <span className="rounded-full border border-white/10 bg-slate-950/55 px-3 py-1 text-xs text-slate-300">
                延迟 {video.latencyMs}ms
              </span>
            </div>

            <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2 rounded-full border border-cyan-400/15 bg-cyan-400/10 px-3 py-1.5 text-xs text-cyan-100">
              <Radar className="h-3.5 w-3.5" />
              巡检焦点锁定
            </div>

            {video.targets.map((target) => {
              const styles = targetStyles(target.severity)

              return (
                <div
                  key={target.id}
                  className={`absolute rounded-[24px] border bg-white/[0.02] ${styles.border} ${styles.glow}`}
                  style={{
                    top: target.top,
                    left: target.left,
                    width: target.width,
                    height: target.height,
                  }}
                >
                  <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white">{target.label}</div>
                      <div className="mt-1 max-w-[160px] text-[11px] leading-5 text-slate-300">
                        {target.detail}
                      </div>
                    </div>

                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-medium ${styles.chip}`}
                    >
                      {target.severity === 'critical'
                        ? 'critical'
                        : target.severity === 'warning'
                          ? 'warning'
                          : 'info'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-3 grid shrink-0 gap-3 xl:grid-cols-3">
            <div className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">当前定位</div>
              <div className="mt-2 text-sm font-medium text-white">{video.location}</div>
            </div>

            <div className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-3">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-slate-500">
                <Waves className="h-3.5 w-3.5 text-cyan-300" />
                云台状态
              </div>
              <div className="mt-2 text-sm font-medium text-white">
                Pan {video.ptz.pan}° · Tilt {video.ptz.tilt}° · Zoom {video.ptz.zoom}x
              </div>
            </div>

            <div className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">巡检模式</div>
              <div className="mt-2 text-sm font-medium text-white">{modeLabel(mission.mode)}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}