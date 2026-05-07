/**
 * CommandVoiceDock — 实时巡检页语音交互条
 *
 * 和首页 ActionDock 交互逻辑一致（五步流程），
 * 但形态不同：这是一个悬浮在视频底部的半透明窄条，
 * 不遮挡隧道画面主体。
 */

import { Check, Mic, MicOff, Sparkles, X } from 'lucide-react'
import type { UseVoiceEngineReturn } from '@/hooks/useVoiceEngine'
import { COMMAND_QUICK_COMMANDS } from '@/utils/voiceIntents'

export function CommandVoiceDock({
  voice,
  onClose,
}: {
  voice: UseVoiceEngineReturn
  onClose: () => void
}) {
  const { state, startListening, stopListening, confirm, cancel, fireQuickCommand } = voice
  const isIdle = state.status === 'idle'
  const isListening = state.status === 'listening'
  const isConfirming = state.status === 'confirming'
  const isExecuted = state.status === 'executed'
  const isFailed = state.status === 'failed'
  const hasFeedback = Boolean(state.feedback)

  const handleClose = () => {
    cancel()
    onClose()
  }

  /* ── Step 1: 空闲 — 麦克风按钮 + 快捷指令 ── */
  if (isIdle) {
    return (
      <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col gap-1.5 rounded-b-2xl bg-slate-950/80 px-3 py-2.5 backdrop-blur-md">
        {/* Quick commands */}
        <div className="flex flex-wrap items-center gap-1.5">
          {COMMAND_QUICK_COMMANDS.map((cmd) => (
            <button
              key={cmd}
              onClick={() => fireQuickCommand(cmd)}
              className="inline-flex items-center gap-1 rounded-full border border-cyan-400/12 bg-cyan-400/8 px-2.5 py-1 text-[10px] text-cyan-200 transition hover:border-cyan-400/25 hover:bg-cyan-400/15"
            >
              <Sparkles className="h-2.5 w-2.5" />
              {cmd}
            </button>
          ))}
        </div>

        {/* Bottom row: mic + hint + close */}
        <div className="flex items-center gap-2">
          <button
            onClick={startListening}
            className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-[11px] font-medium text-cyan-200 transition hover:bg-cyan-400/20 active:scale-[0.97]"
          >
            <Mic className="h-3.5 w-3.5" />
            语音指令
          </button>
          <span className="flex-1 text-[10px] text-slate-500">
            点击开始语音 · 或选择上方快捷指令
          </span>
          <button
            onClick={handleClose}
            className="rounded-lg p-1 text-slate-500 transition hover:bg-white/[0.06] hover:text-slate-300"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    )
  }

  /* ── Step 2: 识别中 ── */
  if (isListening) {
    return (
      <div className="absolute inset-x-0 bottom-0 z-20 rounded-b-2xl border-t border-cyan-400/20 bg-slate-950/85 px-3 py-2.5 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          {/* Mic button (click to cancel) */}
          <button
            onClick={() => { stopListening(); cancel() }}
            className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cyan-400/40 bg-cyan-400/15 text-cyan-300"
          >
            <span className="absolute inset-0 animate-ping rounded-full border border-cyan-400/20" />
            <MicOff className="relative z-10 h-3.5 w-3.5" />
          </button>

          {/* Transcript */}
          <div className="flex-1">
            <div className="text-[10px] text-cyan-400/60">正在聆听...</div>
            <div className="text-[12px] text-white">
              {state.transcript && state.transcript !== '识别中...'
                ? state.transcript
                : <span className="text-slate-500">等待语音输入<span className="ml-0.5 inline-block animate-pulse">▎</span></span>
              }
            </div>
          </div>

          <span className="text-[10px] text-slate-600">点击麦克风取消</span>
        </div>
      </div>
    )
  }

  /* ── Step 3: 待确认 ── */
  if (isConfirming && state.intent) {
    return (
      <div className="absolute inset-x-0 bottom-0 z-20 rounded-b-2xl border-t border-amber-400/20 bg-slate-950/90 px-3 py-2.5 backdrop-blur-md">
        <div className="flex items-center gap-3">
          {/* Result */}
          <div className="flex-1 min-w-0">
            <div className="text-[10px] text-amber-400/60">识别结果</div>
            <div className="text-[12px] text-white truncate">
              <span className="mr-1.5 text-amber-300">»</span>
              「{state.transcript}」
              <span className="ml-1.5 text-[10px] text-slate-400">→ {state.intent.label}</span>
            </div>
          </div>

          {/* Confirm */}
          <button
            onClick={confirm}
            className="inline-flex h-7 items-center gap-1 rounded-lg border border-emerald-400/30 bg-emerald-400/12 px-3 text-[11px] font-semibold text-emerald-200 transition hover:bg-emerald-400/20 active:scale-[0.97]"
          >
            <Check className="h-3 w-3" />
            执行
          </button>

          {/* Cancel */}
          <button
            onClick={cancel}
            className="inline-flex h-7 items-center gap-1 rounded-lg border border-white/10 bg-white/[0.05] px-3 text-[11px] text-slate-300 transition hover:bg-white/[0.08] active:scale-[0.97]"
          >
            <X className="h-3 w-3" />
            取消
          </button>
        </div>
      </div>
    )
  }

  /* ── Step 4: 反馈 ── */
  if ((isExecuted || isFailed) && hasFeedback) {
    const isSuccess = state.feedback.startsWith('✓') || state.feedback.startsWith('→')
    return (
      <div
        className={`absolute inset-x-0 bottom-0 z-20 rounded-b-2xl border-t px-3 py-2 backdrop-blur-md ${
          isSuccess
            ? 'border-emerald-400/20 bg-slate-950/85'
            : 'border-rose-400/20 bg-slate-950/85'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className={`text-[12px] font-medium ${isSuccess ? 'text-emerald-300' : 'text-rose-300'}`}>
            {state.feedback}
          </span>
          <span className="text-[10px] text-slate-600 truncate">
            「{state.transcript}」
          </span>
          <button
            onClick={cancel}
            className="ml-auto text-[10px] text-slate-500 transition hover:text-slate-300"
          >
            关闭
          </button>
        </div>
      </div>
    )
  }

  /* ── Fallback ── */
  return null
}
