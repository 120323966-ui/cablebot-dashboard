import type { AlertItem } from '@/types/dashboard'
import type { CommandMission, MovementStrategySuggestion } from '@/types/command'

const PIPE_GROUPS = [
  ['A1', 'A2'],
  ['B1', 'B2', 'B3'],
  ['C1', 'C2', 'C3'],
]

function nextSegment(segmentId: string) {
  const group = PIPE_GROUPS.find((items) => items.includes(segmentId))
  if (!group) return null
  const index = group.indexOf(segmentId)
  return index >= 0 && index < group.length - 1 ? group[index + 1] : null
}

function alertTypeLabel(alert: AlertItem) {
  return alert.type ?? alert.title
}

function buildId(action: MovementStrategySuggestion['action'], mission: CommandMission, alertIds: string[]) {
  return [
    action,
    mission.segmentId,
    alertIds.join('-') || 'clear',
  ].join('::')
}

export function deriveMovementStrategy(
  mission: CommandMission,
  alerts: AlertItem[],
): MovementStrategySuggestion | null {
  if (mission.status === 'attention' || mission.status === 'paused' || mission.status === 'queued') {
    return null
  }

  const openAlerts = alerts.filter((alert) => alert.status !== 'closed')
  const currentAlerts = openAlerts.filter((alert) => alert.segmentId === mission.segmentId)
  const frontSegment = nextSegment(mission.segmentId)
  const frontAlerts = frontSegment
    ? openAlerts.filter((alert) => alert.segmentId === frontSegment)
    : []

  const currentCritical = currentAlerts.filter((alert) => alert.status === 'new' && alert.severity === 'critical')
  if (currentCritical.length > 0) {
    const alertIds = currentCritical.map((alert) => alert.id)
    const first = currentCritical[0]
    return {
      id: buildId('stop', mission, alertIds),
      action: 'stop',
      severity: 'critical',
      title: '建议停止行进',
      reason: `机器人当前位于 ${mission.segmentId} 区段，该区段存在 ${currentCritical.length} 条未处置 critical ${alertTypeLabel(first)}，建议停止行进并等待人工确认。`,
      segmentId: mission.segmentId,
      sourceAlertIds: alertIds,
      createdAt: new Date().toISOString(),
    }
  }

  const currentWarnings = currentAlerts.filter((alert) => alert.status === 'new' && alert.severity === 'warning')
  if (currentWarnings.length > 0) {
    const alertIds = currentWarnings.map((alert) => alert.id)
    const first = currentWarnings[0]
    return {
      id: buildId('slow', mission, alertIds),
      action: 'slow',
      severity: 'warning',
      title: '建议减速通过',
      reason: `机器人当前位于 ${mission.segmentId} 区段，该区段存在 ${currentWarnings.length} 条未处置 warning ${alertTypeLabel(first)}，建议降速并持续观察。`,
      segmentId: mission.segmentId,
      sourceAlertIds: alertIds,
      createdAt: new Date().toISOString(),
    }
  }

  const frontCritical = frontAlerts.filter((alert) => alert.status === 'new' && alert.severity === 'critical')
  if (frontCritical.length > 0 && frontSegment) {
    const alertIds = frontCritical.map((alert) => alert.id)
    return {
      id: buildId('slow', mission, alertIds),
      action: 'slow',
      severity: 'warning',
      title: '建议提前减速',
      reason: `前方 ${frontSegment} 区段存在 ${frontCritical.length} 条未处置 critical 告警，建议提前减速并准备停止。`,
      segmentId: frontSegment,
      sourceAlertIds: alertIds,
      createdAt: new Date().toISOString(),
    }
  }

  const frontWarnings = frontAlerts.filter((alert) => alert.status === 'new' && alert.severity === 'warning')
  if (frontWarnings.length > 0 && frontSegment) {
    const alertIds = frontWarnings.map((alert) => alert.id)
    return {
      id: buildId('slow', mission, alertIds),
      action: 'slow',
      severity: 'warning',
      title: '建议低速观察',
      reason: `前方 ${frontSegment} 区段存在 ${frontWarnings.length} 条未处置 warning 告警，建议保持低速并关注视频画面。`,
      segmentId: frontSegment,
      sourceAlertIds: alertIds,
      createdAt: new Date().toISOString(),
    }
  }

  return null
}
