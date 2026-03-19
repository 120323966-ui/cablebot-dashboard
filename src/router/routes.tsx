import { Navigate, createBrowserRouter } from 'react-router-dom'
import { ShellLayout } from '@/components/layout/ShellLayout'
import { AlertsPage } from '@/pages/Alerts/AlertsPage'
import { CommandPage } from '@/pages/Command/CommandPage'
import { HistoryPage } from '@/pages/History/HistoryPage'
import { HomeOverviewPage } from '@/pages/HomeOverview/HomeOverviewPage'
import { ReportsPage } from '@/pages/Reports/ReportsPage'
import { SpatialPage } from '@/pages/Spatial/SpatialPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <ShellLayout />,
    children: [
      { index: true, element: <Navigate to="/overview" replace /> },
      { path: 'overview', element: <HomeOverviewPage /> },
      { path: 'command', element: <CommandPage /> },
      { path: 'alerts', element: <AlertsPage /> },
      { path: 'spatial', element: <SpatialPage /> },
      { path: 'history', element: <HistoryPage /> },
      { path: 'reports', element: <ReportsPage /> },
    ],
  },
])
