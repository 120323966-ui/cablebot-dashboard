import type { AlertItem, HomeOverviewResponse, TrendPoint } from '@/types/dashboard'

const TREND_POINTS = 12
const TREND_STEP_MINUTES = 10

function isoMinutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60_000).toISOString()
}

function alignToStep(date: Date, stepMinutes: number) {
  const aligned = new Date(date)
  aligned.setSeconds(0, 0)
  const minute = aligned.getMinutes()
  aligned.setMinutes(minute - (minute % stepMinutes))
  return aligned
}

function buildTrend(base: number, wobble: number): TrendPoint[] {
  const end = alignToStep(new Date(), TREND_STEP_MINUTES)

  return Array.from({ length: TREND_POINTS }, (_, idx) => {
    const pointTime = new Date(end)
    pointTime.setMinutes(end.getMinutes() - (TREND_POINTS - 1 - idx) * TREND_STEP_MINUTES)

    return {
      time: pointTime.toISOString(),
      value: Number((base + Math.sin(idx / 2) * wobble + (idx % 3) * 0.9).toFixed(1)),
    }
  })
}

export function createHomeOverviewMock(): HomeOverviewResponse {
  return {
    meta: {
      stationName: '地下电缆排管 · 监控中心',
      updatedAt: new Date().toISOString(),
      operatorName: '值班员 · Cris',
      shift: '白班',
      weatherNote: '城区降雨后 3 小时，重点关注湿度与渗漏风险',
      network: { status: 'ok', latencyMs: 36 },
    },
    kpis: [
      { id: 'tasks', label: '今日计划任务', value: 6, unit: '项', deltaPct: 20, tone: 'neutral', hint: '其中 2 项为重点区段复核' },
      { id: 'online', label: '在线机器人', value: 3, unit: '台', deltaPct: 0, tone: 'good', hint: '全设备健康可用' },
      { id: 'alerts', label: '待处置告警', value: 4, unit: '条', deltaPct: 33, tone: 'warning', hint: '1 条需 10 分钟内确认' },
      { id: 'risk', label: '高风险区段', value: 2, unit: '段', deltaPct: -25, tone: 'danger', hint: 'B3、C2 风险仍需盯防' },
    ],
    activeTask: {
      taskId: 'TK-2026-0315-0021',
      title: 'B3 区段巡检任务',
      mode: 'semi-auto',
      status: 'running',
      progressPct: 42,
      etaMinutes: 28,
      segmentId: 'B3',
      checksCompleted: 8,
      checksTotal: 19,
    },
    robots: [
      { id: 'R1', name: 'PipeBot-01', health: 'good', batteryPct: 78, signalRssi: -58, location: 'B3-西入口', speedKmh: 1.2, temperatureC: 27.4 },
      { id: 'R2', name: 'PipeBot-02', health: 'warning', batteryPct: 49, signalRssi: -66, location: 'C2-阀井段', speedKmh: 0.8, temperatureC: 31.2 },
      { id: 'R3', name: 'PipeBot-03', health: 'neutral', batteryPct: 91, signalRssi: -52, location: '待命区', speedKmh: 0, temperatureC: 25.1 },
    ],
    alerts: [
      { id: 'AL-301', title: 'B3 段热像异常偏高', severity: 'critical', status: 'new', segmentId: 'B3', occurredAt: isoMinutesAgo(4), evidence: '热像峰值 71.2°C', value: '高于阈值 +9.3°C' },
      { id: 'AL-302', title: 'C2 段湿度突增', severity: 'warning', status: 'acknowledged', segmentId: 'C2', occurredAt: isoMinutesAgo(12), evidence: '湿度 86%', value: '较均值 +18%' },
      { id: 'AL-303', title: 'R2 通信质量下降', severity: 'info', status: 'new', segmentId: 'C2', occurredAt: isoMinutesAgo(18), evidence: 'RSSI -66dBm', value: '建议切换中继' },
    ],
    risk: {
      columns: ['A1', 'A2', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3'],
      rows: ['北侧', '中段', '南侧'],
      cells: [
        { x: 0, y: 0, risk: 0.2, label: '状态平稳', kind: 'normal', trend: 'steady' },
        { x: 1, y: 0, risk: 0.28, label: '轻度波动', kind: 'normal', trend: 'up' },
        { x: 2, y: 0, risk: 0.36, label: '温升抬头', kind: 'temperature', trend: 'up' },
        { x: 3, y: 0, risk: 0.44, label: '持续观察', kind: 'review', trend: 'steady' },
        { x: 4, y: 0, risk: 0.91, label: '热像复核', kind: 'temperature', trend: 'up' },
        { x: 5, y: 0, risk: 0.42, label: '局部回潮', kind: 'humidity', trend: 'up' },
        { x: 6, y: 0, risk: 0.55, label: '积水抬升', kind: 'water', trend: 'up' },
        { x: 7, y: 0, risk: 0.34, label: '状态平稳', kind: 'normal', trend: 'steady' },
        { x: 0, y: 1, risk: 0.18, label: '状态平稳', kind: 'normal', trend: 'steady' },
        { x: 1, y: 1, risk: 0.23, label: '状态平稳', kind: 'normal', trend: 'steady' },
        { x: 2, y: 1, risk: 0.29, label: '轻度波动', kind: 'normal', trend: 'up' },
        { x: 3, y: 1, risk: 0.41, label: '待人工看护', kind: 'review', trend: 'up' },
        { x: 4, y: 1, risk: 0.77, label: '高温回落', kind: 'temperature', trend: 'down' },
        { x: 5, y: 1, risk: 0.39, label: '状态平稳', kind: 'normal', trend: 'steady' },
        { x: 6, y: 1, risk: 0.82, label: '潮湿异常', kind: 'humidity', trend: 'up' },
        { x: 7, y: 1, risk: 0.31, label: '状态平稳', kind: 'normal', trend: 'steady' },
        { x: 0, y: 2, risk: 0.12, label: '状态平稳', kind: 'normal', trend: 'steady' },
        { x: 1, y: 2, risk: 0.2, label: '状态平稳', kind: 'normal', trend: 'steady' },
        { x: 2, y: 2, risk: 0.27, label: '轻度波动', kind: 'normal', trend: 'steady' },
        { x: 3, y: 2, risk: 0.33, label: '状态平稳', kind: 'normal', trend: 'steady' },
        { x: 4, y: 2, risk: 0.58, label: '待复核', kind: 'review', trend: 'steady' },
        { x: 5, y: 2, risk: 0.31, label: '状态平稳', kind: 'normal', trend: 'steady' },
        { x: 6, y: 2, risk: 0.63, label: '湿度偏高', kind: 'humidity', trend: 'up' },
        { x: 7, y: 2, risk: 0.26, label: '状态平稳', kind: 'normal', trend: 'steady' },
      ],
    },
    trends: [
      { id: 'temp', label: '管道温度', unit: '°C', threshold: 65, points: buildTrend(56, 6) },
      { id: 'humidity', label: '环境湿度', unit: '%', threshold: 80, points: buildTrend(68, 8) },
    ],
    actions: [
      { id: 'pause', label: '暂停任务', description: '立即暂停当前半自动巡检任务', tone: 'warning', confirm: true },
      { id: 'focus-b3', label: '聚焦 B3 区段', description: '切换首页态势中心到高风险区段 B3', tone: 'neutral' },
      { id: 'export', label: '导出日报', description: '生成今日巡检摘要与异常快照', tone: 'good' },
      { id: 'voice', label: '语音控制', description: '进入语音指令待命，支持快捷命令', tone: 'danger' },
    ],
  }
}

export function createRealtimeAlert(): AlertItem {
  return {
    id: `AL-${Math.floor(Math.random() * 900 + 100)}`,
    title: 'B3 段温度波动增强',
    severity: Math.random() > 0.55 ? 'critical' : 'warning',
    status: 'new',
    segmentId: 'B3',
    occurredAt: new Date().toISOString(),
    evidence: `峰值 ${(67 + Math.random() * 6).toFixed(1)}°C`,
    value: '建议人工复核热像窗口',
  }
}
