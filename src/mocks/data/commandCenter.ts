import type {
  CommandCenterResponse,
  CommandEvent,
  SensorMetric,
  SensorStatus,
  SensorTrend,
} from '@/types/command'

function isoMinutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60_000).toISOString()
}

const voiceSamples = [
  '停止前进',
  '切换热成像',
  '标记当前异常',
  '聚焦前方高温点',
]

function randomSensorPatch(sensor: SensorMetric): Pick<SensorMetric, 'value' | 'status' | 'trend' | 'hint'> {
  const nextValue = Number((sensor.value + (Math.random() * 2.8 - 1.2)).toFixed(1))

  let status: SensorStatus = sensor.status
  let trend: SensorTrend = 'steady'
  let hint = sensor.hint

  if (sensor.id === 'temp') {
    if (nextValue >= 68) {
      status = 'danger'
      trend = 'up'
      hint = '热像窗口建议复核'
    } else if (nextValue >= 63) {
      status = 'watch'
      trend = 'up'
      hint = '温升持续，建议减速观察'
    } else {
      status = 'normal'
      trend = nextValue >= sensor.value ? 'up' : 'steady'
      hint = '温度处于可控区间'
    }
  }

  if (sensor.id === 'humidity') {
    if (nextValue >= 83) {
      status = 'danger'
      trend = 'up'
      hint = '疑似渗漏增强'
    } else if (nextValue >= 76) {
      status = 'watch'
      trend = 'up'
      hint = '湿度抬升，建议联动热像'
    } else {
      status = 'normal'
      trend = nextValue >= sensor.value ? 'up' : 'down'
      hint = '湿度维持稳定'
    }
  }

  if (sensor.id === 'gas') {
    if (nextValue >= 18) {
      status = 'danger'
      trend = 'up'
      hint = '气体波动超预期'
    } else if (nextValue >= 12) {
      status = 'watch'
      trend = 'up'
      hint = '建议保持通风监测'
    } else {
      status = 'normal'
      trend = nextValue >= sensor.value ? 'up' : 'steady'
      hint = '气体浓度正常'
    }
  }

  if (sensor.id === 'tilt') {
    if (nextValue >= 8) {
      status = 'danger'
      trend = 'up'
      hint = '姿态超限，建议人工接管'
    } else if (nextValue >= 5) {
      status = 'watch'
      trend = 'up'
      hint = '路面扰动增强'
    } else {
      status = 'normal'
      trend = nextValue >= sensor.value ? 'up' : 'down'
      hint = '姿态保持平稳'
    }
  }

  if (sensor.id === 'water') {
    if (nextValue >= 70) {
      status = 'danger'
      trend = 'up'
      hint = '积水风险升高'
    } else if (nextValue >= 48) {
      status = 'watch'
      trend = 'up'
      hint = '建议切换低速巡检'
    } else {
      status = 'normal'
      trend = nextValue >= sensor.value ? 'up' : 'steady'
      hint = '水浸风险可控'
    }
  }

  return {
    value: nextValue,
    status,
    trend,
    hint,
  }
}

