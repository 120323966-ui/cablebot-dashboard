/* ═══════════════════════════════════════════════════
   useFreshness — 事件新鲜窗口判定

   论文第 5.5 节:
     "动画只在告警出现时使用,数秒后停止,避免持续闪烁
      造成视觉疲劳。"

   设计:
     - isFresh(timestamp, windowMs) 是纯函数,任何渲染层(包
       括 list.map 内部)都可调用,不违反 React hook 规则。
     - useFreshnessTick(intervalMs) 提供周期性 re-render 心
       跳,让组件能在 freshness 窗口边界自然刷新。组件每次
       渲染只调用 1 次 hook,符合规则。
     - 默认窗口 30s。这是论文未定的工程量,选取依据:
         - 告警 toast 展示窗 ~10s
         - 操作员从听到提示到处置一般 30s 量级
         - 超过 30s 仍闪 = 视觉疲劳
   ═══════════════════════════════════════════════════ */

import { useEffect, useState } from 'react'

export const DEFAULT_FRESHNESS_MS = 30_000

/**
 * 判定一个时间戳是否仍在新鲜窗口内。
 * 纯函数,可在循环 / map 内部调用。
 */
export function isFresh(
  timestamp: string | undefined | null,
  windowMs: number = DEFAULT_FRESHNESS_MS,
): boolean {
  if (!timestamp) return false
  const t = new Date(timestamp).getTime()
  if (Number.isNaN(t)) return false
  return Date.now() - t < windowMs
}

/**
 * 每 intervalMs 触发一次 re-render,用于让 isFresh() 在窗口
 * 临界点自动失效。返回当前 tick 计数(可作为 key 强制重渲)。
 *
 * 默认 5 秒一跳:对 30 秒窗口足够及时,对 CPU 几乎无开销。
 */
export function useFreshnessTick(intervalMs: number = 5_000): number {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => {
      setTick((n) => n + 1)
    }, intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])

  return tick
}
