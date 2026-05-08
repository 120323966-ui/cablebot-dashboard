import { createContext } from 'react'
import type { AlertItem, HomeOverviewResponse, Severity } from '@/types/dashboard'
import type { SegmentAlertHistory } from '@/types/alerts'
import type { RobotControlCommand } from '@/types/command'
import type { RobotSnapshot } from '@/mocks/data/sharedSeed'

export type ControlAuthority = 'auto' | 'semi-auto' | 'manual' | 'emergency'

/** 自动急停事件：系统因监测值越过紧急阈值自动下发急停后，
 *  通过 context 暴露给 UI 层显示提示横幅与"恢复"按钮。 */
export interface AutoEstopEvent {
  /** 事件唯一标识，用于去重显示 */
  id: string
  /** 触发该急停的告警 id */
  alertId: string
  /** 触发告警的标题（用于横幅文案） */
  alertTitle: string
  /** 触发告警的证据片段（如"接头 96.4°C"） */
  alertEvidence?: string
  /** 触发告警所在区段 id */
  segmentId: string
  /** 被急停的机器人 id */
  robotId: string
  /** 触发时间戳（ISO） */
  triggeredAt: string
}

export interface DashboardContextValue {
  /** 合并了初始数据和实时更新的最新数据 */
  data: HomeOverviewResponse | null
  loading: boolean
  error: string | null
  /** 用于语音指令等外部操作直接修改数据 */
  updateData: (updater: (current: HomeOverviewResponse) => HomeOverviewResponse) => void

  /** 全量告警列表（首页、告警处置页、Command 页共享） */
  alerts: AlertItem[]
  /** 告警处置页额外数据：区段历史统计 */
  alertHistory: SegmentAlertHistory[]
  /** 告警处置页额外数据：区段 ID 列表（筛选下拉用） */
  alertSegments: string[]
  /** 修改单条告警状态（确认/关闭），全页面同步 */
  updateAlertStatus: (alertId: string, status: AlertItem['status']) => void

  /** 最新一条待弹出的告警（仅 critical/warning），null 表示无通知 */
  latestNewAlert: AlertItem | null
  /** 关闭当前通知 */
  dismissLatestAlert: () => void

  /** 全局控制权状态：供顶栏和跨页面状态展示 */
  controlAuthority: ControlAuthority
  setControlAuthority: (value: ControlAuthority) => void

  /** 全局机器人运动模型快照 */
  robots: RobotSnapshot[]
  /** 下发机器人控制指令并模拟执行回传 */
  dispatchCommand: (command: RobotControlCommand, robotId: string) => void

  /** 最近一次自动急停事件，null 表示当前无未确认的自动急停 */
  autoEstopEvent: AutoEstopEvent | null
  /** 操作员确认/恢复后清除事件，让横幅消失 */
  clearAutoEstopEvent: () => void
}

/** 严重程度权重，用于判断"升级"场景 */
export const SEVERITY_WEIGHT: Record<Severity, number> = {
  info: 0,
  warning: 1,
  critical: 2,
}

export const DashboardContext = createContext<DashboardContextValue | null>(null)
