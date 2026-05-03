import { Bot, ClipboardPlus } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import type { AIJudgment } from '@/types/alerts'

export function MultiSourceJudgmentCard({
  judgment,
  onAdopt,
}: {
  judgment: AIJudgment
  onAdopt: (judgment: AIJudgment) => void
}) {
  return (
    <div className="rounded-xl border border-violet-300/18 bg-violet-400/[0.045] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-violet-300/18 bg-violet-300/10 text-violet-200">
            <Bot className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white">AI 辅助研判 · 仅供参考</div>
            <div className="mt-0.5 text-[11px] text-slate-500">
              {new Date(judgment.generatedAt).toLocaleString('zh-CN')}
            </div>
          </div>
        </div>
        <Badge tone="neutral">旁路辅助</Badge>
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-300">
        {judgment.summary}
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {judgment.relatedAlertIds.length > 0 ? (
          judgment.relatedAlertIds.map((id) => (
            <span
              key={id}
              className="rounded-md border border-white/8 bg-white/[0.04] px-2 py-1 text-[10px] text-slate-300"
            >
              {id}
            </span>
          ))
        ) : (
          <span className="rounded-md border border-white/8 bg-white/[0.04] px-2 py-1 text-[10px] text-slate-500">
            暂无关联告警
          </span>
        )}
      </div>

      <div className="mt-3 space-y-1.5 border-t border-white/6 pt-3">
        {judgment.basis.map((item) => (
          <div key={item} className="text-[11px] leading-5 text-slate-500">
            {item}
          </div>
        ))}
      </div>

      <div className="mt-3 flex justify-end">
        <button
          onClick={() => onAdopt(judgment)}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-violet-300/20 bg-violet-300/10 px-3 text-[11px] font-medium text-violet-100 transition hover:bg-violet-300/15 active:scale-[0.97]"
        >
          <ClipboardPlus className="h-3.5 w-3.5" />
          采纳到处置备注
        </button>
      </div>
    </div>
  )
}
