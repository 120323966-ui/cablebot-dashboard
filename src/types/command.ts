import type { Severity, Tone } from './dashboard'

export type CommandMode = 'auto' | 'semi-auto' | 'manual'
export type MissionStatus = 'running' | 'paused' | 'attention'
export type SensorStatus = 'normal' | 'watch' | 'danger'
export type SensorTrend = 'up' | 'down' | 'steady'
export type AuxViewStatus = 'live' | 'queued' | 'standby'
export type EventStatus = 'new' | 'acknowledged' | 'processing'
export type OnlineState = 'online' | 'warning'
export type NetworkQuality = 'excellent' | 'good' | 'unstable'

export interface CommandMeta {
  stationName: string
  updatedAt: string
  operatorName: string
  shift: string
  weatherNote: string
  network: {
    status: 'ok' | 'degraded'
    latencyMs: number
  }
}

export interface CommandMission {
  id: string
  title: string
  segmentId: string
  tunnelSection: string
  mode: CommandMode
  status: MissionStatus
  progressPct: number
  elapsedMinutes: number
  etaMinutes: number
  checklistDone: number
  checklistTotal: number
}

export interface CommandRobotState {
  id: string
  name: string
  onlineState: OnlineState
  location: string
  batteryPct: number
  speedKmh: number
  headingDeg: number
  pitchDeg: number
  rollDeg: number
  networkQuality: NetworkQuality
  cameraTempC: number
}

export interface VideoTarget {
  id: string
  label: string
  severity: Severity
  detail: string
  top: string
  left: string
  width: string
  height: string
  /** Fault anchor point (% of video area) for leader line */
  faultX?: string
  faultY?: string
}

export interface PrimaryVideoFeed {
  cameraLabel: string
  resolution: string
  fps: number
  latencyMs: number
  timestamp: string
  location: string
  ptz: {
    pan: number
    tilt: number
    zoom: number
  }
  targets: VideoTarget[]
}

export interface AuxView {
  id: string
  title: string
  subtitle: string
  status: AuxViewStatus
  tone: Tone
}

export interface SensorMetric {
  id: string
  label: string
  value: number
  unit: string
  status: SensorStatus
  trend: SensorTrend
  hint: string
}

export interface CommandEvent {
  id: string
  title: string
  severity: Severity
  status: EventStatus
  source: string
  segmentId: string
  occurredAt: string
  detail: string
}

export interface VoicePanelState {
  listening: boolean
  transcript: string
  hotwords: string[]
  suggested: string[]
}

export interface ControlState {
  driveMode: CommandMode
  speedLevel: 1 | 2 | 3
  lightOn: boolean
  stabilizationOn: boolean
  recording: boolean
}

export interface CommandCenterResponse {
  meta: CommandMeta
  mission: CommandMission
  robot: CommandRobotState
  primaryVideo: PrimaryVideoFeed
  auxViews: AuxView[]
  sensors: SensorMetric[]
  events: CommandEvent[]
  voice: VoicePanelState
  control: ControlState
}

export type CommandRealtimeMessage =
  | {
      type: 'MISSION_PATCH'
      payload: Partial<Pick<CommandMission, 'progressPct' | 'etaMinutes' | 'elapsedMinutes' | 'status'>>
    }
  | {
      type: 'ROBOT_PULSE'
      payload: Partial<
        Pick<
          CommandRobotState,
          'batteryPct' | 'speedKmh' | 'headingDeg' | 'pitchDeg' | 'rollDeg' | 'cameraTempC' | 'networkQuality'
        >
      >
    }
  | {
      type: 'VIDEO_PULSE'
      payload: Pick<PrimaryVideoFeed, 'fps' | 'latencyMs' | 'timestamp'>
    }
  | {
      type: 'SENSOR_PATCH'
      payload: {
        id: string
        value: number
        status: SensorStatus
        trend: SensorTrend
        hint: string
      }
    }
  | {
      type: 'EVENT_NEW'
      payload: CommandEvent
    }
  | {
      type: 'VOICE_UPDATE'
      payload: Pick<VoicePanelState, 'listening' | 'transcript'>
    }
