import { useEffect, useRef } from 'react'
import { createRealtimeAlert } from '@/mocks/data/dashboardHome'
import type { HomeOverviewResponse, RealtimeMessage } from '@/types/dashboard'

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min
}

export function applyRealtime(
  data: HomeOverviewResponse,
  message: RealtimeMessage,
): HomeOverviewResponse {
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

    case 'ALERT_NEW': {
      const nextAlerts = [message.payload, ...data.alerts]
        .sort(
          (a, b) =>
            new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
        )
        .slice(0, 10)

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
        onMessage({
          type: 'TASK_PROGRESS',
          payload: {
            progressPct: Math.min(
              100,
              current.activeTask.progressPct + Math.round(rand(1, 4)),
            ),
            etaMinutes: Math.max(0, current.activeTask.etaMinutes - 1),
            status: 'running',
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
            time: new Date().toLocaleTimeString('zh-CN', {
              hour: '2-digit',
              minute: '2-digit',
            }),
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