import { Check, Mic, MicOff, Sparkles, X } from 'lucide-react'
import type { UseVoiceEngineReturn } from '@/hooks/useVoiceEngine'
import { HOME_QUICK_COMMANDS } from '@/utils/voiceIntents'

export function ActionDock({
  voice,
}: {
  voice: UseVoiceEngineReturn
}) {
  const { state, startListening, stopListening, confirm, cancel, fireQuickCommand } = voice
  const isIdle = state.status === 'idle'
  const isListening = state.status === 'listening'
  const isConfirming = state.status === 'confirming'
  const isExecuted = state.status === 'executed'
  const isFailed = state.status === 'failed'
  const hasFeedback = Boolean(state.feedback)

  /* ── Step 1: 空闲状态 — 只有一个语音按钮 ── */
  if (isIdle) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 backdrop-blur-sm">
        <button
          onClick={startListening}
          className="inline-flex items-center gap-2.5 rounded-xl border border-cyan-400/20 bg-cyan-400/8 px-5 py-2.5 text-sm font-medium text-cyan-200 transition hover:border-cyan-400/35 hover:bg-cyan-400/15 active:scale-[0.97]"
        >
          <Mic className="h-4 w-4" />
          语音指令
        </button>
        <span className="ml-3 text-[11px] text-slate-600">
          点击开始语音 · 支持暂停任务、区段聚焦、页面跳转等指令
        </span>
      </div>
    )
  }

  /* ── Step 2: 识别中 — 麦克风动画 + 实时 transcript + 快捷指令 ── */
  if (isListening) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-3 rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.03] px-4 py-3 backdrop-blur-sm">
          {/* 麦克风按钮（点击取消） */}
          <button
            onClick={() => { stopListening(); cancel() }}
            className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-cyan-400/40 bg-cyan-400/15 text-cyan-300 transition hover:bg-cyan-400/25"
          >
            <span className="absolute inset-0 animate-ping rounded-full border border-cyan-400/20" />
            <MicOff className="relative z-10 h-4 w-4" />
          </button>

          {/* 识别文本 */}
          <div className="flex-1">
            <div className="text-[11px] text-cyan-400/60">正在聆听...</div>
            <div className="mt-0.5 text-sm text-white">
              {state.transcript && state.transcript !== '识别中...'
                ? state.transcript
                : <span className="text-slate-500">等待语音输入<span className="ml-0.5 inline-block animate-pulse">▎</span></span>
              }
            </div>
          </div>

          {/* 取消文字 */}
          <span className="text-[11px] text-slate-500">点击麦克风取消</span>
        </div>

        {/* 快捷指令 */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-white/6 bg-white/[0.02] px-4 py-2.5">
          <span className="mr-1 text-[11px] text-slate-500">快捷指令</span>
          {HOME_QUICK_COMMANDS.map((cmd) => (
            <button
              key={cmd}
              onClick={() => fireQuickCommand(cmd)}
              className="inline-flex items-center gap-1 rounded-full border border-cyan-400/12 bg-cyan-400/8 px-3 py-1 text-[11px] text-cyan-200 transition hover:border-cyan-400/25 hover:bg-cyan-400/15"
            >
              <Sparkles className="h-2.5 w-2.5" />
              {cmd}
            </button>
          ))}
        </div>
      </div>
    )
  }

  /* ── Step 3: 待确认 — 显示识别结果 + 确认/取消 ── */
  if (isConfirming && state.intent) {
    return (
      <div className="flex items-center gap-4 rounded-2xl border border-amber-400/20 bg-amber-400/[0.04] px-4 py-3 backdrop-blur-sm">
        {/* 识别结果 */}
        <div className="flex-1">
          <div className="text-[11px] text-amber-400/60">识别结果</div>
          <div className="mt-0.5 text-sm text-white">
            <span className="mr-2 text-amber-300">»</span>
            「{state.transcript}」
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            将执行：{state.intent.label}
          </div>
        </div>

        {/* 确认 */}
        <button
          onClick={confirm}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-emerald-400/30 bg-emerald-400/12 px-5 text-[13px] font-semibold text-emerald-200 transition hover:bg-emerald-400/20 active:scale-[0.97]"
        >
          <Check className="h-4 w-4" />
          执行
        </button>

        {/* 取消 */}
        <button
          onClick={cancel}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.05] px-5 text-[13px] font-medium text-slate-300 transition hover:bg-white/[0.08] active:scale-[0.97]"
        >
          <X className="h-4 w-4" />
          取消
        </button>
      </div>
    )
  }

  /* ── Step 4: 执行反馈 — 短暂显示结果后自动回到空闲 ── */
  if ((isExecuted || isFailed) && hasFeedback) {
    const isSuccess = state.feedback.startsWith('✓') || state.feedback.startsWith('→')
    return (
      <div
        className={`flex items-center justify-between rounded-2xl border px-4 py-3 backdrop-blur-sm ${
          isSuccess
            ? 'border-emerald-400/20 bg-emerald-400/[0.04]'
            : 'border-rose-400/20 bg-rose-400/[0.04]'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${isSuccess ? 'text-emerald-300' : 'text-rose-300'}`}>
            {state.feedback}
          </span>
          {state.transcript && (
            <span className="text-[11px] text-slate-500">
              「{state.transcript}」
            </span>
          )}
        </div>
        <button
          onClick={cancel}
          className="text-[11px] text-slate-500 transition hover:text-slate-300"
        >
          关闭
        </button>
      </div>
    )
  }

  /* ── Fallback: 回到空闲 ── */
  return (
    <div className="flex items-center justify-center rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 backdrop-blur-sm">
      <button
        onClick={startListening}
        className="inline-flex items-center gap-2.5 rounded-xl border border-cyan-400/20 bg-cyan-400/8 px-5 py-2.5 text-sm font-medium text-cyan-200 transition hover:border-cyan-400/35 hover:bg-cyan-400/15 active:scale-[0.97]"
      >
        <Mic className="h-4 w-4" />
        语音指令
      </button>
    </div>
  )
}
