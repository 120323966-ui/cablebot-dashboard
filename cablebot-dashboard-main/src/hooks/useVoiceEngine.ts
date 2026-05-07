/**
 * useVoiceEngine — 统一语音识别引擎 v3
 *
 * v3 改动：确认执行后用 TTS 播报指令结果（如"灯光已开启"）
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { matchIntent, type VoiceIntent } from '@/utils/voiceIntents'
import { playConfirmTone, playRejectTone, speak } from '@/utils/voiceAudio'

/* ── Web Speech API types ── */

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

/* ── Types ── */

export type VoiceStatus = 'idle' | 'listening' | 'confirming' | 'executed' | 'failed'

export interface VoiceState {
  status: VoiceStatus
  transcript: string
  intent: VoiceIntent | null
  feedback: string
}

export interface UseVoiceEngineReturn {
  state: VoiceState
  startListening: () => void
  stopListening: () => void
  confirm: () => void
  cancel: () => void
  fireQuickCommand: (text: string) => void
}

/* ── Fallback transcripts ── */

const fallbackTranscripts = [
  '暂停当前任务',
  '聚焦 B3 区段',
  '打开告警详情',
  '进入实时巡检',
  '导出报告',
]

/* ── Hook ── */

export function useVoiceEngine(
  onExecute: (intent: VoiceIntent) => void,
): UseVoiceEngineReturn {
  const [state, setState] = useState<VoiceState>({
    status: 'idle',
    transcript: '',
    intent: null,
    feedback: '',
  })

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const Ctor = useMemo(
    () =>
      typeof window !== 'undefined'
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : undefined,
    [],
  )

  const clearFeedbackTimer = useCallback(() => {
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current)
      feedbackTimerRef.current = null
    }
  }, [])

  const showFeedback = useCallback(
    (text: string, duration = 2500) => {
      clearFeedbackTimer()
      setState((s) => ({ ...s, feedback: text }))
      feedbackTimerRef.current = setTimeout(() => {
        setState({ status: 'idle', transcript: '', intent: null, feedback: '' })
      }, duration)
    },
    [clearFeedbackTimer],
  )

  const processTranscript = useCallback(
    (text: string) => {
      const intent = matchIntent(text)

      if (!intent) {
        playRejectTone()
        speak('未识别到有效指令')
        setState({
          status: 'failed',
          transcript: text,
          intent: null,
          feedback: `✗ 未识别指令：「${text}」`,
        })
        clearFeedbackTimer()
        feedbackTimerRef.current = setTimeout(() => {
          setState({ status: 'idle', transcript: '', intent: null, feedback: '' })
        }, 3000)
        return
      }

      // 所有匹配成功的指令进入待确认状态
      setState({
        status: 'confirming',
        transcript: text,
        intent,
        feedback: '',
      })
    },
    [clearFeedbackTimer],
  )

  /* ── 开始识别 ── */
  const startListening = useCallback(() => {
    if (state.status === 'confirming') return
    clearFeedbackTimer()

    if (!Ctor) {
      setState({ status: 'listening', transcript: '识别中...', intent: null, feedback: '' })
      setTimeout(() => {
        const text = fallbackTranscripts[Math.floor(Math.random() * fallbackTranscripts.length)]
        processTranscript(text)
      }, 1200)
      return
    }

    const recognition = new Ctor()
    recognition.lang = 'zh-CN'
    recognition.interimResults = true
    recognition.continuous = false

    recognition.onresult = (event) => {
      const current = event.results[0]?.[0]?.transcript ?? ''
      setState((s) => ({ ...s, transcript: current }))
    }

    recognition.onend = () => {
      setState((prev) => {
        if (prev.transcript && prev.transcript !== '识别中...') {
          setTimeout(() => processTranscript(prev.transcript), 0)
        }
        return { ...prev, status: prev.transcript ? prev.status : 'idle' }
      })
    }

    recognition.onerror = () => {
      setState({ status: 'idle', transcript: '', intent: null, feedback: '' })
    }

    recognitionRef.current = recognition
    setState({ status: 'listening', transcript: '识别中...', intent: null, feedback: '' })
    recognition.start()
  }, [Ctor, state.status, clearFeedbackTimer, processTranscript])

  /* ── 停止识别 ── */
  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  /* ── 用户确认执行 ── */
  const confirm = useCallback(() => {
    if (!state.intent) return

    playConfirmTone()
    onExecute(state.intent)

    // TTS 播报执行结果
    const label = state.intent.label
    // 去掉前缀符号用于播报
    const speakText = label.replace(/^[✓→]\s*/, '')
    speak(speakText)

    setState((s) => ({ ...s, status: 'executed' }))
    showFeedback(`✓ ${label}`)
  }, [state.intent, onExecute, showFeedback])

  /* ── 用户取消 ── */
  const cancel = useCallback(() => {
    clearFeedbackTimer()
    setState({ status: 'idle', transcript: '', intent: null, feedback: '' })
  }, [clearFeedbackTimer])

  /* ── 快捷指令 ── */
  const fireQuickCommand = useCallback(
    (text: string) => {
      clearFeedbackTimer()
      processTranscript(text)
    },
    [clearFeedbackTimer, processTranscript],
  )

  /* ── Cleanup ── */
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop()
      clearFeedbackTimer()
    }
  }, [clearFeedbackTimer])

  return { state, startListening, stopListening, confirm, cancel, fireQuickCommand }
}
