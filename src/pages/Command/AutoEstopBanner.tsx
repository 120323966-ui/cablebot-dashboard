import { AlertTriangle, X } from 'lucide-react'
import type { AutoEstopEvent } from '@/context/dashboardContextCore'

/**
 * 自动急停提示横幅
 *
 * 当系统因监测值越过紧急阈值自动下发急停指令时，由 DashboardContext 写入
 * autoEstopEvent，本组件订阅显示。
 *
 * 操作员可以选择：
 *   - "恢复行进"：清除事件、调用 onRecover 让机器人回到运行状态
 *   - "关闭"：仅清除事件横幅，机器人保持急停状态
 *
 * 横幅位于 CenterVideoStage 顶部，覆盖在视频画面上方，
 * 视觉强度高（红色高亮 + 警示图标），保证操作员第一时间看到。
 */
export function AutoEstopBanner({
  event,
  onRecover,
  onDismiss,
}: {
  event: AutoEstopEvent
  /** 操作员点击"恢复行进"，由父组件下发 continue 指令并清除事件 */
  onRecover: () => void
  /** 操作员仅关闭横幅但不恢复机器人 */
  onDismiss: () => void
}) {
  const triggeredAtLabel = new Date(event.triggeredAt).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  return (
    <div className="absolute inset-x-0 top-0 z-30 border-b border-rose-400/40 bg-rose-950/85 px-4 py-2.5 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-rose-400/40 bg-rose-500/20 text-rose-100">
          <AlertTriangle className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-rose-100">系统已自动急停</span>
            <span className="rounded-md border border-rose-400/30 bg-rose-500/15 px-1.5 py-0.5 text-[10px] text-rose-200">
              来源 {event.alertId}
            </span>
            <span className="text-[10px] text-rose-300/70">
              {triggeredAtLabel} · {event.segmentId}
            </span>
          </div>
          <div className="mt-0.5 truncate text-[11px] text-rose-200/85">
            {event.alertTitle}
            {event.alertEvidence ? ` · ${event.alertEvidence}` : ''}
            <span className="ml-1 text-rose-300/65">已超紧急阈值，机器人 {event.robotId} 已停止</span>
          </div>
        </div>

        <button
          onClick={onRecover}
          className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-emerald-400/40 bg-emerald-400/15 px-3 text-[11px] font-semibold text-emerald-100 transition hover:bg-emerald-400/25 active:scale-[0.97]"
        >
          恢复行进
        </button>
        <button
          onClick={onDismiss}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/[0.06] text-rose-200/80 transition hover:bg-white/[0.10] active:scale-[0.97]"
          aria-label="关闭横幅"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
