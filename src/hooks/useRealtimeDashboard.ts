import { useEffect } from 'react'
import { createRealtimeAlert } from '@/mocks/data/dashboardHome'
import type { HomeOverviewResponse, RealtimeMessage } from '@/types/dashboard'

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min
}

export function applyRealtime(data: HomeOverviewResponse, message: RealtimeMessage): HomeOverviewResponse {
  switch (message.type) {
    case 'TASK_PROGRESS':
      return data.activeTask
        ? {
            ...data,
            meta: { ...data.meta, updatedAt: new Date().toISOString() },
            activeTask: { ...data.activeTask, ...message.payload },
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
        onMessage({
          type: 'TASK_PROGRESS',
          payload: {
            progressPct: Math.min(100, data.activeTask.progressPct + Math.round(rand(1, 4))),
            etaMinutes: Math.max(0, data.activeTask.etaMinutes - 1),
            status: 'running',
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
            batteryPct: Math.max(16, robot.batteryPct - Number(rand(0.2, 0.8).toFixed(1))),
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
              value: Number((source.points.at(-1)?.value ?? 60 + rand(-2.2, 2.8)).toFixed(1)),
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
