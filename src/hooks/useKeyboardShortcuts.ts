/**
 * useKeyboardShortcuts — 全局键盘快捷键
 *
 * 挂载在 ShellLayout 层级，整个应用生命周期内运行。
 * 输入框聚焦时自动跳过，避免打字误触。
 *
 * 快捷键列表：
 *   Space — 暂停/恢复巡检（全局）
 *   Escape — 急停（全局）
 *   1-6   — 切换页面（全局）
 *   M     — 切换 TTS 静音（全局）
 *   V     — 开始语音识别（首页/巡检页/告警页）
 *   Y     — 确认执行语音指令（首页/巡检页/告警页）
 *   N     — 取消语音指令（首页/巡检页/告警页）
 *   L     — 灯光开关（仅 Command 页）
 *   R     — 录制开关（仅 Command 页）
 */

import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useDashboardContext } from '@/context/DashboardContext'
import { isVoiceMuted, setVoiceMuted } from '@/utils/voiceAudio'

/** 快捷键定义（供帮助面板展示） */
export interface ShortcutEntry {
  key: string
  label: string
  scope: '全局' | '巡检页'
}

export const SHORTCUT_LIST: ShortcutEntry[] = [
  { key: 'Space', label: '暂停 / 恢复巡检', scope: '全局' },
  { key: 'Esc', label: '急停', scope: '全局' },
  { key: '1-6', label: '切换页面', scope: '全局' },
  { key: 'M', label: '切换语音静音', scope: '全局' },
  { key: 'V', label: '开始语音识别', scope: '全局' },
  { key: 'Y', label: '确认执行语音指令', scope: '全局' },
  { key: 'N', label: '取消语音指令', scope: '全局' },
  { key: 'L', label: '灯光开关', scope: '巡检页' },
  { key: 'R', label: '录制开关', scope: '巡检页' },
]

/** 页面编号 → 路由路径 */
const PAGE_MAP: Record<string, string> = {
  '1': '/overview',
  '2': '/command',
  '3': '/alerts',
  '4': '/spatial',
  '5': '/history',
  '6': '/reports',
}

/**
 * Command 页设备控制回调。
 * 由 CommandPage 通过此 ref 注入，避免 hook 与页面组件的循环依赖。
 */
type CommandAction = (key: 'lightOn' | 'recording') => void

let _commandToggle: CommandAction | null = null

/** CommandPage 调用此函数注册设备控制回调 */
export function registerCommandToggle(fn: CommandAction) {
  _commandToggle = fn
}

/** CommandPage 卸载时调用此函数清理 */
export function unregisterCommandToggle() {
  _commandToggle = null
}

/**
 * 语音控制回调。
 * 由带语音交互的页面（首页/Command/告警页）注入。
 */
interface VoiceActions {
  startListening: () => void
  confirm: () => void
  cancel: () => void
  getStatus: () => string
}

let _voiceActions: VoiceActions | null = null

/** 页面注册语音回调（进入页面时调用） */
export function registerVoiceActions(actions: VoiceActions) {
  _voiceActions = actions
}

/** 页面注销语音回调（离开页面时调用） */
export function unregisterVoiceActions() {
  _voiceActions = null
}

/** 有语音交互的页面路径 */
const VOICE_PAGES = new Set(['/overview', '/command', '/alerts'])

export function useKeyboardShortcuts() {
  const navigate = useNavigate()
  const location = useLocation()
  const { updateData } = useDashboardContext()

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // ── 输入框聚焦时跳过 ──
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if ((e.target as HTMLElement)?.isContentEditable) return

      const key = e.key
      const isCommand = location.pathname === '/command'
      const hasVoice = VOICE_PAGES.has(location.pathname)

      // ── Space: 暂停/恢复 ──
      if (key === ' ') {
        e.preventDefault()
        updateData((d) => {
          if (!d.activeTask) return d
          const next = d.activeTask.status === 'paused' ? 'running' : 'paused'
          return { ...d, activeTask: { ...d.activeTask, status: next } }
        })
        return
      }

      // ── Escape: 急停（如果语音处于识别中则优先取消语音） ──
      if (key === 'Escape') {
        e.preventDefault()
        if (_voiceActions) {
          const status = _voiceActions.getStatus()
          if (status === 'listening' || status === 'confirming') {
            _voiceActions.cancel()
            return
          }
        }
        updateData((d) => {
          if (!d.activeTask) return d
          return { ...d, activeTask: { ...d.activeTask, status: 'paused' } }
        })
        return
      }

      // ── V: 开始语音识别 ──
      if ((key === 'v' || key === 'V') && hasVoice && _voiceActions) {
        if (e.ctrlKey || e.metaKey || e.altKey) return
        e.preventDefault()
        const status = _voiceActions.getStatus()
        if (status === 'idle' || status === 'executed' || status === 'failed') {
          _voiceActions.startListening()
        }
        return
      }

      // ── Y: 确认执行 ──
      if ((key === 'y' || key === 'Y') && hasVoice && _voiceActions) {
        if (e.ctrlKey || e.metaKey || e.altKey) return
        const status = _voiceActions.getStatus()
        if (status === 'confirming') {
          e.preventDefault()
          _voiceActions.confirm()
        }
        return
      }

      // ── N: 取消 ──
      if ((key === 'n' || key === 'N') && hasVoice && _voiceActions) {
        if (e.ctrlKey || e.metaKey || e.altKey) return
        const status = _voiceActions.getStatus()
        if (status === 'confirming' || status === 'listening') {
          e.preventDefault()
          _voiceActions.cancel()
        }
        return
      }

      // ── 1-6: 页面切换 ──
      if (!e.ctrlKey && !e.metaKey && !e.altKey && PAGE_MAP[key]) {
        e.preventDefault()
        navigate(PAGE_MAP[key])
        return
      }

      // ── M: 切换静音 ──
      if (key === 'm' || key === 'M') {
        if (e.ctrlKey || e.metaKey || e.altKey) return
        e.preventDefault()
        setVoiceMuted(!isVoiceMuted())
        window.dispatchEvent(new CustomEvent('voice-mute-changed'))
        return
      }

      // ── 以下仅 Command 页 ──
      if (!isCommand || !_commandToggle) return

      // ── L: 灯光 ──
      if (key === 'l' || key === 'L') {
        if (e.ctrlKey || e.metaKey || e.altKey) return
        e.preventDefault()
        _commandToggle('lightOn')
        return
      }

      // ── R: 录制 ──
      if (key === 'r' || key === 'R') {
        if (e.ctrlKey || e.metaKey || e.altKey) return
        e.preventDefault()
        _commandToggle('recording')
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navigate, location.pathname, updateData])
}
