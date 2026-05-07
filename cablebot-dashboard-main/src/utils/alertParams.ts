import type { AlertType } from '@/types/spatial'

export interface AlertTypeParams {
  /** 本体阈值：高 / 中 / 低 / 紧急 */
  thresholds: {
    high: number
    medium: number
    low: number
    emergency: number
  }
  /** 单位 */
  unit: string
  /** 恶化方向：up 表示数值上升恶化，down 表示数值下降恶化 */
  worseDirection: 'up' | 'down'
  /** 持续恶化判定参数 */
  trend: {
    N: number
    M: number
    ratioThreshold: number
  }
}

export const ALERT_TYPE_PARAMS: Record<AlertType, AlertTypeParams> = {
  thermal: {
    thresholds: { high: 70, medium: 55, low: 45, emergency: 95 },
    unit: '°C',
    worseDirection: 'up',
    trend: { N: 4, M: 3, ratioThreshold: 0.20 },
  },
  water: {
    thresholds: { high: 30, medium: 20, low: 10, emergency: 50 },
    unit: 'cm',
    worseDirection: 'up',
    trend: { N: 4, M: 3, ratioThreshold: 0.30 },
  },
  gas: {
    thresholds: { high: 1.0, medium: 0.7, low: 0.4, emergency: 1.5 },
    unit: '%',
    worseDirection: 'up',
    trend: { N: 5, M: 3, ratioThreshold: 0.25 },
  },
  moisture: {
    thresholds: { high: 85, medium: 75, low: 60, emergency: 95 },
    unit: '%',
    worseDirection: 'up',
    trend: { N: 4, M: 3, ratioThreshold: 0.20 },
  },
  structural: {
    thresholds: { high: 90, medium: 80, low: 70, emergency: 99 },
    unit: '%',
    worseDirection: 'up',
    trend: { N: 4, M: 3, ratioThreshold: 0.20 },
  },
  vibration: {
    thresholds: { high: 2.2, medium: 1.5, low: 1.0, emergency: 3.0 },
    unit: 'g',
    worseDirection: 'up',
    trend: { N: 4, M: 3, ratioThreshold: 0.20 },
  },
  comm: {
    thresholds: { high: -75, medium: -65, low: -55, emergency: -85 },
    unit: 'dBm',
    worseDirection: 'down',
    trend: { N: 4, M: 3, ratioThreshold: 0.20 },
  },
  lighting: {
    thresholds: { high: 15, medium: 30, low: 50, emergency: 5 },
    unit: 'lux',
    worseDirection: 'down',
    trend: { N: 4, M: 3, ratioThreshold: 0.20 },
  },
  unknown: {
    thresholds: { high: 1, medium: 0.5, low: 0.2, emergency: 2 },
    unit: '',
    worseDirection: 'up',
    trend: { N: 4, M: 3, ratioThreshold: 0.20 },
  },
}
