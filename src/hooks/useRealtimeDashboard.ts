import { useEffect, useRef } from 'react'
import { createRealtimeAlert } from '@/mocks/data/dashboardHome'
import type { ActiveTask, HomeOverviewResponse, RealtimeMessage } from '@/types/dashboard'

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min
}

function deriveTaskProgress(checksCompleted: number, checksTotal: number) {
  if (checksTotal <= 0) return 0
  return Math.round((checksCompleted / checksTotal) * 100)
}

function getNextTrendTime(lastTime?: string) {
  const now = new Date()
  now.setSeconds(0, 0)

  if (!lastTime) return now.toISOString()

  const last = new Date(lastTime)
  if (Number.isNaN(last.getTime())) return now.toISOString()

  if (now.getTime() > last.getTime()) return now.toISOString()

  const next = new Date(last)
  next.setMinutes(next.getMinutes() + 1)
  return next.toISOString()
}

export function applyRealtime(
  data: HomeOverviewResponse,
  message: RealtimeMessage,
): HomeOverviewResponse {
  switch (message.type) {
    case 'TASK_PROGRESS':
      if (!data.activeTask) return data
      if (data.activeTask.status === 'paused') return data
      return {
        ...data,
        meta: { ...data.meta, updatedAt: new Date().toISOString() },
        activeTask: { ...data.activeTask, ...message.payload },
      }

    case 'ROBOT_PULSE':
      return {
        ...data,
        meta: { ...data.meta, updatedAt: new Date().toISOString() },
        robots: data.robots.map((robot) =>
          robot.id === message.payload.id ? { ...robot, ...message.payload } : robot,
        ),
      }

    case 'ALERT_NEW': {
      const nextAlerts = [message.payload, ...data.alerts]
        .sort(
          (a, b) =>
            new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
        )
        .slice(0, 10)

      // TTS 播报已移至 DashboardContext 的 handleMessage 中，
      // 由重复告警抑制逻辑统一管控，此处不再调用 announceAlert。

      return {
        ...data,
        meta: { ...data.meta, updatedAt: new Date().toISOString() },
        alerts: nextAlerts,
      }
    }

    case 'TREND_APPEND':
      return {
        ...data,
        meta: { ...data.meta, updatedAt: new Date().toISOString() },
        trends: data.trends.map((trend) =>
          trend.id === message.payload.id
            ? { ...trend, points: [...trend.points.slice(-11), message.payload.point] }
            : trend,
        ),
      }

    default:
      return data
  }
}

export function useRealtimeDashboard(
  data: HomeOverviewResponse | null,
  onMessage: (message: RealtimeMessage) => void,
) {
  const dataRef = useRef<HomeOverviewResponse | null>(data)

  useEffect(() => {
    dataRef.current = data
  }, [data])

  useEffect(() => {
    if (!dataRef.current) return

    const liveTimer = window.setInterval(() => {
      const current = dataRef.current
      if (!current) return

      const random = Math.random()

      if (random < 0.34 && current.activeTask) {
        const task = current.activeTask

        if (task.status === 'paused') return

        const nextChecksCompleted = Math.min(
          task.checksTotal,
          task.checksCompleted + 1,
        )
        const nextProgressPct = nextChecksCompleted >= task.checksTotal
          ? 100
          : deriveTaskProgress(nextChecksCompleted, task.checksTotal)
        const nextStatus: ActiveTask['status'] = nextChecksCompleted >= task.checksTotal
          ? 'completed'
          : 'running'
        const nextEtaMinutes = nextStatus === 'completed'
          ? 0
          : Math.max(0, task.etaMinutes - 1)

        onMessage({
          type: 'TASK_PROGRESS',
          payload: {
            checksCompleted: nextChecksCompleted,
            progressPct: nextProgressPct,
            etaMinutes: nextEtaMinutes,
            status: nextStatus,
          },
        })
        return
      }

      if (random < 0.72) {
        const robot =
          current.robots[Math.floor(Math.random() * current.robots.length)]

        onMessage({
          type: 'ROBOT_PULSE',
          payload: {
            id: robot.id,
            batteryPct: Math.max(
              16,
              robot.batteryPct - Number(rand(0.2, 0.8).toFixed(1)),
            ),
            signalRssi: Math.round(robot.signalRssi + rand(-2, 2)),
            temperatureC: Number(
              (robot.temperatureC + rand(-0.6, 0.8)).toFixed(1),
            ),
          },
        })
        return
      }

      const source =
        current.trends[Math.floor(Math.random() * current.trends.length)]

      onMessage({
        type: 'TREND_APPEND',
        payload: {
          id: source.id,
          point: {
            time: getNextTrendTime(source.points.at(-1)?.time),
            value: Number(
              ((source.points.at(-1)?.value ?? 60) + rand(-2.2, 2.8)).toFixed(1),
            ),
          },
        },
      })
    }, 5500)

    const alertTimer = window.setInterval(() => {
      onMessage({
        type: 'ALERT_NEW',
        payload: createRealtimeAlert(),
      })
    }, 10_000)

    return () => {
      window.clearInterval(liveTimer)
      window.clearInterval(alertTimer)
    }
  }, [onMessage, Boolean(data)])
}
