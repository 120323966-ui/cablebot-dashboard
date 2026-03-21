import { Maximize2, Radar } from 'lucide-react'
import { TunnelSimulation } from './TunnelSimulation'
import type {
  ControlState,
  CommandMission,
  PrimaryVideoFeed,
  VideoTarget,
} from '@/types/command'

function targetStyles(severity: VideoTarget['severity']) {
  if (severity === 'critical') {
    return {
      border: 'border-2 border-rose-500',
      fill: 'bg-rose-500/15',
      glow: 'shadow-[0_0_0_2px_rgba(244,63,94,0.35),0_0_24px_4px_rgba(244,63,94,0.25),0_0_48px_8px_rgba(244,63,94,0.1)]',
      chip: 'border-rose-400/40 bg-rose-500/30 text-white font-bold',
      pulse: 'animate-[pulse_1.5s_ease-in-out_infinite]',
      corner: 'border-rose-400',
    }
  }
  if (severity === 'warning') {
    return {
      border: 'border-2 border-amber-400',
      fill: 'bg-amber-400/12',
      glow: 'shadow-[0_0_0_2px_rgba(245,158,11,0.3),0_0_20px_4px_rgba(245,158,11,0.2)]',
      chip: 'border-amber-400/35 bg-amber-500/25 text-amber-50 font-bold',
      pulse: '',
      corner: 'border-amber-400',
    }
  }
  return {
    border: 'border-2 border-cyan-400',
    fill: 'bg-cyan-400/10',
    glow: 'shadow-[0_0_0_1px_rgba(34,211,238,0.25),0_0_16px_rgba(34,211,238,0.15)]',
    chip: 'border-cyan-400/25 bg-cyan-500/20 text-cyan-50 font-medium',
    pulse: '',
    corner: 'border-cyan-400',
  }
}

/** Corner brackets for industrial detection-box look */
function CornerBrackets({ color }: { color: string }) {
  const base = `absolute w-3.5 h-3.5 ${color}`
  return (
    <>
      <span className={`${base} left-0 top-0 border-l-2 border-t-2 rounded-tl`} />
      <span className={`${base} right-0 top-0 border-r-2 border-t-2 rounded-tr`} />
      <span className={`${base} left-0 bottom-0 border-l-2 border-b-2 rounded-bl`} />
      <span className={`${base} right-0 bottom-0 border-r-2 border-b-2 rounded-br`} />
    </>
  )
}

