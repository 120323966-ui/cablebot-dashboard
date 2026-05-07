import { useMemo } from 'react'
import { Card } from '@/components/ui/Card'

const descriptions: Record<string, string> = {
  command: '实时巡检指挥页将承载视频流、多模态控制、遥操作与传感器联动。',
  alerts: '告警处置页将承载告警分级、证据卡片、处置流转与人工确认。',
  spatial: '空间定位 / 3D 页将承载管网地图、轨迹回放和缺陷空间定位。',
  history: '历史分析页将承载多维趋势、筛选与对比分析。',
  reports: '报告生成页将承载巡检摘要、图表、截图与导出。',
}

export function PlaceholderPage({ kind }: { kind: string }) {
  const desc = useMemo(() => descriptions[kind] ?? '该页面待实现。', [kind])

  return (
    <Card className="min-h-[520px] flex items-center justify-center" eyebrow="Roadmap" title="页面占位">
      <div className="max-w-xl text-center">
        <div className="text-2xl font-semibold text-white">{kind}</div>
        <p className="mt-4 text-base leading-7 text-slate-300">{desc}</p>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          本次交付重点是“PC 首页总览”的高保真工程化落地，其余页面已提供路由壳层，便于继续迭代。
        </p>
      </div>
    </Card>
  )
}
