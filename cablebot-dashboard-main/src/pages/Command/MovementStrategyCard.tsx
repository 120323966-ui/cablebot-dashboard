import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Check, Eye, Gauge, Loader2, Pause, X } from 'lucide-react'
import type {
  CommandRobotState,
  MovementStrategySuggestion,
} from '@/types/command'

/** 执行反馈状态：
 *  - pending  ：待操作员确认（默认形态）
 *  - executing：已确认，等待机器人达到目标状态
 *  - done     ：已达到目标状态，停留 1.5s 后自动消失
 *  - timeout  ：超过 EXEC_TIMEOUT_MS 仍未达成，提示操作员检查
 */
type ExecPhase = 'pending' | 'executing' | 'done' | 'timeout'

const EXEC_TIMEOUT_MS = 5000
const DONE_LINGER_MS = 1500
/** slow 指令统一目标速度（与 commandFromStrategy 中 payload.speedKmh 保持一致） */
const SLOW_TARGET_SPEED = 0.5

function actionMeta(action: MovementStrategySuggestion['action']) {
  switch (action) {
    case 'stop':
      return {
        icon: <Pause className="h-4 w-4" />,
        tone: 'border-rose-400/25 bg-rose-500/10 text-rose-100',
        label: '停止',
      }
    case 'slow':
      return {
        icon: <Gauge className="h-4 w-4" />,
        tone: 'border-amber-400/25 bg-amber-400/10 text-amber-100',
        label: '减速',
      }
    case 'takeover':
      return {
        icon: <AlertTriangle className="h-4 w-4" />,
        tone: 'border-rose-400/25 bg-rose-500/10 text-rose-100',
        label: '接管',
      }
    case 'continue':
      return {
        icon: <Check className="h-4 w-4" />,
        tone: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100',
        label: '继续',
      }
  }
}

/** 判断机器人当前状态是否已经达到该 strategy 期望的目标 */
function isTargetReached(
  strategy: MovementStrategySuggestion,
  robot: CommandRobotState,
  controlAuthority: string,
): boolean {
  switch (strategy.action) {
    case 'stop':
      return robot.status === 'idle' || robot.status === 'emergency'
    case 'slow':
      return robot.speedKmh <= SLOW_TARGET_SPEED + 0.01
    case 'continue':
      return robot.status === 'moving' && robot.speedKmh > 0
    case 'takeover':
      return controlAuthority === 'manual'
  }
}

