import ReactECharts from 'echarts-for-react'
import { Card } from '@/components/ui/Card'
import type { TrendPoint, TrendSeries } from '@/types/dashboard'

function sortTrendPoints(points: TrendPoint[]) {
  return [...points].sort((a, b) => {
    const aTime = new Date(a.time).getTime()
    const bTime = new Date(b.time).getTime()
    return aTime - bTime
  })
}

function formatTrendTimeLabel(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function TrendChartCard({ trends }: { trends: TrendSeries[] }) {
  const normalizedTrends = trends.map((trend) => ({
    ...trend,
    points: sortTrendPoints(trend.points),
  }))

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      formatter: (params: Array<{ axisValue: string; marker: string; seriesName: string; value: number | string }>) => {
        if (!params.length) return ''

        const title = formatTrendTimeLabel(params[0].axisValue)
        const rows = params
          .map((item) => `${item.marker}${item.seriesName}: ${item.value}`)
          .join('<br/>')

        return `${title}<br/>${rows}`
      },
      valueFormatter: (value: number | string) => `${value}`,
    },
    legend: {
      top: 0,
      right: 0,
      textStyle: { color: '#94a3b8' },
    },
    grid: { left: 16, right: 18, top: 40, bottom: 24, containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: normalizedTrends[0]?.points.map((point) => point.time) ?? [],
      axisLabel: {
        color: '#64748b',
        interval: (index: number) => index % 2 === 1,
        hideOverlap: true,
        formatter: (value: string) => formatTrendTimeLabel(value),
      },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#64748b' },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
    },
    series: normalizedTrends.map((trend, index) => ({
      name: `${trend.label} (${trend.unit})`,
      type: 'line',
      smooth: true,
      showSymbol: false,
      lineStyle: { width: 3 },
      areaStyle: { opacity: 0.12 },
      markLine: trend.threshold
        ? {
            symbol: 'none',
            lineStyle: { type: 'dashed' },
            data: [{ yAxis: trend.threshold }],
          }
        : undefined,
      data: trend.points.map((point) => point.value),
      color: index === 0 ? '#22d3ee' : '#fbbf24',
    })),
  }

  return (
    <Card eyebrow="Visualization" title="关键趋势">
      <div className="mb-3 text-sm leading-6 text-slate-300">
        通过温度与湿度双趋势，值班员可快速判断当前区段是否存在持续升温或渗漏风险。
      </div>
      <ReactECharts option={option} style={{ height: 320 }} />
    </Card>
  )
}
