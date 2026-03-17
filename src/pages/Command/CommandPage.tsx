import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { BottomControlDock } from './BottomControlDock'
import { CenterVideoStage } from './CenterVideoStage'
import { CommandHeaderBar } from './CommandHeaderBar'
import { RightCommandRail } from './RightCommandRail'
import { VoiceOverlay } from './VoiceOverlay'
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
  const [voiceOpen, setVoiceOpen] = useState(false)

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
    setDockState((c) => (c ? { ...c, driveMode: mode } : c))
  }

  const toggleControl = (key: 'lightOn' | 'stabilizationOn' | 'recording') => {
    setDockState((c) => (c ? { ...c, [key]: !c[key] } : c))
  }

  const triggerAction = (label: string) => {
    if (label === '暂停巡检') {
      setLiveData((c) => {
        if (!c) return c
        const isPaused = c.mission.status === 'paused'
        return {
          ...c,
          mission: { ...c.mission, status: isPaused ? 'running' : 'paused' },
        }
      })
      return
    }

    if (label === '急停') {
      setLiveData((c) => {
        if (!c) return c
        const isStopped = c.mission.status === 'attention'
        return {
          ...c,
          mission: { ...c.mission, status: isStopped ? 'running' : 'attention' },
        }
      })
      return
    }

    window.alert(`已触发控制动作：${label}`)
  }

  const handleVoiceCommand = (cmd: string) => {
    window.alert(`语音指令已发送：${cmd}`)
  }

  return (
    <section className="flex h-[calc(100vh-148px)] min-h-0 flex-col gap-2.5 overflow-hidden">
      {/* A — Slim header strip */}
      <CommandHeaderBar
        meta={merged.meta}
        mission={merged.mission}
        robot={merged.robot}
      />

      {/* B — Main stage: video + context sidebar */}
      <div className="flex min-h-0 flex-1 gap-2.5">
        {/* B1 — Video area (relative container for voice overlay) */}
        <div className="relative min-h-0 min-w-0 flex-1">
          <CenterVideoStage
            video={merged.primaryVideo}
            mission={merged.mission}
            control={currentControl}
          />

          {/* Voice overlay — appears on top of video */}
          {voiceOpen && (
            <VoiceOverlay
              voice={merged.voice}
              onClose={() => setVoiceOpen(false)}
              onCommand={handleVoiceCommand}
            />
          )}
        </div>

        {/* B2 — Context sidebar */}
        <div className="w-[280px] shrink-0">
          <RightCommandRail
            robot={merged.robot}
            mission={merged.mission}
            sensors={merged.sensors}
            auxViews={merged.auxViews}
            events={merged.events}
          />
        </div>
      </div>

      {/* C — Bottom control dock */}
      <BottomControlDock
        control={currentControl}
        missionStatus={merged.mission.status}
        voiceActive={voiceOpen}
        onModeChange={updateMode}
        onToggle={toggleControl}
        onAction={triggerAction}
        onVoice={() => setVoiceOpen(!voiceOpen)}
      />
    </section>
  )
}