export function createCommandCenterMock(): CommandCenterResponse {
  return {
    meta: {
      stationName: '地下电缆排管 · 实时巡检指挥',
      updatedAt: new Date().toISOString(),
      operatorName: '值班员 · Cris',
      shift: '白班',
      weatherNote: '降雨后巡检，重点关注湿度与积水风险',
      network: {
        status: 'ok',
        latencyMs: 42,
      },
    },
    mission: {
      id: 'CMD-2026-0316-01',
      title: 'B3 区段实时巡检任务',
      segmentId: 'B3',
      tunnelSection: '西入口 → 中段检查位',
      mode: 'semi-auto',
      status: 'running',
      progressPct: 46,
      elapsedMinutes: 18,
      etaMinutes: 21,
      checklistDone: 9,
      checklistTotal: 19,
    },
    robot: {
      id: 'R1',
      name: 'PipeBot-01',
      onlineState: 'online',
      location: 'B3-中段 124m',
      batteryPct: 78,
      speedKmh: 1.1,
      headingDeg: 92,
      pitchDeg: 2.4,
      rollDeg: 1.2,
      networkQuality: 'good',
      cameraTempC: 31.8,
    },
    primaryVideo: {
      cameraLabel: 'Front Camera / 主巡检视角',
      resolution: '1920 × 1080',
      fps: 24,
      latencyMs: 168,
      timestamp: new Date().toISOString(),
      location: 'B3-中段 · 电缆支架检查位',
      ptz: {
        pan: 12,
        tilt: -3,
        zoom: 1.8,
      },
      targets: [
        {
          id: 'T-01',
          label: '热像温升点',
          severity: 'critical',
          detail: '峰值 71.2°C，建议复核',
          top: '20%',
          left: '60%',
          width: '18%',
          height: '24%',
        },
        {
          id: 'T-02',
          label: '潮湿异常带',
          severity: 'warning',
          detail: '湿度带集中于支架下沿',
          top: '54%',
          left: '25%',
          width: '22%',
          height: '18%',
        },
      ],
    },
    auxViews: [
      {
        id: 'thermal',
        title: '热成像辅助窗',
        subtitle: '当前联动主视频热点区域',
        status: 'live',
        tone: 'danger',
      },
      {
        id: 'rear',
        title: '后视视角',
        subtitle: '用于倒车与避障确认',
        status: 'standby',
        tone: 'neutral',
      },
      {
        id: 'zoom',
        title: '局部放大',
        subtitle: '支架细节与编号复核',
        status: 'queued',
        tone: 'warning',
      },
      {
        id: 'depth',
        title: '深度辅助',
        subtitle: '窄管段间距感知',
        status: 'standby',
        tone: 'good',
      },
    ],
    sensors: [
      {
        id: 'temp',
        label: '管道温度',
        value: 66.4,
        unit: '°C',
        status: 'danger',
        trend: 'up',
        hint: '热像窗口建议复核',
      },
      {
        id: 'humidity',
        label: '环境湿度',
        value: 79.2,
        unit: '%',
        status: 'watch',
        trend: 'up',
        hint: '湿度抬升，建议联动热像',
      },
      {
        id: 'gas',
        label: 'CH₄ 浓度',
        value: 8.4,
        unit: 'ppm',
        status: 'normal',
        trend: 'steady',
        hint: '气体浓度正常',
      },
      {
        id: 'tilt',
        label: '姿态倾角',
        value: 3.1,
        unit: '°',
        status: 'normal',
        trend: 'steady',
        hint: '姿态保持平稳',
      },
      {
        id: 'water',
        label: '积水指数',
        value: 52.6,
        unit: '%',
        status: 'watch',
        trend: 'up',
        hint: '建议切换低速巡检',
      },
    ],
    events: [
      {
        id: 'EV-401',
        title: 'B3 段热像峰值超阈',
        severity: 'critical',
        status: 'new',
        source: '热成像联动',
        segmentId: 'B3',
        occurredAt: isoMinutesAgo(2),
        detail: '峰值 71.2°C，较阈值 +8.7°C',
      },
      {
        id: 'EV-402',
        title: '潮湿异常带进入重点复核区',
        severity: 'warning',
        status: 'processing',
        source: '视觉识别',
        segmentId: 'B3',
        occurredAt: isoMinutesAgo(7),
        detail: '建议切换局部放大辅助确认',
      },
      {
        id: 'EV-403',
        title: '机器人通过积水扰动段',
        severity: 'info',
        status: 'acknowledged',
        source: '底盘姿态',
        segmentId: 'B3',
        occurredAt: isoMinutesAgo(11),
        detail: '姿态波动上升，仍在安全阈内',
      },
      {
        id: 'EV-404',
        title: '通信时延轻微抬升',
        severity: 'info',
        status: 'acknowledged',
        source: '链路监测',
        segmentId: 'B3',
        occurredAt: isoMinutesAgo(16),
        detail: '当前视频链路延迟 168ms',
      },
    ],
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

export function createRealtimeCommandEvent(): CommandEvent {
  const pool: Array<Omit<CommandEvent, 'id' | 'occurredAt'>> = [
    {
      title: '热像高温点持续存在',
      severity: 'critical',
      status: 'new',
      source: '热成像联动',
      segmentId: 'B3',
      detail: '建议暂停并请求人工确认',
    },
    {
      title: '局部潮湿带范围扩大',
      severity: 'warning',
      status: 'processing',
      source: '视觉识别',
      segmentId: 'B3',
      detail: '建议切换局部放大窗口复核',
    },
    {
      title: '机器人通过支架狭窄区',
      severity: 'info',
      status: 'acknowledged',
      source: '空间约束',
      segmentId: 'B3',
      detail: '维持低速并保持前视对准',
    },
  ]

  const picked = pool[Math.floor(Math.random() * pool.length)]

  return {
    id: `EV-${Math.floor(Math.random() * 900 + 100)}`,
    occurredAt: new Date().toISOString(),
    ...picked,
  }
}

export function createRealtimeVoiceSample() {
  return voiceSamples[Math.floor(Math.random() * voiceSamples.length)]
}

export function createRealtimeSensorPatch(sensor: SensorMetric) {
  return randomSensorPatch(sensor)
}
