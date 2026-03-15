import { useEffect } from 'react'
import { createRealtimeAlert } from '@/mocks/data/dashboardHome'
import type { ActiveTask, HomeOverviewResponse, RealtimeMessage } from '@/types/dashboard'

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min
}

function deriveProgress(task: Pick<ActiveTask, 'checksCompleted' | 'checksTotal' | 'progressPct'>) {
  if (task.checksTotal <= 0) return Math.max(0, Math.min(100, task.progressPct))
  return Math.round((task.checksCompleted / task.checksTotal) * 100)
}

export function applyRealtime(data: HomeOverviewResponse, message: RealtimeMessage): HomeOverviewResponse {
  switch (message.type) {
    case 'TASK_PROGRESS':
      return data.activeTask
        ? {
            ...data,
            meta: { ...data.meta, updatedAt: new Date().toISOString() },
            activeTask: {
              ...data.activeTask,
              ...message.payload,
              progressPct: deriveProgress({
                ...data.activeTask,
                ...message.payload,
              }),
            },
          }
        : data
    case 'ROBOT_PULSE':
      return {
        ...data,
        meta: { ...data.meta, updatedAt: new Date().toISOString() },
        robots: data.robots.map((robot) =>
          robot.id === message.payload.id ? { ...robot, ...message.payload } : robot,
        ),
      }
    case 'ALERT_NEW':
      return {
        ...data,
        meta: { ...data.meta, updatedAt: new Date().toISOString() },
        alerts: [message.payload, ...data.alerts].slice(0, 5),
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
  useEffect(() => {
    if (!data) return

    const timer = window.setInterval(() => {
      const random = Math.random()

      if (random < 0.28 && data.activeTask) {
        const nextChecksCompleted = Math.min(
          data.activeTask.checksTotal,
          data.activeTask.checksCompleted + 1,
        )
        const nextProgressPct = deriveProgress({
          ...data.activeTask,
          checksCompleted: nextChecksCompleted,
        })
        const isCompleted = nextChecksCompleted >= data.activeTask.checksTotal

        onMessage({
          type: 'TASK_PROGRESS',
          payload: {
            checksCompleted: nextChecksCompleted,
            progressPct: nextProgressPct,
            etaMinutes: isCompleted ? 0 : Math.max(1, data.activeTask.etaMinutes - 2),
            status: isCompleted ? 'completed' : 'running',
          },
        })
        return
      }

      if (random < 0.62) {
        const robot = data.robots[Math.floor(Math.random() * data.robots.length)]
        onMessage({
          type: 'ROBOT_PULSE',
          payload: {
            id: robot.id,
            batteryPct: Number(Math.max(16, robot.batteryPct - rand(0.2, 0.8)).toFixed(1)),
            signalRssi: Math.round(robot.signalRssi + rand(-2, 2)),
            temperatureC: Number((robot.temperatureC + rand(-0.6, 0.8)).toFixed(1)),
          },
        })
        return
      }

      if (random < 0.82) {
        const source = data.trends[Math.floor(Math.random() * data.trends.length)]
        onMessage({
          type: 'TREND_APPEND',
          payload: {
            id: source.id,
            point: {
              time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
              value: Number(((source.points.at(-1)?.value ?? 60) + rand(-2.2, 2.8)).toFixed(1)),
            },
          },
        })
        return
      }

      onMessage({ type: 'ALERT_NEW', payload: createRealtimeAlert() })
    }, 5500)

    return () => {
      window.clearInterval(timer)
    }
  }, [data, onMessage])
}