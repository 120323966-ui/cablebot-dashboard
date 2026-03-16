import { Mic, MicOff, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

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

const fallbackCommands = ['暂停当前任务', '聚焦 B3 区段', '打开告警详情']

export function VoiceEntry() {
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const recognitionCtor = useMemo(() => window.SpeechRecognition || window.webkitSpeechRecognition, [])

  const start = () => {
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
    recognition.onresult = (event) => {
      const next = event.results[0]?.[0]?.transcript ?? ''
      setTranscript(next)
      setListening(false)
    }
    recognition.onerror = () => setListening(false)
    setListening(true)
    recognition.start()
  }

  return (
    <Card eyebrow="Multimodal" title="语音入口">
      <div className="rounded-3xl border border-cyan-400/15 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.12),transparent_42%)] p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-lg font-medium text-white">多模态交互待命</div>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              首页仅保留轻量语音入口，用于快速触发“暂停任务 / 聚焦区段 / 打开告警”等高频指令。
            </p>
          </div>
          <Badge tone={listening ? 'danger' : 'good'}>{listening ? 'Listening' : 'Standby'}</Badge>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button onClick={start}>
            {listening ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
            {listening ? '正在识别' : '开始语音指令'}
          </Button>
          <div className="inline-flex items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-2 text-sm text-slate-300">
            <Sparkles className="h-4 w-4 text-cyan-300" />
            最近识别：{transcript || '暂无'}
          </div>
        </div>
      </div>
    </Card>
  )
}
