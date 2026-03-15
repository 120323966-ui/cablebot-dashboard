import { Bell, CloudRain, Search, ShieldCheck, Wifi } from 'lucide-react'
import { useEffect, useState } from 'react'

export function TopBar() {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setTime(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  return (
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
        <div className="hidden items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-2 text-sm text-slate-300 xl:flex">
          <CloudRain className="h-4 w-4 text-cyan-300" />
          小雨后巡检
        </div>
        <div className="hidden items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-2 text-sm text-slate-300 xl:flex">
          <ShieldCheck className="h-4 w-4 text-emerald-300" />
          安全策略已启用
        </div>
        <button className="rounded-2xl border border-white/8 bg-white/[0.04] p-3 text-slate-300 hover:bg-white/[0.07]">
          <Bell className="h-5 w-5" />
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
  )
}
