import { useEffect, useRef } from 'react'
import {
  createRealtimeSensorPatch,
  createRealtimeVoiceSample,
} from '@/mocks/data/commandCenter'
import type {
  CommandCenterResponse,
  CommandEvent,
  CommandRealtimeMessage,
  SensorMetric,
} from '@/types/command'

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min
}

function sortEvents(events: CommandEvent[]) {
  return [...events].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  )
}

export function applyCommandRealtime(
  data: CommandCenterResponse,
  message: CommandRealtimeMessage,
): CommandCenterResponse {
  switch (message.type) {
    case 'MISSION_PATCH':
      // ── 暂停时忽略进度更新 ──
      if (data.mission.status === 'paused' || data.mission.status === 'attention') {
        return data
      }
      return {
        ...data,
        meta: { ...data.meta, updatedAt: new Date().toISOString() },
        mission: { ...data.mission, ...message.payload },
      }

    case 'ROBOT_PULSE':
      return {
        ...data,
        meta: { ...data.meta, updatedAt: new Date().toISOString() },
        robot: { ...data.robot, ...message.payload },
      }

    case 'VIDEO_PULSE':
      return {
        ...data,
        meta: { ...data.meta, updatedAt: new Date().toISOString() },
        primaryVideo: { ...data.primaryVideo, ...message.payload },
      }

    case 'SENSOR_PATCH':
      return {
        ...data,
        meta: { ...data.meta, updatedAt: new Date().toISOString() },
        sensors: data.sensors.map((sensor) =>
          sensor.id === message.payload.id
            ? {
                ...sensor,
                value: message.payload.value,
                status: message.payload.status,
                trend: message.payload.trend,
                hint: message.payload.hint,
              }
            : sensor,
        ),
      }

    case 'EVENT_NEW':
      return {
        ...data,
        meta: { ...data.meta, updatedAt: new Date().toISOString() },
        events: sortEvents([message.payload, ...data.events]).slice(0, 8),
      }

    case 'VOICE_UPDATE':
      return {
        ...data,
        meta: { ...data.meta, updatedAt: new Date().toISOString() },
        voice: { ...data.voice, ...message.payload },
      }

    default:
      return data
  }
}

export function useRealtimeCommandCenter(
  data: CommandCenterResponse | null,
  onMessage: (message: CommandRealtimeMessage) => void,
) {
  const dataRef = useRef<CommandCenterResponse | null>(data)
  const hasData = Boolean(data)

  useEffect(() => {
    dataRef.current = data
  }, [data])

  useEffect(() => {
    if (!dataRef.current) return

    const pulseTimer = window.setInterval(() => {
      const current = dataRef.current
      if (!current) return

      // ── 暂停/急停时跳过进度推送 ──
      if (current.mission.status !== 'paused' && current.mission.status !== 'attention') {
        const nextProgress = Math.min(100, current.mission.progressPct + Math.round(rand(1, 3)))
        const nextEta = Math.max(0, current.mission.etaMinutes - 1)

        onMessage({
          type: 'MISSION_PATCH',
          payload: {
            progressPct: nextProgress,
            elapsedMinutes: current.mission.elapsedMinutes + 1,
            etaMinutes: nextEta,
            status: nextProgress >= 100 ? 'attention' : 'running',
          },
        })
      }

      onMessage({
        type: 'ROBOT_PULSE',
        payload: {
          batteryPct: Math.max(18, Number((current.robot.batteryPct - rand(0.2, 0.6)).toFixed(1))),
          speedKmh: Number((Math.max(0.5, 0.8 + rand(0, 0.6))).toFixed(1)),
          headingDeg: Math.round(current.robot.headingDeg + rand(-4, 4)),
          pitchDeg: Number((Math.max(0.8, current.robot.pitchDeg + rand(-0.8, 1.2))).toFixed(1)),
          rollDeg: Number((Math.max(0.5, current.robot.rollDeg + rand(-0.6, 0.8))).toFixed(1)),
          cameraTempC: Number((current.robot.cameraTempC + rand(-0.4, 0.7)).toFixed(1)),
          networkQuality:
            current.primaryVideo.latencyMs > 220
              ? 'unstable'
              : current.primaryVideo.latencyMs > 160
                ? 'good'
                : 'excellent',
        },
      })

      onMessage({
        type: 'VIDEO_PULSE',
        payload: {
          fps: Math.max(18, Math.min(28, Math.round(current.primaryVideo.fps + rand(-2, 2)))),
          latencyMs: Math.max(120, Math.round(current.primaryVideo.latencyMs + rand(-12, 18))),
          timestamp: new Date().toISOString(),
        },
      })

      const pickedSensor: SensorMetric =
        current.sensors[Math.floor(Math.random() * current.sensors.length)]

      const patch = createRealtimeSensorPatch(pickedSensor)

      onMessage({
        type: 'SENSOR_PATCH',
        payload: {
          id: pickedSensor.id,
          value: patch.value,
          status: patch.status,
          trend: patch.trend,
          hint: patch.hint,
        },
      })
    }, 5000)

    // EVENT_NEW 定时器已移除 — 告警事件现在由 DashboardContext 全局管理，
    // Command 页从 context.alerts 派生事件流，不再独立生成。

    const voiceTimer = window.setInterval(() => {
      onMessage({
        type: 'VOICE_UPDATE',
        payload: {
          listening: true,
          transcript: '识别中...',
        },
      })

      window.setTimeout(() => {
        onMessage({
          type: 'VOICE_UPDATE',
          payload: {
            listening: false,
            transcript: createRealtimeVoiceSample(),
          },
        })
      }, 1400)
    }, 16000)

    return () => {
      window.clearInterval(pulseTimer)
      window.clearInterval(voiceTimer)
    }
  }, [onMessage, hasData])
}
