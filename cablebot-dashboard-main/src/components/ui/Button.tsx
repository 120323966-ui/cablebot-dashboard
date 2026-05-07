import { clsx } from 'clsx'

type Variant = 'primary' | 'ghost' | 'danger'

const variants: Record<Variant, string> = {
  primary: 'bg-cyan-400 text-slate-950 hover:bg-cyan-300',
  ghost: 'border border-white/10 bg-white/5 text-white hover:bg-white/8',
  danger: 'bg-rose-500 text-white hover:bg-rose-400',
}

export function Button({
  variant = 'primary',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-medium transition duration-200 disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        className,
      )}
      {...props}
    />
  )
}
