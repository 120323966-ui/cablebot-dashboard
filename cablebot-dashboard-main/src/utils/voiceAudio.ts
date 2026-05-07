/**
 * voiceAudio — 语音交互音频反馈 + TTS 播报
 *
 * 三类音频输出：
 * 1. confirmTone / rejectTone — 指令执行的短促提示音
 * 2. speak(text) — TTS 语音播报（指令确认、告警推送）
 * 3. announceAlert(title, severity) — 告警主动播报（带防抖）
 */

/* ══════════════════════════════════
   提示音（AudioContext）
   ══════════════════════════════════ */

let audioCtx: AudioContext | null = null

function getCtx(): AudioContext | null {
  try {
    if (!audioCtx) {
      audioCtx = new (
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      )()
    }
    return audioCtx
  } catch {
    return null
  }
}

function playTone(freqs: number[], duration: number, type: OscillatorType = 'sine') {
  const ctx = getCtx()
  if (!ctx) return
  if (ctx.state === 'suspended') ctx.resume()

  const gain = ctx.createGain()
  gain.connect(ctx.destination)
  gain.gain.setValueAtTime(0.12, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)

  const segDuration = duration / freqs.length
  freqs.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    osc.type = type
    osc.frequency.setValueAtTime(freq, ctx.currentTime + i * segDuration)
    osc.connect(gain)
    osc.start(ctx.currentTime + i * segDuration)
    osc.stop(ctx.currentTime + (i + 1) * segDuration)
  })
}

/** 执行成功：上升双音 */
export function playConfirmTone() {
  playTone([440, 660], 0.2, 'sine')
}

/** 未识别 / 取消：单低音 */
export function playRejectTone() {
  playTone([330], 0.18, 'triangle')
}

/* ══════════════════════════════════
   TTS 语音播报
   ══════════════════════════════════ */

/** 全局静音开关 */
let _muted = false

export function setVoiceMuted(muted: boolean) {
  _muted = muted
}

export function isVoiceMuted() {
  return _muted
}

/**
 * TTS 播报。
 * - 中文语音，语速 1.2，音量 0.8
 * - 静音时不播报
 * - 如果上一条还没播完，会先取消再播新的
 */
export function speak(text: string) {
  if (_muted) return
  if (!('speechSynthesis' in window)) return

  // 取消正在播放的
  window.speechSynthesis.cancel()

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'zh-CN'
  utterance.rate = 1.2
  utterance.volume = 0.8
  utterance.pitch = 1.0

  // 尝试选择中文语音
  const voices = window.speechSynthesis.getVoices()
  const zhVoice = voices.find((v) => v.lang.startsWith('zh'))
  if (zhVoice) utterance.voice = zhVoice

  window.speechSynthesis.speak(utterance)
}

/* ══════════════════════════════════
   告警主动播报（带防抖）
   ══════════════════════════════════ */

const recentAlerts = new Map<string, number>()
const ALERT_DEBOUNCE_MS = 30_000 // 同类告警 30 秒内不重复播报

const severityLabel: Record<string, string> = {
  critical: '严重',
  warning: '警告',
  info: '提示',
}

/**
 * 播报新告警。
 * - 只播报 critical 和 warning 级别
 * - 同一 segmentId 的告警 30 秒内不重复
 * - 格式："注意，B3 区段温度波动增强，严重级别"
 */
export function announceAlert(
  title: string,
  severity: string,
  segmentId: string,
) {
  if (_muted) return
  if (severity === 'info') return

  // 防抖：同区段同级别 30 秒内不重复
  const key = `${segmentId}-${severity}`
  const now = Date.now()
  const lastTime = recentAlerts.get(key)
  if (lastTime && now - lastTime < ALERT_DEBOUNCE_MS) return
  recentAlerts.set(key, now)

  // 清理过期记录
  for (const [k, t] of recentAlerts) {
    if (now - t > ALERT_DEBOUNCE_MS * 2) recentAlerts.delete(k)
  }

  const level = severityLabel[severity] ?? severity
  const text = `注意，${segmentId}区段，${title}，${level}级别`
  speak(text)
}

/* ══════════════════════════════════
   自动急停播报
   ══════════════════════════════════ */

/** 已播报的自动急停事件 id 集合，避免同一事件重复播报 */
const announcedAutoEstops = new Set<string>()

/**
 * 自动急停语音播报。
 *
 * 与 announceAlert 的区别：
 * - 不受 30 秒防抖限制（急停是系统接管，必须立即播报）
 * - 按事件 id 去重（同一急停事件只播一次，避免组件重渲染重播）
 * - 略微延迟播放，让先发的紧急告警 TTS 有机会播出几个字再被覆盖，
 *   并以更醒目的措辞体现"系统已接管"
 *
 * 触发位置：DashboardContext 自动急停判定命中后立即调用。
 */
export function announceAutoEstop(params: {
  /** 急停事件唯一 id（用于去重） */
  eventId: string
  /** 触发该急停的告警所在区段 */
  segmentId: string
  /** 触发该急停的告警标题 */
  alertTitle: string
}) {
  if (_muted) return
  if (announcedAutoEstops.has(params.eventId)) return
  announcedAutoEstops.add(params.eventId)

  // 防止集合无限膨胀，超过 50 条时清掉最早的一半
  if (announcedAutoEstops.size > 50) {
    const arr = Array.from(announcedAutoEstops)
    announcedAutoEstops.clear()
    arr.slice(-25).forEach((id) => announcedAutoEstops.add(id))
  }

  // 略微延迟，让 announceAlert 已经触发的 TTS 有机会进入队列
  // 由于 speak() 内部会 cancel 上一条，这里 600ms 后播急停消息会盖掉同步发起的告警 TTS，
  // 这是预期行为：急停消息优先级高于普通告警通报。
  const text = `警告，${params.segmentId}区段监测值已超紧急阈值，系统已自动急停。${params.alertTitle}`
  window.setTimeout(() => speak(text), 600)
}
