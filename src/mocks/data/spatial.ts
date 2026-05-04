/* ═══════════════════════════════════════════════════
   Spatial Page Mock — derives from sharedSeed
   ═══════════════════════════════════════════════════ */

import type { SpatialPageResponse } from '@/types/spatial'
import { SEGMENT_ENV } from './constants'
import { getActiveAlerts, getRobots, getSegmentRisks } from './sharedSeed'
import { mapAlertType } from '@/utils/propagation'
import { TOPO_NODES, TOPO_SEGMENTS } from '@/utils/topology'

function isoHoursAgo(h: number) {
  return new Date(Date.now() - h * 3600_000).toISOString()
}

const NODE_COORDS: Record<string, { x: number; y: number }> = {
  'E-A': { x: 60, y: 100 },
  'E-A2': { x: 680, y: 100 },
  'E-B': { x: 60, y: 280 },
  'E-B3': { x: 900, y: 280 },
  'E-C': { x: 60, y: 460 },
  'E-C3': { x: 900, y: 460 },
  'J-AB1': { x: 370, y: 100 },
  'J-B12': { x: 370, y: 280 },
  'J-B23': { x: 620, y: 280 },
  'J-C12': { x: 370, y: 460 },
  'J-C23': { x: 620, y: 460 },
}

export function createSpatialPageMock(): SpatialPageResponse {
  const activeAlerts = getActiveAlerts()
  const robots = getRobots()
  const segmentRisks = getSegmentRisks()

  return {
    nodes: TOPO_NODES.map((node) => ({
      ...node,
      ...(NODE_COORDS[node.id] ?? { x: 0, y: 0 }),
    })),

    segments: segmentRisks.flatMap((sr) => {
      const topology = TOPO_SEGMENTS.find((segment) => segment.id === sr.segmentId)
      if (!topology) return []
      const hoursAgo = sr.riskLevel > 0.7 ? 0.5 : sr.riskLevel > 0.5 ? 1 : sr.riskLevel > 0.3 ? 4 : 8
      const inspected = ['A1', 'B1', 'B2', 'B3', 'C1', 'C2'].includes(sr.segmentId)

      return [{
        id: sr.segmentId,
        fromNode: topology.fromNode,
        toNode: topology.toNode,
        riskLevel: sr.riskLevel,
        temperatureC: sr.temperatureC,
        humidityPct: sr.humidityPct,
        activeAlerts: sr.activeAlertCount,
        length: topology.length,
        inspected,
        lastInspected: isoHoursAgo(hoursAgo),
      }]
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
