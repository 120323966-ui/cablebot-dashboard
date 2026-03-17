import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Camera,
  Lightbulb,
  Pause,
  Power,
  ScanLine,
  Video,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import type { CommandMode, ControlState } from '@/types/command'

const modeLabels: Record<CommandMode, string> = {
  auto: '自动',
  'semi-auto': '半自',
  manual: '接管',
}

/* ── Shared button atoms ─────────────────────────────── */

function Chip({
  children,
  active = false,
  className = '',
  onClick,
}: {
  children: React.ReactNode
  active?: boolean
  className?: string
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex h-9 items-center justify-center rounded-xl border px-3 text-[12px] font-medium leading-none whitespace-nowrap transition ${
        active
          ? 'border-cyan-400/30 bg-cyan-400/12 text-white'
          : 'border-white/8 bg-white/[0.04] text-slate-300 hover:border-cyan-400/18 hover:bg-white/[0.06] hover:text-white'
      } ${className}`}
    >
      {children}
    </button>
  )
}

function IconBtn({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/8 bg-white/[0.04] text-slate-300 transition hover:border-cyan-400/18 hover:bg-white/[0.06] hover:text-white"
    >
      {children}
    </button>
  )
}

/* ── Divider between groups ──────────────────────────── */

function Divider() {
  return <div className="mx-1 h-8 w-px bg-white/8" />
}

/* ── Main component ──────────────────────────────────── */

export function BottomControlDock({
  control,
  onModeChange,
  onToggle,
  onAction,
}: {
  control: ControlState
  onModeChange: (mode: CommandMode) => void
  onToggle: (key: 'lightOn' | 'stabilizationOn' | 'recording') => void
  onAction: (label: string) => void
}) {
  return (
    <section className="shrink-0 rounded-2xl border border-white/8 bg-slate-950/65 px-4 py-2.5 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-2">

        {/* ── Group 1: Drive mode + Direction ──────── */}
        <div className="flex items-center gap-1.5">
          {(['auto', 'semi-auto', 'manual'] as const).map((mode) => (
            <Chip
              key={mode}
              active={control.driveMode === mode}
              onClick={() => onModeChange(mode)}
              className="min-w-[52px] px-0"
            >
              {modeLabels[mode]}
            </Chip>
          ))}

          <Divider />

          <IconBtn onClick={() => onAction('左转')}>
            <ArrowLeft className="h-4 w-4" />
          </IconBtn>
          <div className="flex flex-col gap-0.5">
            <IconBtn onClick={() => onAction('前进')}>
              <ArrowUp className="h-4 w-4" />
            </IconBtn>
            <IconBtn onClick={() => onAction('后退')}>
              <ArrowDown className="h-4 w-4" />
            </IconBtn>
          </div>
          <IconBtn onClick={() => onAction('右转')}>
            <ArrowRight className="h-4 w-4" />
          </IconBtn>

          <IconBtn onClick={() => onAction('停止')}>
            <Pause className="h-4 w-4" />
          </IconBtn>
        </div>

        {/* ── Group 2: Camera PTZ + toggles ────────── */}
        <div className="flex items-center gap-1.5">
          <Chip onClick={() => onAction('云台上仰')}>
            <Camera className="mr-1 h-3.5 w-3.5" /> 上仰
          </Chip>
          <Chip onClick={() => onAction('云台下俯')}>
            <Camera className="mr-1 h-3.5 w-3.5" /> 下俯
          </Chip>

          <Divider />

          <Chip
            active={control.lightOn}
            onClick={() => onToggle('lightOn')}
          >
            <Lightbulb className="mr-1 h-3.5 w-3.5" /> 灯光
          </Chip>
          <Chip
            active={control.stabilizationOn}
            onClick={() => onToggle('stabilizationOn')}
          >
            <ScanLine className="mr-1 h-3.5 w-3.5" /> 稳定
          </Chip>
        </div>

        {/* ── Group 3: Task actions + E-Stop ─────── */}
        <div className="flex items-center gap-1.5">
          <Badge tone={control.recording ? 'danger' : 'neutral'}>
            {control.recording ? 'REC' : 'IDLE'}
          </Badge>

          <Chip
            active={control.recording}
            onClick={() => onToggle('recording')}
          >
            <Video className="mr-1 h-3.5 w-3.5" /> 录制
          </Chip>

          <Chip onClick={() => onAction('暂停巡检')}>
            <Pause className="mr-1 h-3.5 w-3.5" /> 暂停
          </Chip>

          <Divider />

          {/* E-Stop — prominent red, larger */}
          <button
            onClick={() => onAction('急停')}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-rose-500/50 bg-rose-500 px-5 text-[13px] font-semibold text-white shadow-lg shadow-rose-900/30 transition hover:bg-rose-400 active:scale-95"
          >
            <Power className="h-4 w-4" />
            急停
          </button>
        </div>
      </div>
    </section>
  )
}
