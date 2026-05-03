import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Bot, MapPin, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useSpatial } from '@/hooks/useSpatial'
import { PointCloudView } from './PointCloudView'
import { PipelineMap } from './PipelineMap'
import { RobotControlPanel } from './RobotControlPanel'
import { SpatialInfoPanel } from './SpatialInfoPanel'
import { buildPropagationChain } from '@/utils/propagation'
import type { PropagationChain } from '@/types/spatial'

export function SpatialPage() {
  const {
    data, loading, error,
    selectedSegment, selectedRobot,
    selectSegment, selectRobot,
    updateRobotStatus, moveRobotToSegment, updateRobotSpeed,
  } = useSpatial()

  const [searchParams, setSearchParams] = useSearchParams()
  const [focusAlertId, setFocusAlertId] = useState<string | null>(null)
  const [focusKey, setFocusKey] = useState(0)
  /** 当前激活的传播链;为 null 时拓扑图回到普通视图 */
  const [activeChain, setActiveChain] = useState<PropagationChain | null>(null)
  /**
   * 点云视图开关 — 与区段选中状态解耦。
   * 用户必须主动点击右侧"查看三维剖面"按钮才会打开;
   * 取消区段选中或点击点云面板的 X 按钮可关闭。
   */
  const [pointCloudVisible, setPointCloudVisible] = useState(false)

  /* ── 选中告警:计算传播链并以起点区段为选中 ── */
  const handleAlertClick = useCallback((alertId: string) => {
    if (!data) return
    const chain = buildPropagationChain(alertId, data.alerts, data.segments, data.nodes)
    if (chain) {
      setActiveChain(chain)
      selectSegment(chain.originSegmentId)
      setFocusAlertId(alertId)
      setFocusKey((k) => k + 1)
      // 注意:不强制打开点云。用户从右侧面板自行决定是否查看三维剖面。
    }
  }, [data, selectSegment])

  /* ── 选中区段(切换语义)──
     点击未选中区段:选中,自动以最严重告警为起点构建传播链
     点击已选中区段:取消选中,清空传播链与点云
  */
  const handleSegmentSelect = useCallback((segId: string) => {
    if (!data) return

    // 已选中状态下再点同一段 = 取消选中
    if (selectedSegment === segId) {
      selectSegment(null)
      setActiveChain(null)
      setFocusAlertId(null)
      setPointCloudVisible(false)
      return
    }

    selectSegment(segId)
    const segAlerts = data.alerts
      .filter((a) => a.segmentId === segId && a.status !== 'closed')
      .sort((a, b) => {
        const rank = { critical: 3, warning: 2, info: 1 } as const
        return rank[b.severity] - rank[a.severity]
      })
    if (segAlerts.length > 0) {
      const chain = buildPropagationChain(segAlerts[0].id, data.alerts, data.segments, data.nodes)
      setActiveChain(chain)
      setFocusAlertId(segAlerts[0].id)
      setFocusKey((k) => k + 1)
    } else {
      setActiveChain(null)
      setFocusAlertId(null)
    }
    // 切换到不同区段时,点云若已打开应关闭(避免复用旧区段的视图)
    setPointCloudVisible(false)
  }, [data, selectedSegment, selectSegment])

  /* ── 取消选中(点击空白处)── */
  const handleDeselect = useCallback(() => {
    selectSegment(null)
    selectRobot(null)
    setActiveChain(null)
    setFocusAlertId(null)
    setPointCloudVisible(false)
  }, [selectSegment, selectRobot])

  /* ── 点云开关 ── */
  const handleOpenPointCloud = useCallback(() => {
    setPointCloudVisible(true)
  }, [])

  const handleClosePointCloud = useCallback(() => {
    setPointCloudVisible(false)
  }, [])

  /* ── URL 参数:支持 ?segment=B3 和 ?alert=AL-301 两种入口 ── */
  useEffect(() => {
    if (!data) return
    const alertParam = searchParams.get('alert')
    const segParam = searchParams.get('segment')

    let consumed = false
    if (alertParam) {
      const exists = data.alerts.some((a) => a.id === alertParam)
      if (exists) {
        handleAlertClick(alertParam)
        consumed = true
      }
    } else if (segParam) {
      const exists = data.segments.some((s) => s.id === segParam)
      if (exists) {
        // URL 进入时直接选中,不走 toggle 语义
        selectSegment(segParam)
        const segAlerts = data.alerts
          .filter((a) => a.segmentId === segParam && a.status !== 'closed')
          .sort((a, b) => {
            const rank = { critical: 3, warning: 2, info: 1 } as const
            return rank[b.severity] - rank[a.severity]
          })
        if (segAlerts.length > 0) {
          const chain = buildPropagationChain(segAlerts[0].id, data.alerts, data.segments, data.nodes)
          setActiveChain(chain)
          setFocusAlertId(segAlerts[0].id)
          setFocusKey((k) => k + 1)
        }
        consumed = true
      }
    }

    if (consumed) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.delete('alert')
        next.delete('segment')
        return next
      }, { replace: true })
    }
    // 仅在 data 首次到位或 URL 改变时执行
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, searchParams])

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
  const activeAlerts = selectedSegment ? data.alerts.filter((a) => a.segmentId === selectedSegment) : []
  const activeRobot = data.robots.find((r) => r.id === selectedRobot) ?? null

  // 点云只在 (区段已选中) 且 (用户主动开启) 时显示
  const showPointCloud = activeSeg !== null && pointCloudVisible

  return (
    <div className="flex h-[calc(100vh-148px)] flex-col gap-4 overflow-hidden">
      <div className="flex min-h-0 flex-1 gap-4">
        {/* Left: Map + Point cloud */}
        <div className="flex min-w-0 flex-[7] flex-col gap-3">
          <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/8 bg-slate-950/40 p-3">
            <PipelineMap
              nodes={data.nodes}
              segments={data.segments}
              alerts={data.alerts}
              robots={data.robots}
              selectedSegment={selectedSegment}
              selectedRobot={selectedRobot}
              propagationChain={activeChain}
              onSelectSegment={handleSegmentSelect}
              onSelectRobot={selectRobot}
              onSelectAlert={handleAlertClick}
              onDeselect={handleDeselect}
            />
          </div>
          {showPointCloud && activeSeg && (
            <div className="relative shrink-0">
              <button
                onClick={handleClosePointCloud}
                className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-slate-900/80 text-slate-400 transition hover:border-white/20 hover:text-white"
                title="关闭三维剖面视图"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <PointCloudView
                key={activeSeg.id}
                segment={activeSeg}
                sensors={activeSensors}
                alerts={activeAlerts}
                focusAlertId={focusAlertId ? `${focusAlertId}__${focusKey}` : null}
              />
            </div>
          )}
        </div>

        {/* Right: Info panel */}
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
              propagationChain={activeChain}
              pointCloudVisible={pointCloudVisible}
              onAlertClick={handleAlertClick}
              onOpenPointCloud={handleOpenPointCloud}
              onClosePointCloud={handleClosePointCloud}
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
                <div className="mt-2 text-xs text-slate-600">
                  点击告警点可查看拓扑传播链
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