export function MovementStrategyCard({
  strategy,
  robot,
  controlAuthority,
  onConfirm,
  onDismiss,
  onViewAlerts,
}: {
  strategy: MovementStrategySuggestion
  /** 机器人实时状态，用于"执行中→已执行"的状态判定 */
  robot: CommandRobotState
  /** 全局控制权，用于 takeover 类指令的达成判定 */
  controlAuthority: string
  onConfirm: (strategy: MovementStrategySuggestion) => void
  onDismiss: (strategy: MovementStrategySuggestion) => void
  onViewAlerts: (strategy: MovementStrategySuggestion) => void
}) {
  const meta = actionMeta(strategy.action)
  const [phase, setPhase] = useState<ExecPhase>('pending')

  /** strategy.id 切换时把状态重置为 pending（新的建议出现意味着重新开始流程） */
  const lastStrategyIdRef = useRef(strategy.id)
  useEffect(() => {
    if (lastStrategyIdRef.current !== strategy.id) {
      lastStrategyIdRef.current = strategy.id
      setPhase('pending')
    }
  }, [strategy.id])

  /** 执行中：监听机器人状态，达到目标 → done；超时未达成 → timeout */
  useEffect(() => {
    if (phase !== 'executing') return

    if (isTargetReached(strategy, robot, controlAuthority)) {
      setPhase('done')
      return
    }

    const timer = window.setTimeout(() => {
      setPhase((current) => (current === 'executing' ? 'timeout' : current))
    }, EXEC_TIMEOUT_MS)
    return () => window.clearTimeout(timer)
  }, [phase, strategy, robot, controlAuthority])

  /** done 状态停留 1.5 秒后自动 dismiss */
  useEffect(() => {
    if (phase !== 'done') return
    const timer = window.setTimeout(() => onDismiss(strategy), DONE_LINGER_MS)
    return () => window.clearTimeout(timer)
  }, [phase, strategy, onDismiss])

  /** 执行中状态文案：根据 action 显示当前最相关的实时数值 */
  const executionStatusText = useMemo(() => {
    switch (strategy.action) {
      case 'stop':
        return `当前 ${robot.speedKmh.toFixed(1)} km/h · ${robot.status}`
      case 'slow':
        return `当前 ${robot.speedKmh.toFixed(1)} → ${SLOW_TARGET_SPEED.toFixed(1)} km/h`
      case 'continue':
        return `当前 ${robot.speedKmh.toFixed(1)} km/h · ${robot.status}`
      case 'takeover':
        return `控制权 ${controlAuthority} → manual`
    }
  }, [strategy.action, robot.speedKmh, robot.status, controlAuthority])

  return (
    <div className="absolute inset-x-0 bottom-0 z-20 rounded-b-2xl border-t border-white/10 bg-slate-950/88 px-3 py-2.5 backdrop-blur-md">
      <div className="flex items-center gap-3">
        {/* 左侧图标：随阶段变化 */}
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
          phase === 'done' ? 'border-emerald-400/35 bg-emerald-400/15 text-emerald-200'
          : phase === 'timeout' ? 'border-rose-400/35 bg-rose-500/15 text-rose-200'
          : meta.tone
        }`}>
          {phase === 'executing' ? <Loader2 className="h-4 w-4 animate-spin" />
          : phase === 'done' ? <Check className="h-4 w-4" />
          : phase === 'timeout' ? <AlertTriangle className="h-4 w-4" />
          : meta.icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-white">{strategy.title}</span>
            <span className="rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-slate-400">
              {meta.label}
            </span>
            {/* 阶段徽章：仅在非 pending 时显示 */}
            {phase === 'executing' && (
              <span className="rounded-md border border-cyan-400/30 bg-cyan-400/10 px-1.5 py-0.5 text-[10px] text-cyan-200">
                执行中
              </span>
            )}
            {phase === 'done' && (
              <span className="rounded-md border border-emerald-400/30 bg-emerald-400/10 px-1.5 py-0.5 text-[10px] text-emerald-200">
                已执行
              </span>
            )}
            {phase === 'timeout' && (
              <span className="rounded-md border border-rose-400/30 bg-rose-500/10 px-1.5 py-0.5 text-[10px] text-rose-200">
                执行超时
              </span>
            )}
            {phase === 'pending' && strategy.sourceAlertIds.length > 0 && (
              <span className="truncate text-[10px] text-slate-500">
                来源 {strategy.sourceAlertIds.join('、')}
              </span>
            )}
          </div>
          <div className="mt-1 truncate text-[11px] text-slate-400">
            {phase === 'executing' ? executionStatusText
            : phase === 'done' ? '机器人已进入目标状态'
            : phase === 'timeout' ? `等待 ${EXEC_TIMEOUT_MS / 1000}s 仍未达到目标状态，建议人工确认设备情况`
            : strategy.reason}
          </div>
        </div>

        {/* 右侧按钮：按 phase 切换 */}
        {phase === 'pending' && (
          <>
            <button
              onClick={() => {
                onConfirm(strategy)
                setPhase('executing')
              }}
              className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-emerald-400/30 bg-emerald-400/12 px-3 text-[11px] font-semibold text-emerald-200 transition hover:bg-emerald-400/20 active:scale-[0.97]"
            >
              <Check className="h-3 w-3" />
              确认执行
            </button>
            <button
              onClick={() => onViewAlerts(strategy)}
              className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-cyan-400/20 bg-cyan-400/8 px-3 text-[11px] text-cyan-200 transition hover:bg-cyan-400/15 active:scale-[0.97]"
            >
              <Eye className="h-3 w-3" />
              查看告警
            </button>
            <button
              onClick={() => onDismiss(strategy)}
              className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-white/10 bg-white/[0.05] px-3 text-[11px] text-slate-300 transition hover:bg-white/[0.08] active:scale-[0.97]"
            >
              <X className="h-3 w-3" />
              忽略
            </button>
          </>
        )}

        {/* executing：仅展示一个不可点击的进度提示，避免操作员重复确认 */}
        {phase === 'executing' && (
          <div className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-cyan-400/25 bg-cyan-400/10 px-3 text-[11px] text-cyan-200">
            <Loader2 className="h-3 w-3 animate-spin" />
            等待机器人响应
          </div>
        )}

        {/* done：单一只读徽章，组件即将自动消失 */}
        {phase === 'done' && (
          <div className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-emerald-400/35 bg-emerald-400/15 px-3 text-[11px] font-semibold text-emerald-200">
            <Check className="h-3 w-3" />
            已生效
          </div>
        )}

        {/* timeout：让操作员手动关闭，不自动消失 */}
        {phase === 'timeout' && (
          <button
            onClick={() => onDismiss(strategy)}
            className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-rose-400/35 bg-rose-500/12 px-3 text-[11px] font-semibold text-rose-200 transition hover:bg-rose-500/20 active:scale-[0.97]"
          >
            <X className="h-3 w-3" />
            关闭
          </button>
        )}
      </div>
    </div>
  )
}
