import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Camera,
  Lightbulb,
  Mic,
  Pause,
  Power,
  ScanLine,
  ShieldCheck,
  Video,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import type { CommandMode, ControlState, MissionStatus } from '@/types/command'

const modeLabels: Record<CommandMode, string> = {
  auto: '自动',
  'semi-auto': '半自',
  manual: '接管',
}

/* ── Highlight ring class ── */
const HIGHLIGHT_RING = 'ring-2 ring-cyan-400/60 ring-offset-1 ring-offset-slate-950'

/* ── Shared button atoms ── */

function Chip({
  children,
  active = false,
  highlight = false,
  className = '',
  disabled = false,
  onClick,
}: {
  children: React.ReactNode
  active?: boolean
  highlight?: boolean
  className?: string
  disabled?: boolean
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-9 items-center justify-center rounded-xl border px-3 text-[12px] font-medium leading-none whitespace-nowrap transition-all duration-300 ${
        disabled
          ? 'cursor-not-allowed border-white/6 bg-white/[0.02] text-slate-600 opacity-55'
          : active
          ? 'border-cyan-400/30 bg-cyan-400/12 text-white'
          : 'border-white/8 bg-white/[0.04] text-slate-300 hover:border-cyan-400/18 hover:bg-white/[0.06] hover:text-white'
      } ${highlight ? HIGHLIGHT_RING : ''} ${className}`}
    >
      {children}
    </button>
  )
}

function IconBtn({
  children,
  disabled = false,
  onClick,
}: {
  children: React.ReactNode
  disabled?: boolean
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition ${
        disabled
          ? 'cursor-not-allowed border-white/6 bg-white/[0.02] text-slate-600 opacity-55'
          : 'border-white/8 bg-white/[0.04] text-slate-300 hover:border-cyan-400/18 hover:bg-white/[0.06] hover:text-white'
      }`}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <div className="mx-1 h-8 w-px bg-white/8" />
}

/* ── Main component ── */

