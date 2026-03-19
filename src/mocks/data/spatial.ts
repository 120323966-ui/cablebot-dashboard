import type { SpatialPageResponse } from '@/types/spatial'

function isoHoursAgo(h: number) {
  return new Date(Date.now() - h * 3600_000).toISOString()
}

export function createSpatialPageMock(): SpatialPageResponse {
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
    segments: [
      { id: 'A1', fromNode: 'E-A', toNode: 'J-AB1', riskLevel: 0.25, temperatureC: 28.4, humidityPct: 62, activeAlerts: 0, length: 310, lastInspected: isoHoursAgo(2) },
      { id: 'A2', fromNode: 'J-AB1', toNode: 'E-A2', riskLevel: 0.32, temperatureC: 30.1, humidityPct: 65, activeAlerts: 1, length: 310, lastInspected: isoHoursAgo(3) },
      { id: 'B1', fromNode: 'E-B', toNode: 'J-B12', riskLevel: 0.38, temperatureC: 33.2, humidityPct: 70, activeAlerts: 0, length: 310, lastInspected: isoHoursAgo(5) },
      { id: 'B2', fromNode: 'J-B12', toNode: 'J-B23', riskLevel: 0.52, temperatureC: 38.6, humidityPct: 74, activeAlerts: 1, length: 250, lastInspected: isoHoursAgo(4) },
      { id: 'B3', fromNode: 'J-B23', toNode: 'E-B3', riskLevel: 0.91, temperatureC: 68.4, humidityPct: 82, activeAlerts: 3, length: 280, lastInspected: isoHoursAgo(0.5) },
      { id: 'C1', fromNode: 'E-C', toNode: 'J-C12', riskLevel: 0.42, temperatureC: 29.8, humidityPct: 71, activeAlerts: 1, length: 310, lastInspected: isoHoursAgo(6) },
      { id: 'C2', fromNode: 'J-C12', toNode: 'J-C23', riskLevel: 0.65, temperatureC: 34.5, humidityPct: 86, activeAlerts: 2, length: 250, lastInspected: isoHoursAgo(1) },
      { id: 'C3', fromNode: 'J-C23', toNode: 'E-C3', riskLevel: 0.35, temperatureC: 27.6, humidityPct: 60, activeAlerts: 1, length: 280, lastInspected: isoHoursAgo(8) },
    ],
    alerts: [
      { id: 'PA-1', segmentId: 'B3', progress: 0.35, severity: 'critical', label: '热像温升点' },
      { id: 'PA-2', segmentId: 'B3', progress: 0.7, severity: 'critical', label: '电缆接头温升' },
      { id: 'PA-3', segmentId: 'B3', progress: 0.9, severity: 'warning', label: '湿度偏高' },
      { id: 'PA-4', segmentId: 'C2', progress: 0.4, severity: 'warning', label: '渗漏疑似' },
      { id: 'PA-5', segmentId: 'C2', progress: 0.8, severity: 'critical', label: '冷斑异常' },
      { id: 'PA-6', segmentId: 'A2', progress: 0.5, severity: 'info', label: '照明偏暗' },
      { id: 'PA-7', segmentId: 'C1', progress: 0.6, severity: 'warning', label: 'CH4浓度偏高' },
      { id: 'PA-8', segmentId: 'B2', progress: 0.3, severity: 'info', label: '螺栓松动' },
      { id: 'PA-9', segmentId: 'C3', progress: 0.55, severity: 'warning', label: '振动超标' },
    ],
    robots: [
      { id: 'R1', name: 'PipeBot-01', segmentId: 'B3', progress: 0.42, direction: 1, batteryPct: 78, speedKmh: 1.2, status: 'inspecting' },
      { id: 'R2', name: 'PipeBot-02', segmentId: 'C2', progress: 0.65, direction: -1, batteryPct: 49, speedKmh: 0.8, status: 'moving' },
      { id: 'R3', name: 'PipeBot-03', segmentId: 'A1', progress: 0.1, direction: 1, batteryPct: 91, speedKmh: 0, status: 'idle' },
    ],
    sensors: {
      B3: [
        { id: 'S1', label: '红外热像仪', type: 'camera', position: 'top-right', value: '71.2C', status: 'danger' },
        { id: 'S2', label: '温度传感器', type: 'temperature', position: 'top-left', value: '68.4C', status: 'danger' },
        { id: 'S3', label: '湿度传感器', type: 'humidity', position: 'bottom-left', value: '82%', status: 'warning' },
        { id: 'S4', label: '水位传感器', type: 'water', position: 'bottom-right', value: '0cm', status: 'normal' },
      ],
      C2: [
        { id: 'S5', label: '红外热像仪', type: 'camera', position: 'top-right', value: '34.5C', status: 'normal' },
        { id: 'S6', label: '温度传感器', type: 'temperature', position: 'top-left', value: '34.5C', status: 'normal' },
        { id: 'S7', label: '湿度传感器', type: 'humidity', position: 'bottom-left', value: '86%', status: 'warning' },
        { id: 'S8', label: '水位传感器', type: 'water', position: 'bottom-right', value: '2.1cm', status: 'warning' },
      ],
    },
  }
}