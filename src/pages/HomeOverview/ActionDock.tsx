import { useMemo, useState } from 'react'
import { Bolt, FileOutput, Focus, Mic, MicOff, Sparkles } from 'lucide-react'
import type { QuickAction } from '@/types/dashboard'

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
  }

  interface SpeechRecognitionEvent extends Event {
    results: ArrayLike<ArrayLike<{ transcript: string }>>
  }
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  pause: Bolt,
  export: FileOutput,
  'focus-b3': Focus,
  voice: Mic,
}

const fallbackCommands = ['暂停当前任务', '聚焦 B3 区段', '打开告警详情']

export function ActionDock({
  actions,
  onAction,
}: {
  actions: QuickAction[]
  onAction: (action: QuickAction) => void
}) {
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const recognitionCtor = useMemo(
    () => (typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : undefined),
    [],
  )

  const startVoice = () => {
    if (!recognitionCtor) {
      setListening(true)
      window.setTimeout(() => {
        setTranscript(fallbackCommands[Math.floor(Math.random() * fallbackCommands.length)])
        setListening(false)
      }, 1200)
      return
    }
    const recognition = new recognitionCtor()
    recognition.lang = 'zh-CN'
    recognition.interimResults = false
    recognition.continuous = false
    recognition.onresult = (e) => {
      setTranscript(e.results[0]?.[0]?.transcript ?? '')
      setListening(false)
    }
    recognition.onerror = () => setListening(false)
    setListening(true)
    recognition.start()
  }

  /* filter out the "voice" action from the actions list (we handle it separately) */
  const quickActions = actions.filter((a) => a.id !== 'voice')

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-2.5 backdrop-blur-sm">
      {/* Quick action buttons */}
      {quickActions.map((action) => {
        const Icon = iconMap[action.id] ?? Bolt
        return (
          <button
            key={action.id}
            onClick={() => onAction(action)}
            className="inline-flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3.5 py-2 text-sm text-slate-200 transition hover:border-cyan-400/20 hover:bg-white/[0.06] hover:text-white"
            title={action.description}
          >
            <Icon className="h-4 w-4 text-cyan-400" />
            {action.label}
          </button>
        )
      })}

      {/* Separator */}
      <span className="mx-1 h-5 w-px bg-white/8" />

      {/* Voice button */}
      <button
        onClick={startVoice}
        className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm transition ${
          listening
            ? 'border-rose-400/25 bg-rose-500/12 text-rose-200'
            : 'border-cyan-400/15 bg-cyan-400/8 text-cyan-200 hover:bg-cyan-400/15'
        }`}
      >
        {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        {listening ? '识别中…' : '语音指令'}
      </button>

      {/* Transcript display */}
      {transcript ? (
        <span className="ml-1 inline-flex items-center gap-1.5 text-xs text-slate-400">
          <Sparkles className="h-3 w-3 text-cyan-400" />
          {transcript}
        </span>
      ) : null}
    </div>
  )
}
