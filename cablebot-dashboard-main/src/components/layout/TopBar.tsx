import { Bell, Keyboard, Search, ShieldCheck, Volume2, VolumeX, Wifi } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { isVoiceMuted, setVoiceMuted } from '@/utils/voiceAudio'
import { useDashboardContext } from '@/context/useDashboardContext'
import { AlertToast } from '@/components/ui/AlertToast'
import { SHORTCUT_LIST } from '@/hooks/useKeyboardShortcuts'
import type { ControlAuthority } from '@/context/dashboardContextCore'

function NetworkStatusBadge({
  network,
}: {
  network?: { status: 'ok' | 'degraded'; latencyMs: number }
}) {
  const latency = network?.latencyMs ?? 0
  const degraded = !network || network.status === 'degraded' || latency > 220
  const label = !network
    ? '通信未知'
    : degraded
      ? `高延迟 ${latency}ms`
      : `通信正常 ${latency}ms`

  return (
    <div className="hidden items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-2 text-sm text-slate-300 xl:flex">
      <span className={`h-2 w-2 rounded-full ${degraded ? 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.45)]' : 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.45)]'}`} />
      <Wifi className={`h-4 w-4 ${degraded ? 'text-amber-300' : 'text-emerald-300'}`} />
      {label}
    </div>
  )
}

function ControlAuthorityBadge({ authority }: { authority: ControlAuthority }) {
  const config: Record<ControlAuthority, { label: string; dot: string; text: string }> = {
    auto: { label: '自动', dot: 'bg-emerald-400', text: 'text-emerald-200' },
    'semi-auto': { label: '半自动', dot: 'bg-cyan-400', text: 'text-cyan-200' },
    manual: { label: '人工接管', dot: 'bg-amber-400', text: 'text-amber-200' },
    emergency: { label: '已急停', dot: 'bg-rose-400', text: 'text-rose-200' },
  }
  const item = config[authority]

  return (
    <div className="hidden items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-2 text-sm text-slate-300 xl:flex">
      <span className={`h-2 w-2 rounded-full ${item.dot}`} />
      <ShieldCheck className={`h-4 w-4 ${item.text}`} />
      <span className={item.text}>{item.label}</span>
    </div>
  )
}

export function TopBar() {
  const navigate = useNavigate()
  const [time, setTime] = useState(new Date())
  const [muted, setMuted] = useState(isVoiceMuted())
  const [showShortcuts, setShowShortcuts] = useState(false)
  const shortcutRef = useRef<HTMLDivElement>(null)
  const { data, alerts, latestNewAlert, dismissLatestAlert, controlAuthority } = useDashboardContext()

  /* ── 待处置告警计数（角标用） ── */
  const pendingCount = alerts.filter((a) => a.status === 'new').length

  useEffect(() => {
    const timer = window.setInterval(() => setTime(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  /* ── 监听快捷键 M 触发的静音变更 ── */
  useEffect(() => {
    const sync = () => setMuted(isVoiceMuted())
    window.addEventListener('voice-mute-changed', sync)
    return () => window.removeEventListener('voice-mute-changed', sync)
  }, [])

  /* ── 点击外部关闭快捷键面板 ── */
  useEffect(() => {
    if (!showShortcuts) return
    const handleClick = (e: MouseEvent) => {
      if (shortcutRef.current && !shortcutRef.current.contains(e.target as Node)) {
        setShowShortcuts(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showShortcuts])

  const toggleMute = () => {
    const next = !muted
    setMuted(next)
    setVoiceMuted(next)
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <div className="panel-eyebrow">城市地下电缆排管巡检机器人</div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-white">PC 监控端</h1>
        </div>

        <div className="flex items-center gap-3">
          <label className="hidden items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-2 text-sm text-slate-300 lg:flex">
            <Search className="h-4 w-4" />
            <input
              className="w-52 bg-transparent outline-none placeholder:text-slate-500"
              placeholder="搜索区段 / 设备 / 告警"
            />
          </label>
          <NetworkStatusBadge network={data?.meta.network} />
          <ControlAuthorityBadge authority={controlAuthority} />

          {/* 语音播报静音开关 */}
          <button
            onClick={toggleMute}
            title={muted ? '语音播报已关闭，点击开启' : '语音播报已开启，点击关闭'}
            className={`rounded-2xl border p-3 transition ${
              muted
                ? 'border-white/8 bg-white/[0.04] text-slate-500 hover:bg-white/[0.07] hover:text-slate-300'
                : 'border-cyan-400/20 bg-cyan-400/8 text-cyan-300 hover:bg-cyan-400/15'
            }`}
          >
            {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>

          {/* 快捷键帮助 */}
          <div className="relative" ref={shortcutRef}>
            <button
              onClick={() => setShowShortcuts((v) => !v)}
              title="键盘快捷键"
              className={`rounded-2xl border p-3 transition ${
                showShortcuts
                  ? 'border-cyan-400/20 bg-cyan-400/8 text-cyan-300'
                  : 'border-white/8 bg-white/[0.04] text-slate-300 hover:bg-white/[0.07]'
              }`}
            >
              <Keyboard className="h-5 w-5" />
            </button>

            {showShortcuts && (
              <div className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/95 shadow-2xl shadow-black/40 backdrop-blur-xl">
                <div className="border-b border-white/6 px-4 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">键盘快捷键</div>
                </div>
                <div className="px-4 py-3 space-y-2.5">
                  {SHORTCUT_LIST.map((s) => (
                    <div key={s.key} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <kbd className="inline-flex min-w-[28px] items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] px-2 py-1 text-[11px] font-semibold text-slate-200">
                          {s.key}
                        </kbd>
                        <span className="text-xs text-slate-300">{s.label}</span>
                      </div>
                      <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] ${
                        s.scope === '全局'
                          ? 'bg-cyan-400/10 text-cyan-400'
                          : 'bg-amber-400/10 text-amber-400'
                      }`}>
                        {s.scope}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-white/6 px-4 py-2.5">
                  <div className="text-[11px] text-slate-500">输入框聚焦时快捷键自动禁用</div>
                </div>
              </div>
            )}
          </div>

          {/* 告警铃铛 + 角标 */}
          <button
            onClick={() => navigate('/alerts')}
            title={pendingCount > 0 ? `${pendingCount} 条待处置告警` : '暂无待处置告警'}
            className="relative rounded-2xl border border-white/8 bg-white/[0.04] p-3 text-slate-300 transition hover:bg-white/[0.07]"
          >
            <Bell className="h-5 w-5" />
            {pendingCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-lg shadow-rose-500/30">
                {pendingCount > 99 ? '99+' : pendingCount}
              </span>
            )}
          </button>

          <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-2 text-right">
            <div className="text-sm font-medium text-white">{time.toLocaleTimeString('zh-CN')}</div>
            <div className="mt-0.5 flex items-center justify-end gap-1 text-xs text-slate-400">
              <Wifi className="h-3.5 w-3.5 text-cyan-300" />
              {time.toLocaleDateString('zh-CN')}
            </div>
          </div>
        </div>
      </div>

      {/* ── 全局 Toast 通知层 ── */}
      {latestNewAlert && (
        <div className="pointer-events-none fixed right-6 top-6 z-50">
          <AlertToast
            alert={latestNewAlert}
            onDismiss={dismissLatestAlert}
          />
        </div>
      )}
    </>
  )
}
