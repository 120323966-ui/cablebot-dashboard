import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { BottomControlDock } from './BottomControlDock'
import { CenterVideoStage } from './CenterVideoStage'
import { CommandHeaderBar } from './CommandHeaderBar'
import { LeftStatusRail } from './LeftStatusRail'
import { RightCommandRail } from './RightCommandRail'
import { useCommandCenter } from '@/hooks/useCommandCenter'
import {
  applyCommandRealtime,
  useRealtimeCommandCenter,
} from '@/hooks/useRealtimeCommandCenter'
import type {
  CommandCenterResponse,
  CommandMode,
  CommandRealtimeMessage,
  ControlState,
} from '@/types/command'

export function CommandPage() {
  const { data, loading, error } = useCommandCenter()
  const [liveData, setLiveData] = useState<CommandCenterResponse | null>(null)
  const [dockState, setDockState] = useState<ControlState | null>(null)

  const merged = useMemo(() => liveData ?? data, [data, liveData])

  const handleMessage = useCallback((message: CommandRealtimeMessage) => {
    setLiveData((current) => {
      if (!current) return current
      return applyCommandRealtime(current, message)
    })
  }, [])

  useEffect(() => {
    if (data && !liveData) setLiveData(data)
  }, [data, liveData])

  useEffect(() => {
    if (data && !dockState) setDockState(data.control)
  }, [data, dockState])

  useRealtimeCommandCenter(merged, handleMessage)

  if (loading) {
    return <div className="panel-card h-[calc(100vh-148px)] animate-pulse bg-white/[0.03]" />
  }

  if (error || !merged) {
    return (
      <div className="panel-card flex h-[calc(100vh-148px)] items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-semibold text-white">实时巡检页数据加载失败</div>
          <p className="mt-3 text-sm text-slate-400">{error ?? '未知错误'}</p>
          <Button className="mt-6" onClick={() => window.location.reload()}>
            重新加载
          </Button>
        </div>
      </div>
    )
  }

  const currentControl = dockState ?? merged.control

  const updateMode = (mode: CommandMode) => {
    setDockState((current) =>
      current
        ? {
            ...current,
            driveMode: mode,
          }
        : current,
    )
  }

  const toggleControl = (key: 'lightOn' | 'stabilizationOn' | 'recording') => {
    setDockState((current) =>
      current
        ? {
            ...current,
            [key]: !current[key],
          }
        : current,
    )
  }

  const triggerAction = (label: string) => {
    window.alert(`已触发控制动作：${label}`)
  }

  return (
    <section className="grid h-[calc(100vh-148px)] min-h-0 grid-cols-[260px_minmax(0,1fr)_340px] grid-rows-[auto_minmax(0,1fr)_104px] gap-3 overflow-hidden">
      <div className="col-span-3 min-h-0">
        <CommandHeaderBar
          meta={merged.meta}
          mission={merged.mission}
          robot={merged.robot}
        />
      </div>

      <div className="min-h-0 overflow-hidden">
        <LeftStatusRail
          mission={merged.mission}
          robot={merged.robot}
          sensors={merged.sensors}
        />
      </div>

      <div className="min-h-0 overflow-hidden">
        <CenterVideoStage
          video={merged.primaryVideo}
          mission={merged.mission}
          control={currentControl}
        />
      </div>

      <div className="min-h-0 overflow-hidden">
        <RightCommandRail
          auxViews={merged.auxViews}
          events={merged.events}
          voice={merged.voice}
        />
      </div>

      <div className="col-span-3 row-start-3 min-h-0">
        <BottomControlDock
          control={currentControl}
          onModeChange={updateMode}
          onToggle={toggleControl}
          onAction={triggerAction}
        />
      </div>
    </section>
  )
}