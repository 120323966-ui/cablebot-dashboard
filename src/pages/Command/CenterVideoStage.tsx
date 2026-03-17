import { Maximize2, Radar } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import type {
  ControlState,
  CommandMission,
  PrimaryVideoFeed,
  VideoTarget,
} from '@/types/command'

function targetStyles(severity: VideoTarget['severity']) {
  if (severity === 'critical') {
    return {
      border: 'border-rose-400/80',
      glow: 'shadow-[0_0_0_1px_rgba(251,113,133,0.25),0_0_20px_rgba(244,63,94,0.1)]',
      chip: 'border-rose-400/25 bg-rose-500/12 text-rose-100',
    }
  }
  if (severity === 'warning') {
    return {
      border: 'border-amber-300/80',
      glow: 'shadow-[0_0_0_1px_rgba(253,224,71,0.18),0_0_16px_rgba(245,158,11,0.06)]',
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
    <section className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-white/8 bg-slate-950/60">
      {/* Full video area */}
      <div className="relative min-h-0 flex-1 overflow-hidden bg-[#040d18]">
        {/* Simulated tunnel view background */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(34,211,238,0.12),transparent_22%),linear-gradient(180deg,rgba(8,23,37,0.6),rgba(3,9,17,0.95))]" />
        <div className="pointer-events-none absolute inset-x-[6%] top-[14%] h-[64%] rounded-[999px] border border-white/5 bg-[radial-gradient(circle_at_50%_2%,rgba(148,163,184,0.12),transparent_16%),linear-gradient(180deg,rgba(19,32,52,0.15),rgba(2,6,23,0.8))]" />
        <div className="pointer-events-none absolute inset-x-[20%] top-[38%] h-[36%] rounded-[999px] border border-white/4 bg-[radial-gradient(circle_at_50%_0%,rgba(56,189,248,0.08),transparent_14%)]" />

        {/* Crosshair */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/20">
          <div className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/30" />
          <div className="absolute left-1/2 top-1/2 h-[1px] w-10 -translate-x-1/2 -translate-y-1/2 bg-cyan-300/35" />
          <div className="absolute left-1/2 top-1/2 h-10 w-[1px] -translate-x-1/2 -translate-y-1/2 bg-cyan-300/35" />
        </div>

        {/* Top-left: camera + resolution badge (minimal) */}
        <div className="absolute left-3 top-3 z-20 flex items-center gap-1.5">
          <span className="rounded-md border border-white/10 bg-slate-950/60 px-2 py-0.5 text-[11px] text-white/80">
            {video.cameraLabel}
          </span>
          <span className="rounded-md border border-white/10 bg-slate-950/60 px-2 py-0.5 text-[11px] text-slate-400">
            {video.resolution}
          </span>
          {control.recording && (
            <span className="flex items-center gap-1 rounded-md border border-rose-400/30 bg-rose-500/15 px-2 py-0.5 text-[11px] text-rose-200">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400" />
              REC
            </span>
          )}
        </div>

        {/* Top-right: FPS + latency */}
        <div className="absolute right-3 top-3 z-20 flex items-center gap-1.5">
          <span className="rounded-md border border-white/10 bg-slate-950/60 px-2 py-0.5 text-[11px] text-emerald-300">
            {video.fps} FPS
          </span>
          <span className={`rounded-md border bg-slate-950/60 px-2 py-0.5 text-[11px] ${
            video.latencyMs > 220
              ? 'border-amber-400/25 text-amber-300'
              : 'border-white/10 text-slate-400'
          }`}>
            {video.latencyMs}ms
          </span>
        </div>

        {/* Bottom-left: location + task info */}
        <div className="absolute bottom-3 left-3 z-20 flex items-center gap-1.5">
          <span className="rounded-md border border-white/10 bg-slate-950/60 px-2 py-0.5 text-[11px] text-white/80">
            {video.location}
          </span>
          <span className="rounded-md border border-white/10 bg-slate-950/60 px-2 py-0.5 text-[11px] text-slate-400">
            {new Date(video.timestamp).toLocaleTimeString('zh-CN')}
          </span>
          <span className="rounded-md border border-white/10 bg-slate-950/60 px-2 py-0.5 text-[11px] text-slate-400">
            {mission.progressPct}%
          </span>
        </div>

        {/* Bottom-right: focus lock indicator */}
        <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 rounded-md border border-cyan-400/12 bg-cyan-400/8 px-2 py-0.5 text-[11px] text-cyan-200">
          <Radar className="h-3 w-3" />
          焦点锁定
        </div>

        {/* AI detection targets */}
        {video.targets.map((target) => {
          const styles = targetStyles(target.severity)
          return (
            <div
              key={target.id}
              className={`absolute rounded-2xl border bg-white/[0.02] ${styles.border} ${styles.glow}`}
              style={{
                top: target.top,
                left: target.left,
                width: target.width,
                height: target.height,
              }}
            >
              <div className="absolute inset-x-2 top-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold text-white">{target.label}</div>
                  <div className="mt-0.5 max-w-[140px] text-[10px] leading-4 text-slate-300">
                    {target.detail}
                  </div>
                </div>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-medium ${styles.chip}`}>
                  {target.severity}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Bottom bar: PTZ status (compact, inside video card) */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-white/6 px-3 py-2">
        <div className="flex items-center gap-3 text-[12px] text-slate-400">
          <span>
            Pan <span className="text-white">{video.ptz.pan}°</span>
          </span>
          <span>
            Tilt <span className="text-white">{video.ptz.tilt}°</span>
          </span>
          <span>
            Zoom <span className="text-white">{video.ptz.zoom}x</span>
          </span>
        </div>
        <button className="rounded-lg border border-white/8 bg-white/[0.04] p-1.5 text-slate-400 transition hover:bg-white/[0.06] hover:text-white">
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </section>
  )
}
