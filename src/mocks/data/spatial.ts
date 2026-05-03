/* ═══════════════════════════════════════════════════
   Spatial Page Mock — derives from sharedSeed
   ═══════════════════════════════════════════════════ */

import type { SpatialPageResponse } from '@/types/spatial'
import { SEGMENT_ENV } from './constants'
import { getActiveAlerts, getRobots, getSegmentRisks } from './sharedSeed'
import { mapAlertType } from '@/utils/propagation'

function isoHoursAgo(h: number) {
  return new Date(Date.now() - h * 3600_000).toISOString()
}

export function createSpatialPageMock(): SpatialPageResponse {
  const activeAlerts = getActiveAlerts()
  const robots = getRobots()
  const segmentRisks = getSegmentRisks()

  return {
    nodes: [
      { id: 'E-A', label: 'A区入口', x: 60, y: 100, type: 'entry' },
      { id: 'E-A2', label: 'A2出口', x: 680, y: 100, type: 'entry' },
      { id: 'E-B', label: 'B区入口', x: 60, y: 280, type: 'entry' },
      { id: 'E-B3', label: 'B3出口', x: 900, y: 280, type: 'entry' },
      { id: 'E-C', label: 'C区入口', x: 60, y: 460, type: 'entry' },
      { id: 'E-C3', label: 'C3出口', x: 900, y: 460, type: 'entry' },
      { id: 'J-AB1', label: '检查井 AB-1', x: 370, y: 100, type: 'manhole' },
      { id: 'J-B12', label: '检查井 B-12', x: 370, y: 280, type: 'junction' },
      { id: 'J-B23', label: '检查井 B-23', x: 620, y: 280, type: 'junction' },
      { id: 'J-C12', label: '检查井 C-12', x: 370, y: 460, type: 'junction' },
      { id: 'J-C23', label: '检查井 C-23', x: 620, y: 460, type: 'junction' },
    ],

    segments: segmentRisks.map((sr) => {
      // Map topology (from/to nodes)
      const topo: Record<string, { fromNode: string; toNode: string; length: number }> = {
        A1: { fromNode: 'E-A', toNode: 'J-AB1', length: 310 },
        A2: { fromNode: 'J-AB1', toNode: 'E-A2', length: 310 },
        B1: { fromNode: 'E-B', toNode: 'J-B12', length: 310 },
        B2: { fromNode: 'J-B12', toNode: 'J-B23', length: 250 },
        B3: { fromNode: 'J-B23', toNode: 'E-B3', length: 280 },
        C1: { fromNode: 'E-C', toNode: 'J-C12', length: 310 },
        C2: { fromNode: 'J-C12', toNode: 'J-C23', length: 250 },
        C3: { fromNode: 'J-C23', toNode: 'E-C3', length: 280 },
      }
      const t = topo[sr.segmentId] ?? { fromNode: '', toNode: '', length: 300 }
      const hoursAgo = sr.riskLevel > 0.7 ? 0.5 : sr.riskLevel > 0.5 ? 1 : sr.riskLevel > 0.3 ? 4 : 8
      const inspected = ['A1', 'B1', 'B2', 'B3', 'C1', 'C2'].includes(sr.segmentId)

      return {
        id: sr.segmentId,
        fromNode: t.fromNode,
        toNode: t.toNode,
        riskLevel: sr.riskLevel,
        temperatureC: sr.temperatureC,
        humidityPct: sr.humidityPct,
        activeAlerts: sr.activeAlertCount,
        length: t.length,
        inspected,
        lastInspected: isoHoursAgo(hoursAgo),
      }
    }),

    // Map shared ActiveAlerts → PipeAlert format (using same AL-xxx IDs)
    // 注意:这里保留 closed 告警,因为传播链算法本身会按 status 过滤;
    // 列表展示侧再决定要不要隐藏 closed。
    alerts: activeAlerts.map((a) => ({
      id: a.id,
      segmentId: a.segmentId,
      progress: a.progress,
      severity: a.severity,
      label: a.title.replace(/^[A-C]\d\s段/, '').trim(),
      // ── 拓扑感知告警所需的扩展字段 ──
      type: mapAlertType(a.type),
      status: a.status,
      occurredAt: a.occurredAt,
    })),

    // Map shared robots → RobotOnMap format
    robots: robots.map((r) => ({
      id: r.id,
      name: r.name,
      segmentId: r.segmentId,
      progress: r.progress,
      direction: r.direction,
      batteryPct: r.batteryPct,
      speedKmh: r.speedKmh,
      status: r.status,
    })),

    // Sensor data derived from segment environment
    sensors: Object.fromEntries(
      ['B3', 'C2'].map((seg) => {
        const env = SEGMENT_ENV[seg]
        const sr = segmentRisks.find((s) => s.segmentId === seg)
        const risk = sr?.riskLevel ?? 0
        return [seg, [
          {
            id: `${seg}-S1`, label: '红外热像仪', type: 'camera' as const,
            position: 'top-right' as const,
            value: `${env.temperatureC}C`,
            status: risk > 0.7 ? 'danger' as const : risk > 0.5 ? 'warning' as const : 'normal' as const,
          },
          {
            id: `${seg}-S2`, label: '温度传感器', type: 'temperature' as const,
            position: 'top-left' as const,
            value: `${env.temperatureC}C`,
            status: env.temperatureC > 60 ? 'danger' as const : env.temperatureC > 40 ? 'warning' as const : 'normal' as const,
          },
          {
            id: `${seg}-S3`, label: '湿度传感器', type: 'humidity' as const,
            position: 'bottom-left' as const,
            value: `${env.humidityPct}%`,
            status: env.humidityPct > 80 ? 'warning' as const : 'normal' as const,
          },
          {
            id: `${seg}-S4`, label: '水位传感器', type: 'water' as const,
            position: 'bottom-right' as const,
            value: seg === 'C2' ? '2.1cm' : '0cm',
            status: seg === 'C2' ? 'warning' as const : 'normal' as const,
          },
        ]]
      }),
    ),
  }
}