export function BottomControlDock({
  control,
  missionStatus,
  voiceActive,
  highlightKey,
  onModeChange,
  onToggle,
  onAction,
  onVoice,
}: {
  control: ControlState
  missionStatus: MissionStatus
  voiceActive: boolean
  /** 最近一次语音操作的控件 key，用于短暂高亮 */
  highlightKey?: string | null
  onModeChange: (mode: CommandMode) => void
  onToggle: (key: 'lightOn' | 'stabilizationOn' | 'recording') => void
  onAction: (label: string) => void
  onVoice: () => void
}) {
  const isPaused = missionStatus === 'paused'
  const isStopped = missionStatus === 'attention'
  const isManual = control.driveMode === 'manual'
  const motionDisabled = !isManual || isStopped
  const hl = (key: string) => highlightKey === key

  return (
    <section className="shrink-0 rounded-2xl border border-white/8 bg-slate-950/65 px-4 py-2.5 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-2">

        {/* ── Group 1: Drive mode + Direction ── */}
        <div className="flex items-center gap-1.5">
          {(['auto', 'semi-auto'] as const).map((mode) => (
            <Chip
              key={mode}
              active={control.driveMode === mode}
              highlight={hl('mode') && control.driveMode === mode}
              onClick={() => onModeChange(mode)}
              className="min-w-[52px] px-0"
            >
              {modeLabels[mode]}
            </Chip>
          ))}

          <Divider />

          <IconBtn disabled={motionDisabled} onClick={() => onAction('左转')}>
            <ArrowLeft className="h-4 w-4" />
          </IconBtn>
          <div className="flex flex-col gap-0.5">
            <IconBtn disabled={motionDisabled} onClick={() => onAction('前进')}>
              <ArrowUp className="h-4 w-4" />
            </IconBtn>
            <IconBtn disabled={motionDisabled} onClick={() => onAction('后退')}>
              <ArrowDown className="h-4 w-4" />
            </IconBtn>
          </div>
          <IconBtn disabled={motionDisabled} onClick={() => onAction('右转')}>
            <ArrowRight className="h-4 w-4" />
          </IconBtn>
        </div>

        {/* ── Group 2: Camera PTZ + toggles ── */}
        <div className="flex items-center gap-1.5">
          <Chip disabled={motionDisabled} onClick={() => onAction('云台上仰')}>
            <Camera className="mr-1 h-3.5 w-3.5" /> 上仰
          </Chip>
          <Chip disabled={motionDisabled} onClick={() => onAction('云台下俯')}>
            <Camera className="mr-1 h-3.5 w-3.5" /> 下俯
          </Chip>

          <Divider />

          <Chip
            active={control.lightOn}
            highlight={hl('light')}
            onClick={() => onToggle('lightOn')}
          >
            <Lightbulb className="mr-1 h-3.5 w-3.5" /> 灯光
          </Chip>
          <Chip
            active={control.stabilizationOn}
            highlight={hl('stabilization')}
            onClick={() => onToggle('stabilizationOn')}
          >
            <ScanLine className="mr-1 h-3.5 w-3.5" /> 稳定
          </Chip>
        </div>

        {/* ── Voice command button ── */}
        <button
          onClick={onVoice}
          className={`relative inline-flex h-10 items-center gap-1.5 rounded-xl border px-4 text-[12px] font-semibold transition active:scale-95 ${
            voiceActive
              ? 'border-cyan-400/40 bg-cyan-400/15 text-cyan-300 shadow-[0_0_16px_rgba(34,211,238,0.15)]'
              : 'border-cyan-400/20 bg-cyan-400/8 text-cyan-200 hover:border-cyan-400/35 hover:bg-cyan-400/12'
          }`}
        >
          {voiceActive && (
            <span className="absolute -right-1 -top-1 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-40" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-cyan-400" />
            </span>
          )}
          <Mic className="h-4 w-4" />
          语音
        </button>

        {/* ── Group 3: Task actions + E-Stop ── */}
        <div className="flex items-center gap-1.5">
          <Badge tone={control.recording ? 'danger' : 'neutral'}>
            {control.recording ? 'REC' : 'IDLE'}
          </Badge>

          <Chip
            active={control.recording}
            highlight={hl('recording')}
            onClick={() => onToggle('recording')}
          >
            <Video className="mr-1 h-3.5 w-3.5" /> 录制
          </Chip>

          <Chip
            active={isPaused}
            highlight={hl('pause')}
            onClick={() => onAction('暂停巡检')}
            className={isPaused ? '!border-amber-400/30 !bg-amber-400/12 !text-amber-200' : ''}
          >
            <Pause className="mr-1 h-3.5 w-3.5" />
            {isPaused ? '已暂停' : '暂停'}
          </Chip>

          <Divider />

          <button
            onClick={() => onModeChange(isManual ? 'auto' : 'manual')}
            className={`inline-flex h-10 items-center gap-1.5 rounded-xl border px-4 text-[12px] font-semibold transition-all duration-300 active:scale-95 ${
              isManual
                ? 'border-cyan-400/35 bg-cyan-400/14 text-cyan-100 shadow-[0_0_16px_rgba(34,211,238,0.12)]'
                : 'border-amber-300/30 bg-amber-300/10 text-amber-100 hover:bg-amber-300/15'
            } ${hl('mode') ? HIGHLIGHT_RING : ''}`}
          >
            <ShieldCheck className="h-4 w-4" />
            {isManual ? '恢复自动' : '人工接管'}
          </button>

          <button
            onClick={() => onAction('急停')}
            className={`inline-flex h-10 items-center gap-1.5 rounded-xl border px-5 text-[13px] font-semibold text-white shadow-lg transition-all duration-300 active:scale-95 ${
              isStopped
                ? 'animate-pulse border-rose-400/60 bg-rose-600 shadow-rose-900/40'
                : 'border-rose-500/50 bg-rose-500 shadow-rose-900/30 hover:bg-rose-400'
            } ${hl('estop') ? 'ring-2 ring-rose-400/60 ring-offset-1 ring-offset-slate-950' : ''}`}
          >
            <Power className="h-4 w-4" />
            {isStopped ? '已急停' : '急停'}
          </button>
        </div>
      </div>
    </section>
  )
}
