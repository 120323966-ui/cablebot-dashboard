import type { PropsWithChildren, ReactNode } from 'react'
import { clsx } from 'clsx'

interface CardProps extends PropsWithChildren {
  className?: string
  title?: string
  eyebrow?: string
  action?: ReactNode
}

export function Card({ className, title, eyebrow, action, children }: CardProps) {
  return (
    <section className={clsx('panel-card', className)}>
      {(title || eyebrow || action) && (
        <header className="mb-5 flex items-start justify-between gap-4">
          <div>
            {eyebrow ? <div className="panel-eyebrow">{eyebrow}</div> : null}
            {title ? <h2 className="panel-title mt-1">{title}</h2> : null}
          </div>
          {action ? <div>{action}</div> : null}
        </header>
      )}
      {children}
    </section>
  )
}
