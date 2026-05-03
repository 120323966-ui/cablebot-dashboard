/* ═══════════════════════════════════════════════════
   Command Center Mock — derives from sharedSeed
   Supports robotId parameter for switching robots.
   ═══════════════════════════════════════════════════ */

import type {
  CommandCenterResponse,
  CommandEvent,
  NetworkQuality,
  SensorMetric,
  SensorStatus,
  SensorTrend,
} from '@/types/command'
import { SEGMENT_LABELS, SEGMENT_ENV } from './constants'
import {
  getActiveAlerts, getRobots,
  createRealtimeCommandEvent as sharedCommandEvent,
} from './sharedSeed'

/* ── Sensor patch (realtime updates) ── */

function randomSensorPatch(sensor: SensorMetric): Pick<SensorMetric, 'value' | 'status' | 'trend' | 'hint'> {
  const nextValue = Number((sensor.value + (Math.random() * 2.8 - 1.2)).toFixed(1))
  let status: SensorStatus = sensor.status
  let trend: SensorTrend = 'steady'
  let hint = sensor.hint

  if (sensor.id === 'temp') {
    if (nextValue >= 68) { status = 'danger'; trend = 'up'; hint = '热像窗口建议复核' }
    else if (nextValue >= 63) { status = 'watch'; trend = 'up'; hint = '温升持续，建议减速观察' }
    else { status = 'normal'; trend = nextValue >= sensor.value ? 'up' : 'steady'; hint = '温度处于可控区间' }
  }
  if (sensor.id === 'humidity') {
    if (nextValue >= 83) { status = 'danger'; trend = 'up'; hint = '疑似渗漏增强' }
    else if (nextValue >= 76) { status = 'watch'; trend = 'up'; hint = '湿度抬升，建议联动热像' }
    else { status = 'normal'; trend = nextValue >= sensor.value ? 'up' : 'down'; hint = '湿度维持稳定' }
  }
  if (sensor.id === 'gas') {
    if (nextValue >= 18) { status = 'danger'; trend = 'up'; hint = '气体波动超预期' }
    else if (nextValue >= 12) { status = 'watch'; trend = 'up'; hint = '建议保持通风监测' }
    else { status = 'normal'; trend = nextValue >= sensor.value ? 'up' : 'steady'; hint = '气体浓度正常' }
  }
  if (sensor.id === 'tilt') {
    if (nextValue >= 8) { status = 'danger'; trend = 'up'; hint = '姿态超限，建议人工接管' }
    else if (nextValue >= 5) { status = 'watch'; trend = 'up'; hint = '路面扰动增强' }
    else { status = 'normal'; trend = nextValue >= sensor.value ? 'up' : 'down'; hint = '姿态保持平稳' }
  }
  if (sensor.id === 'water') {
    if (nextValue >= 70) { status = 'danger'; trend = 'up'; hint = '积水风险升高' }
    else if (nextValue >= 48) { status = 'watch'; trend = 'up'; hint = '建议切换低速巡检' }
    else { status = 'normal'; trend = nextValue >= sensor.value ? 'up' : 'steady'; hint = '水浸风险可控' }
  }

  return { value: nextValue, status, trend, hint }
}

/* ── Segment-specific sensor profiles ── */

function buildSensors(segmentId: string): SensorMetric[] {
  const env = SEGMENT_ENV[segmentId] ?? { temperatureC: 30, humidityPct: 65 }
  const isHighRisk = env.temperatureC > 55

  return [
    {
      id: 'temp', label: '管道温度', value: env.temperatureC, unit: '°C',
      status: env.temperatureC >= 65 ? 'danger' : env.temperatureC >= 50 ? 'watch' : 'normal',
      trend: isHighRisk ? 'up' : 'steady',
      hint: env.temperatureC >= 65 ? '热像窗口建议复核' : '温度处于可控区间',
    },
    {
      id: 'humidity', label: '环境湿度', value: env.humidityPct, unit: '%',
      status: env.humidityPct >= 83 ? 'danger' : env.humidityPct >= 76 ? 'watch' : 'normal',
      trend: env.humidityPct >= 76 ? 'up' : 'steady',
      hint: env.humidityPct >= 83 ? '疑似渗漏增强' : env.humidityPct >= 76 ? '湿度抬升，建议联动热像' : '湿度维持稳定',
    },
    {
      id: 'gas', label: 'CH₄ 浓度', value: segmentId === 'C1' ? 12.1 : 8.4, unit: 'ppm',
      status: segmentId === 'C1' ? 'watch' : 'normal',
      trend: 'steady',
      hint: segmentId === 'C1' ? '建议保持通风监测' : '气体浓度正常',
    },
    {
      id: 'tilt', label: '姿态倾角', value: 3.1, unit: '°',
      status: 'normal', trend: 'steady', hint: '姿态保持平稳',
    },
    {
      id: 'water', label: '积水指数', value: segmentId === 'A2' ? 58 : segmentId === 'C2' ? 52.6 : 22, unit: '%',
      status: segmentId === 'A2' || segmentId === 'C2' ? 'watch' : 'normal',
      trend: segmentId === 'A2' || segmentId === 'C2' ? 'up' : 'steady',
      hint: segmentId === 'A2' || segmentId === 'C2' ? '建议切换低速巡检' : '水浸风险可控',
    },
  ]
}

/* ── Build events from shared active alerts for this segment ── */

function buildEvents(segmentId: string): CommandEvent[] {
  const alerts = getActiveAlerts()
    .filter((a) => a.segmentId === segmentId)
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())

  return alerts.slice(0, 4).map((a, i) => ({
    id: `EV-${a.id.replace('AL-', '')}`,
    title: a.title,
    severity: a.severity,
    status: i === 0 ? 'new' : i === 1 ? 'processing' : 'acknowledged',
    source: a.type === '热像异常' ? '热成像联动' : a.type === '湿度/渗漏' ? '视觉识别' : '环境传感',
    segmentId: a.segmentId,
    occurredAt: a.occurredAt,
    detail: a.value,
  }))
}

