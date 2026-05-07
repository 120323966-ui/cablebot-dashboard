import { useCallback, useEffect, useRef, useState } from 'react'
import type { TimeRange } from '@/types/history'
import type { ExportStatus, ReportConfig, ReportsPageResponse } from '@/types/reports'

const DEFAULT_CONFIG: ReportConfig = {
  title: '电缆排管巡检报告',
  author: '系统管理员',
  remark: '',
  timeRange: '7d',
  modules: {
    executiveSummary: true,
    alertCharts: true,
    segmentRisk: true,
    inspectionTable: true,
  },
}

export function useReports() {
  const [config, setConfig] = useState<ReportConfig>(DEFAULT_CONFIG)
  const [data, setData] = useState<ReportsPageResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exportStatus, setExportStatus] = useState<ExportStatus>('idle')
  const timerRef = useRef<number | null>(null)

  const fetchData = useCallback(async (range: TimeRange) => {
    setLoading(true)
    setError(null)
    try {
      const days = range === '7d' ? 7 : 30
      const res = await fetch(`/api/dashboard/reports?days=${days}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as ReportsPageResponse
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchData(config.timeRange)
  }, [config.timeRange, fetchData])

  const updateConfig = useCallback((patch: Partial<ReportConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }))
  }, [])

  const toggleModule = useCallback((key: keyof ReportConfig['modules']) => {
    setConfig((prev) => ({
      ...prev,
      modules: { ...prev.modules, [key]: !prev.modules[key] },
    }))
  }, [])

  /** 模拟导出 */
  const startExport = useCallback(() => {
    setExportStatus('generating')
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => {
      setExportStatus('success')
      timerRef.current = window.setTimeout(() => {
        setExportStatus('idle')
      }, 2400)
    }, 2200)
  }, [])

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [])

  const activeModuleCount = Object.values(config.modules).filter(Boolean).length

  return {
    config,
    updateConfig,
    toggleModule,
    data,
    loading,
    error,
    exportStatus,
    startExport,
    activeModuleCount,
  }
}
