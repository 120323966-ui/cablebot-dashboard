/**
 * useRegisterVoiceKeys — 将当前页面的 voice engine 注册到全局快捷键系统
 *
 * 在有语音交互的页面（首页/Command/告警页）调用，
 * 传入 useVoiceEngine 的返回值即可，mount 时注册，unmount 时注销。
 */

import { useEffect, useRef } from 'react'
import type { UseVoiceEngineReturn } from '@/hooks/useVoiceEngine'
import { registerVoiceActions, unregisterVoiceActions } from '@/hooks/useKeyboardShortcuts'

export function useRegisterVoiceKeys(voice: UseVoiceEngineReturn) {
  const statusRef = useRef(voice.state.status)

  useEffect(() => {
    statusRef.current = voice.state.status
  }, [voice.state.status])

  useEffect(() => {
    registerVoiceActions({
      startListening: voice.startListening,
      confirm: voice.confirm,
      cancel: voice.cancel,
      getStatus: () => statusRef.current,
    })
    return () => unregisterVoiceActions()
  }, [voice.startListening, voice.confirm, voice.cancel])
}