/* ── Video targets from alerts ── */

/** Per-segment detection box layout presets */
const TARGET_LAYOUTS: Record<string, Array<{
  top: string; left: string; width: string; height: string; faultX: string; faultY: string
}>> = {
  B3: [
    { top: '30%', left: '62%', width: '20%', height: '14%', faultX: '91%', faultY: '46%' },
    { top: '50%', left: '20%', width: '20%', height: '14%', faultX: '7%',  faultY: '68%' },
  ],
  C2: [
    { top: '18%', left: '18%', width: '20%', height: '14%', faultX: '7%',  faultY: '42%' },
    { top: '48%', left: '58%', width: '20%', height: '14%', faultX: '92%', faultY: '72%' },
  ],
}
const DEFAULT_LAYOUT = [
  { top: '22%', left: '50%', width: '20%', height: '14%', faultX: '85%', faultY: '45%' },
  { top: '50%', left: '20%', width: '20%', height: '14%', faultX: '10%', faultY: '65%' },
]

function buildTargets(segmentId: string) {
  const alerts = getActiveAlerts()
    .filter((a) => a.segmentId === segmentId && a.severity !== 'info')
    .slice(0, 2)

  const layouts = TARGET_LAYOUTS[segmentId] ?? DEFAULT_LAYOUT

  return alerts.map((a, i) => ({
    id: `T-${String(i + 1).padStart(2, '0')}`,
    label: a.title.replace(/^[A-C]\d\s段/, '').trim(),
    severity: a.severity,
    detail: `${a.evidence}，建议复核`,
    ...layouts[i] ?? layouts[0],
  }))
}

/* ═══════════════════════════════════════════════════
   Public API
   ═══════════════════════════════════════════════════ */

const voiceSamples = ['停止前进', '切换热成像', '标记当前异常', '聚焦前方高温点']

function networkQualityFromRssi(signalRssi: number): NetworkQuality {
  if (signalRssi > -60) return 'good'
  if (signalRssi > -70) return 'good'
  return 'unstable'
}

export function createCommandCenterMock(robotId = 'R1'): CommandCenterResponse {
  const robots = getRobots()
  const robot = robots.find((r) => r.id === robotId) ?? robots[0]
  const seg = robot.segmentId
  const segLabel = SEGMENT_LABELS[seg] ?? seg

  const missionTitle = robot.status === 'idle'
    ? `${robot.name} 待命中`
    : `${seg} 区段实时巡检任务`

  const progressPct = robot.status === 'idle' ? 0 : Math.round(robot.progress * 100)

  return {
    meta: {
      stationName: '地下电缆排管 · 实时巡检指挥',
      updatedAt: new Date().toISOString(),
      operatorName: '值班员 · Cris',
      shift: '白班',
      weatherNote: '降雨后巡检，重点关注湿度与积水风险',
      network: { status: 'ok', latencyMs: 42 },
    },
    mission: {
      id: `CMD-2026-0316-${robotId}`,
      title: missionTitle,
      segmentId: seg,
      tunnelSection: `${segLabel} 巡检段`,
      mode: 'semi-auto',
      status: robot.status === 'idle' ? 'queued' : 'running',
      progressPct,
      elapsedMinutes: robot.status === 'idle' ? 0 : 18,
      etaMinutes: robot.status === 'idle' ? 0 : 21,
      checklistDone: robot.status === 'idle' ? 0 : 9,
      checklistTotal: 19,
    },
    robot: {
      id: robot.id,
      name: robot.name,
      onlineState: 'online',
      location: `${segLabel} ${Math.round(robot.progress * 280)}m`,
      batteryPct: robot.batteryPct,
      speedKmh: robot.speedKmh,
      headingDeg: 92,
      pitchDeg: 2.4,
      rollDeg: 1.2,
      networkQuality: networkQualityFromRssi(robot.signalRssi),
      cameraTempC: 31.8,
    },
    primaryVideo: {
      cameraLabel: 'Front Camera / 主巡检视角',
      resolution: '1920 × 1080',
      fps: 24,
      latencyMs: 168,
      timestamp: new Date().toISOString(),
      location: `${segLabel} · 电缆支架检查位`,
      ptz: { pan: 12, tilt: -3, zoom: 1.8 },
      targets: buildTargets(seg),
    },
    auxViews: [
      { id: 'rear', title: '后视视角', subtitle: '倒车与避障确认', status: 'standby', tone: 'neutral' },
      { id: 'zoom', title: '局部放大', subtitle: '故障区域近距离查看', status: 'standby', tone: 'neutral' },
    ],
    sensors: buildSensors(seg),
    events: buildEvents(seg),
    voice: {
      listening: false,
      transcript: '切换热成像',
      hotwords: ['停止前进', '切换热成像', '标记当前异常'],
      suggested: ['人工接管', '减速通过', '截图留证'],
    },
    control: {
      driveMode: 'semi-auto',
      speedLevel: 2,
      lightOn: true,
      stabilizationOn: true,
      recording: true,
    },
  }
}

/** Realtime event for Command page — segment-aware */
export function createRealtimeCommandEvent(segmentId?: string): CommandEvent {
  const robots = getRobots()
  const seg = segmentId ?? robots[0].segmentId
  return sharedCommandEvent(seg)
}

export function createRealtimeVoiceSample() {
  return voiceSamples[Math.floor(Math.random() * voiceSamples.length)]
}

export function createRealtimeSensorPatch(sensor: SensorMetric) {
  return randomSensorPatch(sensor)
}
