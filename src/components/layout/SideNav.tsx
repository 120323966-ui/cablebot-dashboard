import { NavLink } from 'react-router-dom'
import { Activity, AlertTriangle, BarChart3, FileText, LayoutDashboard, Map, Radar } from 'lucide-react'
import { clsx } from 'clsx'

const items = [
  { to: '/overview', label: '首页总览', icon: LayoutDashboard },
  { to: '/command', label: '实时巡检', icon: Radar },
  { to: '/alerts', label: '告警处置', icon: AlertTriangle },
  { to: '/spatial', label: '空间定位 / 3D', icon: Map },
  { to: '/history', label: '历史分析', icon: BarChart3 },
  { to: '/reports', label: '报告生成', icon: FileText },
]

export function SideNav() {
  return (
    <aside className="sticky top-0 flex h-screen w-[272px] flex-col border-r border-white/6 bg-slate-950/75 px-5 py-6 backdrop-blur-xl">
      <div className="flex items-center gap-3 px-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/15 text-cyan-300 shadow-lg shadow-cyan-950/40">
          <Activity className="h-6 w-6" />
        </div>
        <div>
          <div className="panel-eyebrow">Cablebot HMI</div>
          <div className="text-lg font-semibold tracking-tight text-white">巡检监控系统</div>
        </div>
      </div>

      <nav className="mt-10 space-y-2">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                clsx(
                  'group flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition duration-200',
                  isActive
                    ? 'border-cyan-400/25 bg-cyan-400/10 text-white shadow-lg shadow-cyan-950/25'
                    : 'border-transparent text-slate-300 hover:border-white/10 hover:bg-white/5 hover:text-white',
                )
              }
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>

      <div className="mt-auto rounded-3xl border border-white/8 bg-white/[0.03] p-4">
        <div className="panel-eyebrow">多模态交互</div>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          语音指令（V 键唤起）、键盘快捷键、视觉通知三通道协同，告警数据全局同步，覆盖首页、巡检、告警三大核心页面。
        </p>
      </div>
    </aside>
  )
}
