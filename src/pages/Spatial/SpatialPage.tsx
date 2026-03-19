import { Bot, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useSpatial } from '@/hooks/useSpatial'
import { CrossSectionView } from './CrossSectionView'
import { PipelineMap } from './PipelineMap'
import { RobotControlPanel } from './RobotControlPanel'
import { SpatialInfoPanel } from './SpatialInfoPanel'

export function SpatialPage() {
  const {
    data, loading, error,
    selectedSegment, selectedRobot,
    selectSegment, selectRobot,
    updateRobotStatus, moveRobotToSegment, updateRobotSpeed,
  } = useSpatial()

  if (loading) {
    return <div className="panel-card min-h-[520px] animate-pulse bg-white/[0.03]" />
  }

  if (error || !data) {
    return (
      <div className="panel-card flex min-h-[360px] items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-semibold text-white">空间数据加载失败</div>
          <p className="mt-3 text-sm text-slate-400">{error ?? '未知错误'}</p>
          <Button className="mt-6" onClick={() => window.location.reload()}>重新加载</Button>
        </div>
      </div>
    )
  }

  const activeSeg = data.segments.find((s) => s.id === selectedSegment) ?? null
  const activeSensors = selectedSegment ? (data.sensors[selectedSegment] ?? []) : []
  const activeRobot = data.robots.find((r) => r.id === selectedRobot) ?? null

  return (
    <div className="flex h-[calc(100vh-148px)] flex-col gap-4 overflow-hidden">
      <div className="flex min-h-0 flex-1 gap-4">
        {/* Left: Map + Cross section */}
        <div className="flex min-w-0 flex-[7] flex-col gap-3">
          <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/8 bg-slate-950/40 p-3">
            <PipelineMap
              nodes={data.nodes}
              segments={data.segments}
              alerts={data.alerts}
              robots={data.robots}
              selectedSegment={selectedSegment}
              selectedRobot={selectedRobot}
              onSelectSegment={selectSegment}
              onSelectRobot={selectRobot}
            />
          </div>
          {activeSeg && (
            <div className="shrink-0">
              <CrossSectionView segment={activeSeg} sensors={activeSensors} />
            </div>
          )}
        </div>

        {/* Right: Info panel (segment detail OR robot control) */}
        <div className="flex w-[300px] shrink-0 flex-col overflow-hidden rounded-2xl border border-white/8 bg-slate-950/40">
          {activeRobot ? (
            <RobotControlPanel
              robot={activeRobot}
              segments={data.segments}
              onStatusChange={updateRobotStatus}
              onMoveToSegment={moveRobotToSegment}
              onSpeedChange={updateRobotSpeed}
            />
          ) : activeSeg ? (
            <SpatialInfoPanel
              segment={activeSeg}
              alerts={data.alerts}
              robots={data.robots}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <div className="flex justify-center gap-3">
                  <MapPin className="h-8 w-8 text-slate-600" />
                  <Bot className="h-8 w-8 text-slate-600" />
                </div>
                <div className="mt-4 text-sm text-slate-500">
                  点击管网区段或机器人查看详情
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
