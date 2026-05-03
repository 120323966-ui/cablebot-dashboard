import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Mic, MicOff, Sparkles, X } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import type { VoicePanelState } from '@/types/command'

declare global {
  interface Window {
    webkitSpeechRecognition?: new () => SpeechRecognition
    SpeechRecognition?: new () => SpeechRecognition
  }

  interface SpeechRecognition extends EventTarget {
    lang: string
    interimResults: boolean
    continuous: boolean
    start: () => void
    stop: () => void
    onresult: ((event: SpeechRecognitionEvent) => void) | null
    onerror: ((event: Event) => void) | null
    onend: ((event: Event) => void) | null
  }

  interface SpeechRecognitionEvent extends Event {
    results: ArrayLike<ArrayLike<{ transcript: string }>>
  }
}

const quickCommands = [
  '暂停巡检',
  '聚焦 B3 区段',
  '切换热成像',
  '打开灯光',
  '截图保存',
  '标记异常',
]

const fallbackResults = [
  '暂停当前任务',
  '聚焦 B3 区段',
  '打开告警详情',
  '切换到手动模式',
  '放大摄像头',
]

export function VoiceOverlay({
  voice,
  onClose,
  onCommand,
}: {
  voice: VoicePanelState
  onClose: () => void
  onCommand: (cmd: string) => void
}) {
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState(voice.transcript)
  const [pendingCommand, setPendingCommand] = useState<string | null>(null)
  const [history, setHistory] = useState<{ text: string; status: 'executed' | 'cancelled' }[]>([])
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  const recognitionCtor = useMemo(
    () => window.SpeechRecognition || window.webkitSpeechRecognition,
    [],
  )

  /* ── Recognition complete → enter confirmation state ── */
  const enterConfirmation = (result: string) => {
    setTranscript(result)
    setPendingCommand(result)
    setListening(false)
  }

  /* ── User confirms: execute ─────────────────────────── */
  const confirmCommand = () => {
    if (!pendingCommand) return
    setHistory((h) => [{ text: pendingCommand, status: 'executed' as const }, ...h].slice(0, 5))
    onCommand(pendingCommand)
    setPendingCommand(null)
    setTranscript('')
  }

  /* ── User rejects: cancel and close ─────────────────── */
  const rejectCommand = () => {
    if (pendingCommand) {
      setHistory((h) => [{ text: pendingCommand, status: 'cancelled' as const }, ...h].slice(0, 5))
    }
    setPendingCommand(null)
    setTranscript('')
    onClose()
  }

  const startListening = () => {
    if (pendingCommand) return // Block while confirming

    if (!recognitionCtor) {
      setListening(true)
      setTranscript('识别中...')
      window.setTimeout(() => {
        const result = fallbackResults[Math.floor(Math.random() * fallbackResults.length)]
        enterConfirmation(result)
      }, 1500)
      return
    }

    const recognition = new recognitionCtor()
    recognition.lang = 'zh-CN'
    recognition.interimResults = true
    recognition.continuous = false

    recognition.onresult = (event) => {
      const current = event.results[0]?.[0]?.transcript ?? ''
      setTranscript(current)
    }

    recognition.onend = () => {
      setListening(false)
      setTranscript((prev) => {
        if (prev && prev !== '识别中...') {
          setPendingCommand(prev)
        }
        return prev
      })
    }

    recognition.onerror = () => {
      setListening(false)
    }

    recognitionRef.current = recognition
    setListening(true)
    setTranscript('识别中...')
    recognition.start()
  }

  const stopListening = () => {
    recognitionRef.current?.stop()
    setListening(false)
  }

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop()
    }
  }, [])

  /* ── Derived state ──────────────────────────────────── */
  const isConfirming = pendingCommand !== null
  const statusLabel = listening ? '识别中' : isConfirming ? '待确认' : '待命'
  const statusTone = listening ? 'danger' as const : isConfirming ? 'warning' as const : 'good' as const
  const subtitleText = listening
    ? '正在听取语音...'
    : isConfirming
      ? '请确认是否执行该指令'
      : '点击麦克风或快捷指令'

  return (
    <div className="absolute inset-0 z-30 flex items-end justify-center bg-slate-950/40 backdrop-blur-sm">
      <div className="mb-4 w-[520px] max-w-[90%] rounded-2xl border border-cyan-400/20 bg-slate-950/90 p-5 shadow-2xl shadow-cyan-950/30 backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full ${
                listening
                  ? 'bg-cyan-400/20 text-cyan-300'
                  : isConfirming
                    ? 'bg-amber-400/20 text-amber-300'
                    : 'bg-white/8 text-slate-400'
              }`}
            >
              <Mic className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[13px] font-semibold text-white">语音指令</div>
              <div className="text-[11px] text-slate-400">{subtitleText}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={statusTone}>{statusLabel}</Badge>
            {!isConfirming && (
              <button
                onClick={onClose}
                className="rounded-lg border border-white/8 bg-white/[0.04] p-1.5 text-slate-400 transition hover:bg-white/[0.08] hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Mic button — hidden during confirmation */}
        {!isConfirming && (
          <div className="mt-4 flex items-center justify-center">
            <button
              onClick={listening ? stopListening : startListening}
              className={`group relative flex h-16 w-16 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                listening
                  ? 'border-cyan-400/50 bg-cyan-400/15 text-cyan-300 shadow-[0_0_24px_rgba(34,211,238,0.2)]'
                  : 'border-white/15 bg-white/[0.06] text-slate-300 hover:border-cyan-400/30 hover:bg-cyan-400/10 hover:text-cyan-300'
              }`}
            >
              {listening && (
                <>
                  <span className="absolute inset-0 animate-ping rounded-full border border-cyan-400/20" />
                  <span className="absolute -inset-2 animate-pulse rounded-full border border-cyan-400/10" />
                </>
              )}
              {listening ? (
                <MicOff className="relative z-10 h-6 w-6" />
              ) : (
                <Mic className="relative z-10 h-6 w-6" />
              )}
            </button>
          </div>
        )}

        {/* Transcript + Confirmation area */}
        <div
          className={`mt-4 rounded-xl border px-4 py-3 ${
            isConfirming
              ? 'border-amber-400/20 bg-amber-400/[0.04]'
              : 'border-white/8 bg-white/[0.03]'
          }`}
        >
          <div className="text-[11px] text-slate-500">
            {isConfirming ? '待确认指令' : '识别结果'}
          </div>
          <div
            className={`mt-1 text-[14px] font-medium ${
              transcript && transcript !== '识别中...'
                ? 'text-white'
                : 'text-slate-500'
            }`}
          >
            {isConfirming && (
              <span className="mr-1.5 text-amber-300">»</span>
            )}
            {transcript || '等待语音输入...'}
            {listening && transcript === '识别中...' && (
              <span className="ml-1 inline-block animate-pulse">▎</span>
            )}
          </div>

          {/* ── Confirm / Reject buttons ───────────── */}
          {isConfirming && (
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={confirmCommand}
                className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-emerald-400/30 bg-emerald-400/12 text-[13px] font-semibold text-emerald-200 transition hover:bg-emerald-400/20 active:scale-[0.97]"
              >
                <Check className="h-4 w-4" />
                是，执行
              </button>
              <button
                onClick={rejectCommand}
                className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.05] text-[13px] font-medium text-slate-300 transition hover:bg-white/[0.08] active:scale-[0.97]"
              >
                <X className="h-4 w-4" />
                否，取消
              </button>
            </div>
          )}
        </div>

        {/* Quick command chips — disabled during confirmation */}
        {!isConfirming && (
          <div className="mt-3">
            <div className="mb-2 text-[11px] text-slate-500">快捷指令</div>
            <div className="flex flex-wrap gap-1.5">
              {quickCommands.map((cmd) => (
                <button
                  key={cmd}
                  onClick={() => enterConfirmation(cmd)}
                  disabled={listening}
                  className="inline-flex items-center gap-1 rounded-full border border-cyan-400/12 bg-cyan-400/8 px-3 py-1.5 text-[11px] text-cyan-200 transition hover:border-cyan-400/25 hover:bg-cyan-400/15 disabled:opacity-40"
                >
                  <Sparkles className="h-3 w-3" />
                  {cmd}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Recent history */}
        {history.length > 0 && (
          <div className="mt-3 border-t border-white/6 pt-3">
            <div className="mb-1.5 text-[11px] text-slate-500">最近指令</div>
            <div className="space-y-1">
              {history.map((item, i) => (
                <div
                  key={`${item.text}-${i}`}
                  className="flex items-center gap-2 text-[12px]"
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      item.status === 'executed'
                        ? 'bg-emerald-400/60'
                        : 'bg-slate-500/40'
                    }`}
                  />
                  <span
                    className={
                      item.status === 'executed'
                        ? 'text-slate-300'
                        : 'text-slate-500 line-through'
                    }
                  >
                    {item.text}
                  </span>
                  <span
                    className={`ml-auto text-[10px] ${
                      item.status === 'executed'
                        ? 'text-emerald-400/60'
                        : 'text-slate-600'
                    }`}
                  >
                    {item.status === 'executed' ? '已执行' : '已取消'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
