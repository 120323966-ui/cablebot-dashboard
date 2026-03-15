import { Bolt, FileOutput, Focus, Mic } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import type { QuickAction } from '@/types/dashboard'

const iconMap = {
  pause: Bolt,
  export: FileOutput,
  'focus-b3': Focus,
  voice: Mic,
}

export function QuickActions({ actions, onAction }: { actions: QuickAction[]; onAction: (action: QuickAction) => void }) {
  return (
    <Card eyebrow="Quick Actions" title="快捷操作">
      <div className="grid gap-3 xl:grid-cols-2">
        {actions.map((action) => {
          const Icon = iconMap[action.id as keyof typeof iconMap] ?? Bolt
          return (
            <button key={action.id} onClick={() => onAction(action)} className="group rounded-3xl border border-white/8 bg-white/[0.03] p-4 text-left transition hover:border-cyan-400/20 hover:bg-white/[0.05]">
              <div className="flex items-center justify-between gap-3">
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-cyan-300">
                  <Icon className="h-5 w-5" />
                </div>
                <Button variant="ghost" className="pointer-events-none px-3 py-1.5 text-xs">执行</Button>
              </div>
              <div className="mt-4 text-base font-medium text-white">{action.label}</div>
              <div className="mt-2 text-sm leading-6 text-slate-300">{action.description}</div>
            </button>
          )
        })}
      </div>
    </Card>
  )
}
