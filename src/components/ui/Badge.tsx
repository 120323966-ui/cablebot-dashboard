import { clsx } from 'clsx'

type Tone = 'neutral' | 'good' | 'warning' | 'danger'

const map: Record<Tone, string> = {
  neutral: 'border-white/10 bg-white/6 text-white/75',
  good: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200',
  warning: 'border-amber-400/25 bg-amber-400/10 text-amber-200',
  danger: 'border-rose-400/25 bg-rose-400/10 text-rose-200',
}

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span className={clsx('inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium', map[tone])}>
      {children}
    </span>
  )
}
