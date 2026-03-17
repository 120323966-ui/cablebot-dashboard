import type { AlertItem } from '@/types/dashboard'
import type { AlertsPageResponse, SegmentAlertHistory } from '@/types/alerts'

function isoMinutesAgo(m: number) {
  return new Date(Date.now() - m * 60_000).toISOString()
}

const SEGMENTS = ['A1', 'A2', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3']

const ALERTS_POOL: AlertItem[] = [
  { id: 'AL-301', title: 'B3 段热像异常偏高', severity: 'critical', status: 'new', segmentId: 'B3', occurredAt: isoMinutesAgo(4), evidence: '热像峰值 71.2°C', value: '高于阈值 +9.3°C' },
  { id: 'AL-302', title: 'C2 段湿度突增', severity: 'warning', status: 'acknowledged', segmentId: 'C2', occurredAt: isoMinutesAgo(12), evidence: '湿度 86%', value: '较均值 +18%' },
  { id: 'AL-303', title: 'R2 通信质量下降', severity: 'info', status: 'new', segmentId: 'C2', occurredAt: isoMinutesAgo(18), evidence: 'RSSI -66dBm', value: '建议切换中继' },
  { id: 'AL-304', title: 'B3 段电缆接头温升', severity: 'critical', status: 'acknowledged', segmentId: 'B3', occurredAt: isoMinutesAgo(35), evidence: '接头区域 68.4°C', value: '高于阈值 +6.5°C' },
  { id: 'AL-305', title: 'A2 段积水检测', severity: 'warning', status: 'new', segmentId: 'A2', occurredAt: isoMinutesAgo(47), evidence: '水位传感器触发', value: '积水深度约 3cm' },
  { id: 'AL-306', title: 'C1 段气体浓度偏高', severity: 'warning', status: 'closed', segmentId: 'C1', occurredAt: isoMinutesAgo(68), evidence: 'CH₄ 0.8%', value: '接近预警阈值' },
  { id: 'AL-307', title: 'B2 段支架螺栓松动', severity: 'info', status: 'acknowledged', segmentId: 'B2', occurredAt: isoMinutesAgo(95), evidence: '视觉检测置信度 87%', value: '建议下次巡检复核' },
  { id: 'AL-308', title: 'B3 段红外数据断流', severity: 'critical', status: 'closed', segmentId: 'B3', occurredAt: isoMinutesAgo(120), evidence: '连续 45s 无数据', value: '已自动恢复' },
  { id: 'AL-309', title: 'A1 段照明异常', severity: 'info', status: 'closed', segmentId: 'A1', occurredAt: isoMinutesAgo(180), evidence: '照度 12lux', value: '低于正常值 60%' },
  { id: 'AL-310', title: 'C3 段振动超标', severity: 'warning', status: 'new', segmentId: 'C3', occurredAt: isoMinutesAgo(210), evidence: '加速度 2.4g', value: '超标 0.9g' },
  { id: 'AL-311', title: 'B1 段温度波动', severity: 'warning', status: 'closed', segmentId: 'B1', occurredAt: isoMinutesAgo(280), evidence: '最大波幅 8.6°C', value: '已趋于稳定' },
  { id: 'AL-312', title: 'C2 段渗漏疑似', severity: 'critical', status: 'new', segmentId: 'C2', occurredAt: isoMinutesAgo(8), evidence: '热像异常冷斑', value: '温差 -12°C' },
]

const HISTORY: SegmentAlertHistory[] = [
  { segmentId: 'A1', recent7d: 2, recent30d: 5, topType: '照明异常', trend: 'steady' },
  { segmentId: 'A2', recent7d: 3, recent30d: 8, topType: '积水检测', trend: 'up' },
  { segmentId: 'B1', recent7d: 1, recent30d: 4, topType: '温度波动', trend: 'down' },
  { segmentId: 'B2', recent7d: 2, recent30d: 6, topType: '结构异常', trend: 'steady' },
  { segmentId: 'B3', recent7d: 7, recent30d: 18, topType: '热像异常', trend: 'up' },
  { segmentId: 'C1', recent7d: 2, recent30d: 7, topType: '气体浓度', trend: 'down' },
  { segmentId: 'C2', recent7d: 5, recent30d: 14, topType: '湿度/渗漏', trend: 'up' },
  { segmentId: 'C3', recent7d: 3, recent30d: 9, topType: '振动超标', trend: 'steady' },
]

export function createAlertsPageMock(): AlertsPageResponse {
  return {
    alerts: ALERTS_POOL.map((a) => ({ ...a })),
    history: HISTORY,
    segments: SEGMENTS,
  }
}

let alertSeq = 400

const RANDOM_TITLES: { title: string; severity: AlertItem['severity']; segment: string; evidence: string; value: string }[] = [
  { title: 'B3 段温度波动增强', severity: 'critical', segment: 'B3', evidence: '峰值 69.8°C', value: '建议人工复核热像窗口' },
  { title: 'C2 段湿度再次上升', severity: 'warning', segment: 'C2', evidence: '湿度 89%', value: '较均值 +22%' },
  { title: 'A2 段水位缓慢上升', severity: 'warning', segment: 'A2', evidence: '水位 4.2cm', value: '超过基准 +1.2cm' },
  { title: 'B3 段接头温度抬升', severity: 'critical', segment: 'B3', evidence: '接头 70.1°C', value: '高于阈值 +8.2°C' },
  { title: 'C3 段异常振动', severity: 'info', segment: 'C3', evidence: '加速度 1.8g', value: '轻微超标' },
  { title: 'B1 段通信延迟', severity: 'info', segment: 'B1', evidence: '延迟 320ms', value: '建议检查中继节点' },
]

export function createRealtimeAlertForPage(): AlertItem {
  const tpl = RANDOM_TITLES[Math.floor(Math.random() * RANDOM_TITLES.length)]
  alertSeq++
  return {
    id: `AL-${alertSeq}`,
    title: tpl.title,
    severity: tpl.severity,
    status: 'new',
    segmentId: tpl.segment,
    occurredAt: new Date().toISOString(),
    evidence: tpl.evidence,
    value: tpl.value,
  }
}