import { Outlet } from 'react-router-dom'
import { SideNav } from './SideNav'
import { TopBar } from './TopBar'
import { DashboardProvider } from '@/context/DashboardContext'

export function ShellLayout() {
  return (
    <DashboardProvider>
      <div className="min-h-screen bg-app text-fg">
        <div className="mx-auto flex max-w-[1800px]">
          <SideNav />
          <main className="min-h-screen flex-1 px-6 py-6 xl:px-8">
            <TopBar />
            <Outlet />
          </main>
        </div>
      </div>
    </DashboardProvider>
  )
}
