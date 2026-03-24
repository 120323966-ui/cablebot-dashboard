import { Outlet } from 'react-router-dom'
import { SideNav } from './SideNav'
import { TopBar } from './TopBar'
import { DashboardProvider } from '@/context/DashboardContext'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'

/** 内部组件：必须在 DashboardProvider 内部才能使用 useKeyboardShortcuts */
function ShellInner() {
  useKeyboardShortcuts()

  return (
    <div className="min-h-screen bg-app text-fg">
      <div className="mx-auto flex max-w-[1800px]">
        <SideNav />
        <main className="min-h-screen flex-1 px-6 py-6 xl:px-8">
          <TopBar />
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export function ShellLayout() {
  return (
    <DashboardProvider>
      <ShellInner />
    </DashboardProvider>
  )
}
