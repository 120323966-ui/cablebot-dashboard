import ReactECharts from 'echarts-for-react'
import { Card } from '@/components/ui/Card'
import type { TrendSeries } from '@/types/dashboard'

export function TrendChartCard({ trends }: { trends: TrendSeries[] }) {
  const option = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    legend: {
      top: 0,
      right: 0,
      textStyle: { color: '#94a3b8' },
    },
    grid: { left: 16, right: 18, top: 40, bottom: 24, containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: trends[0]?.points.map((point) => point.time) ?? [],
      axisLabel: { color: '#64748b' },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#64748b' },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
    },
    series: trends.map((trend, index) => ({
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
