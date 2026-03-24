/**
 * AlertToast — 全局告警视觉通知
 *
 * 新告警（critical/warning）到达时从右上角滑入，5 秒后自动消失。
 * 点击跳转告警处置页，× 按钮可提前关闭。
 * 底部带倒计时进度条，给巡检员明确的"还剩多久消失"预期。
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Flame, X } from 'lucide-react'
import type { AlertItem, Severity } from '@/types/dashboard'

const TOAST_DURATION = 5000

const severityConfig: Record<Severity, {
  border: string
  bg: string
  stripe: string
  icon: React.ComponentType<{ className?: string }>
  iconColor: string
  label: string
  countdownColor: string
}> = {
  critical: {
    border: 'border-rose-500/30',
    bg: 'bg-[rgba(15,5,8,0.92)]',
    stripe: 'bg-rose-500',
    icon: Flame,
    iconColor: 'text-rose-400',
    label: '严重',
    countdownColor: 'bg-rose-400/60',
  },
  warning: {
    border: 'border-amber-500/30',
    bg: 'bg-[rgba(15,12,5,0.92)]',
    stripe: 'bg-amber-500',
    icon: AlertTriangle,
    iconColor: 'text-amber-400',
    label: '警告',
    countdownColor: 'bg-amber-400/60',
  },
  info: {
    border: 'border-sky-500/30',
    bg: 'bg-[rgba(5,10,15,0.92)]',
    stripe: 'bg-sky-500',
    icon: AlertTriangle,
    iconColor: 'text-sky-400',
    label: '提示',
    countdownColor: 'bg-sky-400/60',
  },
}

export function AlertToast({
  alert,
  onDismiss,
}: {
  alert: AlertItem
  onDismiss: () => void
}) {
  const navigate = useNavigate()
  const [exiting, setExiting] = useState(false)

  /* ── 5 秒后自动退出 ── */
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setExiting(true)
    }, TOAST_DURATION)
    return () => window.clearTimeout(timer)
  }, [alert.id])

  /* ── 退出动画结束后调用 onDismiss ── */
  useEffect(() => {
    if (!exiting) return
    const timer = window.setTimeout(onDismiss, 300) // 与 toast-out 动画时长匹配
    return () => window.clearTimeout(timer)
  }, [exiting, onDismiss])

  const handleClose = () => setExiting(true)

  const handleClick = () => {
    navigate('/alerts')
    onDismiss()
  }

  const cfg = severityConfig[alert.severity]
  const SevIcon = cfg.icon

  return (
    <div
      className={`${exiting ? 'toast-exit' : 'toast-enter'} pointer-events-auto flex w-[360px] overflow-hidden rounded-2xl border ${cfg.border} ${cfg.bg} shadow-2xl shadow-black/40 backdrop-blur-xl`}
    >
      {/* 左侧色带 */}
      <div className={`w-1 shrink-0 ${cfg.stripe}`} />

      {/* 内容区 */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start gap-3 px-4 py-3">
          {/* 图标 */}
          <div className="mt-0.5 shrink-0">
            <SevIcon className={`h-4.5 w-4.5 ${cfg.iconColor}`} />
          </div>

          {/* 文本 */}
          <button
            onClick={handleClick}
            className="min-w-0 flex-1 text-left"
          >
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium text-white">{alert.title}</span>
              <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                alert.severity === 'critical'
                  ? 'bg-rose-500/15 text-rose-300'
                  : 'bg-amber-500/15 text-amber-300'
              }`}>
                {cfg.label}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
              <span className="font-medium text-slate-300">{alert.segmentId}</span>
              <span>·</span>
              <span className="truncate">{alert.evidence}</span>
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500">点击查看详情</div>
          </button>

          {/* 关闭按钮 */}
          <button
            onClick={handleClose}
            className="mt-0.5 shrink-0 rounded-lg p-1 text-slate-500 transition hover:bg-white/8 hover:text-slate-300"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* 倒计时进度条 */}
        <div className="h-[2px] w-full bg-white/5">
          <div
            className={`h-full ${cfg.countdownColor}`}
            style={{
              animation: `toast-countdown ${TOAST_DURATION}ms linear forwards`,
            }}
          />
        </div>
      </div>
    </div>
  )
}
