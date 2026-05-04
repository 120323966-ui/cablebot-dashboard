import { Bot, ClipboardPlus } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import type { AIJudgment } from '@/types/alerts'

/* ─────── 置信度显示 ─────── */

const CONFIDENCE_LABEL: Record<AIJudgment['confidenceLevel'], string> = {
  low: '低',
  medium: '中',
  high: '高',
}

/**
 * 置信度条:三段式视觉,low/medium/high 用浅蓝→蓝→深蓝渐进。
 * 不用红绿语义色,避免与告警等级混淆——AI 研判是旁路输入,不该
 * 在视觉上主张"危险/安全"。
 */
function ConfidenceBar({ level, value }: { level: AIJudgment['confidenceLevel']; value: number }) {
  const pct = Math.round(value * 100)

  const segmentClass = (idx: number) => {
    /* idx 0=low, 1=medium, 2=high */
    if (level === 'low' && idx === 0) return 'bg-sky-300/70'
    if (level === 'medium' && idx <= 1) return 'bg-sky-400/80'
    if (level === 'high' && idx <= 2) return 'bg-sky-300'
    return 'bg-white/8'
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-slate-500">置信</span>
      <div className="flex h-1.5 w-16 gap-0.5">
        <div className={`flex-1 rounded-l-sm ${segmentClass(0)}`} />
        <div className={`flex-1 ${segmentClass(1)}`} />
        <div className={`flex-1 rounded-r-sm ${segmentClass(2)}`} />
      </div>
      <span className="text-[10px] font-medium text-sky-200">
        {CONFIDENCE_LABEL[level]} · {pct}%
      </span>
    </div>
  )
}

/* ─────── 主卡片 ─────── */

export function MultiSourceJudgmentCard({
  judgment,
  onAdopt,
}: {
  judgment: AIJudgment
  /** 一步采纳:点击直接把研判结论存为一条处置备注 */
  onAdopt: (judgment: AIJudgment) => void
}) {
  return (
    <div className="rounded-xl border border-violet-300/18 bg-violet-400/[0.045] p-4">
      {/* Header */}
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
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <Badge tone="neutral">旁路辅助</Badge>
          <ConfidenceBar level={judgment.confidenceLevel} value={judgment.confidence} />
        </div>
      </div>

      {/* 因果叙述 */}
      <p className="mt-3 text-sm leading-6 text-slate-300">
        {judgment.summary}
      </p>

      {/* 关联告警 ID 标签 */}
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

      {/* basis: 具体证据 */}
      <div className="mt-3 space-y-1 border-t border-white/6 pt-3">
        {judgment.basis.map((item) => (
          <div key={item} className="text-[11px] leading-5 text-slate-500">
            {item}
          </div>
        ))}
      </div>

      {/* 采纳:一步存入备注 */}
      <div className="mt-3 flex justify-end">
        <button
          onClick={() => onAdopt(judgment)}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-violet-300/20 bg-violet-300/10 px-3 text-[11px] font-medium text-violet-100 transition hover:bg-violet-300/15 active:scale-[0.97]"
        >
          <ClipboardPlus className="h-3.5 w-3.5" />
          采纳为处置备注
        </button>
      </div>
    </div>
  )
}