export function CenterVideoStage({
  video,
  mission,
  control,
  activeAux,
}: {
  video: PrimaryVideoFeed
  mission: CommandMission
  control: ControlState
  activeAux?: Set<string>
}) {
  return (
    <section className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-white/8 bg-slate-950/60">
      {/* Full video area */}
      <div className="relative min-h-0 flex-1 overflow-hidden bg-[#040d18]">
        {/* Simulated tunnel camera feed */}
        <TunnelSimulation lightOn={control.lightOn} stabilizationOn={control.stabilizationOn} segmentId={mission.segmentId} />

        {/* Crosshair — minimal camera reticle */}
        <svg className="pointer-events-none absolute left-1/2 top-1/2 z-10 h-6 w-6 -translate-x-1/2 -translate-y-1/2" viewBox="0 0 24 24">
          {/* Four short lines with center gap */}
          <line x1="0" y1="12" x2="8" y2="12" stroke="rgba(165,243,252,0.45)" strokeWidth="1" />
          <line x1="16" y1="12" x2="24" y2="12" stroke="rgba(165,243,252,0.45)" strokeWidth="1" />
          <line x1="12" y1="0" x2="12" y2="8" stroke="rgba(165,243,252,0.45)" strokeWidth="1" />
          <line x1="12" y1="16" x2="12" y2="24" stroke="rgba(165,243,252,0.45)" strokeWidth="1" />
          {/* Center dot */}
          <circle cx="12" cy="12" r="1" fill="rgba(165,243,252,0.5)" />
        </svg>

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
              className={`absolute rounded-lg ${styles.border} ${styles.fill} ${styles.glow} ${styles.pulse}`}
              style={{
                top: target.top,
                left: target.left,
                width: target.width,
                height: target.height,
              }}
            >
              {/* Corner brackets */}
              <CornerBrackets color={styles.corner} />

              {/* Label — compact vertical layout */}
              <div className="absolute inset-x-3 inset-y-2 flex flex-col justify-center gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold leading-tight text-white">{target.label}</span>
                  <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider leading-none ${styles.chip}`}>
                    {target.severity}
                  </span>
                </div>
                <div className="text-[12px] leading-snug text-slate-300">{target.detail}</div>
              </div>
            </div>
          )
        })}

        {/* PiP: Rear View */}
        {activeAux?.has('rear') && (
          <div className="absolute bottom-10 left-3 z-20 h-[120px] w-[180px] overflow-hidden rounded-lg border border-white/15 bg-[#060e16] shadow-xl">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(30,50,70,0.4),rgba(6,14,22,1)_80%)]" />
            {/* Simulated rear camera - reversed perspective lines */}
            <svg viewBox="0 0 180 120" className="absolute inset-0 h-full w-full">
              <line x1="0" y1="120" x2="70" y2="50" stroke="rgba(100,130,155,0.2)" strokeWidth="1" />
              <line x1="180" y1="120" x2="110" y2="50" stroke="rgba(100,130,155,0.2)" strokeWidth="1" />
              <line x1="0" y1="0" x2="70" y2="50" stroke="rgba(100,130,155,0.15)" strokeWidth="1" />
              <line x1="180" y1="0" x2="110" y2="50" stroke="rgba(100,130,155,0.15)" strokeWidth="1" />
              <rect x="70" y="40" width="40" height="20" fill="rgba(15,25,35,0.8)" stroke="rgba(100,130,155,0.15)" strokeWidth="0.5" />
              {/* Floor tracks */}
              <line x1="75" y1="120" x2="82" y2="60" stroke="rgba(80,110,135,0.2)" strokeWidth="1.5" />
              <line x1="105" y1="120" x2="98" y2="60" stroke="rgba(80,110,135,0.2)" strokeWidth="1.5" />
            </svg>
            <div className="absolute left-2 top-1.5 rounded bg-slate-950/70 px-1.5 py-0.5 text-[9px] text-slate-300">
              Rear Camera
            </div>
            <div className="absolute bottom-1.5 right-2 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9px] text-emerald-300">
              LIVE
            </div>
          </div>
        )}

        {/* PiP: Zoom Detail */}
        {activeAux?.has('zoom') && (
          <div className="absolute bottom-10 right-3 z-20 h-[120px] w-[180px] overflow-hidden rounded-lg border border-white/15 bg-[#060e16] shadow-xl">
            {/* Zoomed-in cable detail */}
            <svg viewBox="0 0 180 120" className="absolute inset-0 h-full w-full">
              <rect x="0" y="0" width="180" height="120" fill="#0a1520" />
              {/* Cable tray bracket */}
              <rect x="10" y="35" width="160" height="6" fill="rgba(100,130,150,0.25)" rx="1" />
              <rect x="10" y="75" width="160" height="6" fill="rgba(100,130,150,0.25)" rx="1" />
              {/* Cables */}
              <line x1="10" y1="48" x2="170" y2="48" stroke="#2a3a48" strokeWidth="5" strokeLinecap="round" />
              <line x1="10" y1="57" x2="170" y2="57" stroke="#1e2e3c" strokeWidth="5" strokeLinecap="round" />
              <line x1="10" y1="66" x2="170" y2="66" stroke="#3a2828" strokeWidth="5" strokeLinecap="round" />
              {/* Fault highlight on cables */}
              <line x1="70" y1="48" x2="120" y2="48" stroke="rgba(255,50,20,0.85)" strokeWidth="5" strokeLinecap="round" />
              <line x1="70" y1="57" x2="120" y2="57" stroke="rgba(255,90,10,0.75)" strokeWidth="5" strokeLinecap="round" />
              <line x1="70" y1="66" x2="120" y2="66" stroke="rgba(255,130,30,0.65)" strokeWidth="5" strokeLinecap="round" />
              {/* Cable joint mark */}
              <rect x="90" y="44" width="4" height="26" fill="rgba(200,200,200,0.3)" rx="1" />
              {/* Bracket supports */}
              <rect x="30" y="32" width="4" height="50" fill="rgba(90,115,140,0.25)" rx="1" />
              <rect x="145" y="32" width="4" height="50" fill="rgba(90,115,140,0.25)" rx="1" />
            </svg>
            <div className="absolute left-2 top-1.5 rounded bg-slate-950/70 px-1.5 py-0.5 text-[9px] text-slate-300">
              Zoom × 4.0
            </div>
            <div className="absolute bottom-1.5 right-2 rounded bg-amber-500/15 px-1.5 py-0.5 text-[9px] text-amber-300">
              故障区域
            </div>
          </div>
        )}

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
