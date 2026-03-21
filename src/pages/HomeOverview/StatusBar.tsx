import { Activity, Cloud, Radio, UserRound } from 'lucide-react'
import type { MetaInfo } from '@/types/dashboard'

export function StatusBar({ meta }: { meta: MetaInfo }) {
  const netOk = meta.network.status === 'ok'

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-white/8 bg-white/[0.03] px-5 py-2.5 text-sm backdrop-blur-sm">
      <span className="font-medium tracking-tight text-white">{meta.stationName}</span>

      <span className="h-3.5 w-px bg-white/10" />

      <span className="inline-flex items-center gap-1.5 text-slate-300">
        <UserRound className="h-3.5 w-3.5 text-cyan-400" />
        {meta.operatorName}
        <span className="text-slate-500">·</span>
        {meta.shift}
      </span>

      <span className="inline-flex items-center gap-1.5 text-slate-300">
        <Radio className="h-3.5 w-3.5 text-cyan-400" />
        <span className={netOk ? 'text-emerald-300' : 'text-amber-300'}>
          {netOk ? '网络稳定' : '网络波动'}
        </span>
        <span className="text-slate-500">{meta.network.latencyMs}ms</span>
      </span>

      <span className="inline-flex items-center gap-1.5 text-slate-300">
        <Cloud className="h-3.5 w-3.5 text-cyan-400" />
        {meta.weatherNote}
      </span>

      <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-slate-500">
        <Activity className="h-3 w-3" />
        {new Date(meta.updatedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </span>
    </div>
  )
}
