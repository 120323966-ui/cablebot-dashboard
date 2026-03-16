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

function modeLabel(mode: CommandMode) {
  if (mode === 'auto') return '自动'
  if (mode === 'manual') return '接管'
  return '半自'
}

function ChipButton({
  children,
  active = false,
  danger = false,
  className = '',
  onClick,
}: {
  children: React.ReactNode
  active?: boolean
  danger?: boolean
  className?: string
  onClick?: () => void
}) {
  const cls = danger
    ? 'border-rose-500/40 bg-rose-500 text-white hover:bg-rose-400'
    : active
      ? 'border-cyan-400/30 bg-cyan-400/12 text-white'
      : 'border-white/8 bg-white/[0.04] text-slate-300 hover:border-cyan-400/20 hover:bg-white/[0.06] hover:text-white'

  return (
    <button
      onClick={onClick}
      className={`inline-flex h-10 items-center justify-center rounded-xl border px-3 text-[13px] font-medium leading-none whitespace-nowrap transition ${cls} ${className}`}
    >
      {children}
    </button>
  )
}

function IconButton({
  children,
  active = false,
  danger = false,
  onClick,
}: {
  children: React.ReactNode
  active?: boolean
  danger?: boolean
  onClick?: () => void
}) {
  const cls = danger
    ? 'border-rose-500/40 bg-rose-500 text-white hover:bg-rose-400'
    : active
      ? 'border-cyan-400/30 bg-cyan-400/12 text-white'
      : 'border-white/8 bg-white/[0.04] text-slate-300 hover:border-cyan-400/20 hover:bg-white/[0.06] hover:text-white'

  return (
    <button
      onClick={onClick}
      className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border transition ${cls}`}
    >
      {children}
    </button>
  )
}

function Group({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`flex min-w-0 items-center gap-2 rounded-[18px] border border-white/8 bg-white/[0.03] px-3 py-2 ${className}`}
    >
      {children}
    </div>
  )
}

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
    <section className="h-full w-full rounded-[24px] border border-white/8 bg-slate-950/72 px-4 py-2.5 shadow-2xl shadow-cyan-950/15 backdrop-blur-xl">
      <div className="grid h-full items-center gap-3 xl:grid-cols-[1.15fr_0.72fr_1fr_0.95fr]">
        <Group className="justify-between">
          <div className="flex min-w-0 items-center gap-2">
            {(['auto', 'semi-auto', 'manual'] as const).map((mode) => (
              <ChipButton
                key={mode}
                active={control.driveMode === mode}
                onClick={() => onModeChange(mode)}
                className="min-w-[62px] px-0"
              >
                {modeLabel(mode)}
              </ChipButton>
            ))}
          </div>

          <div className="flex shrink-0 items-center gap-2 border-l border-white/8 pl-3">
            {[1, 2, 3].map((level) => (
              <ChipButton
                key={level}
                active={control.speedLevel === level}
                className="w-11 px-0"
              >
                {level}
              </ChipButton>
            ))}
          </div>
        </Group>

        <Group className="justify-center">
          <IconButton onClick={() => onAction('左转')}>
            <ArrowLeft className="h-4 w-4" />
          </IconButton>
          <IconButton onClick={() => onAction('前进')}>
            <ArrowUp className="h-4 w-4" />
          </IconButton>
          <IconButton active onClick={() => onAction('停止')}>
            <Pause className="h-4 w-4" />
          </IconButton>
          <IconButton onClick={() => onAction('后退')}>
            <ArrowDown className="h-4 w-4" />
          </IconButton>
          <IconButton onClick={() => onAction('右转')}>
            <ArrowRight className="h-4 w-4" />
          </IconButton>
        </Group>

        <Group className="justify-center">
          <ChipButton onClick={() => onAction('云台上仰')} className="min-w-[76px]">
            <Camera className="mr-1.5 h-4 w-4" />
            上仰
          </ChipButton>
          <ChipButton onClick={() => onAction('云台下俯')} className="min-w-[76px]">
            <Camera className="mr-1.5 h-4 w-4" />
            下俯
          </ChipButton>
          <ChipButton
            active={control.lightOn}
            onClick={() => onToggle('lightOn')}
            className="min-w-[72px]"
          >
            <Lightbulb className="mr-1.5 h-4 w-4" />
            灯光
          </ChipButton>
          <ChipButton
            active={control.stabilizationOn}
            onClick={() => onToggle('stabilizationOn')}
            className="min-w-[72px]"
          >
            <ScanLine className="mr-1.5 h-4 w-4" />
            稳定
          </ChipButton>
        </Group>

        <Group className="relative w-[420px] justify-center pl-20 pr-4">
  <div className="absolute left-4 top-1/2 -translate-y-1/2">
    <Badge tone={control.recording ? 'danger' : 'neutral'}>
      {control.recording ? 'REC' : 'IDLE'}
    </Badge>
  </div>

  <div className="grid w-full grid-cols-[96px_96px_96px] gap-3">
    <ChipButton
      active={control.recording}
      onClick={() => onToggle('recording')}
      className="w-full px-0"
    >
      <Video className="mr-1.5 h-4 w-4" />
      录制
    </ChipButton>

    <ChipButton
      onClick={() => onAction('暂停巡检')}
      className="w-full px-0"
    >
      <Pause className="mr-1.5 h-4 w-4" />
      暂停
    </ChipButton>

    <ChipButton
      danger
      onClick={() => onAction('急停')}
      className="w-full px-0"
    >
      <Power className="mr-1.5 h-4 w-4" />
      急停
    </ChipButton>
  </div>
</Group>
      </div>
    </section>
  )
}