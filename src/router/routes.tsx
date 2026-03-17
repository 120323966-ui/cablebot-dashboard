import { Navigate, createBrowserRouter } from 'react-router-dom'
import { ShellLayout } from '@/components/layout/ShellLayout'
import { AlertsPage } from '@/pages/Alerts/AlertsPage'
import { CommandPage } from '@/pages/Command/CommandPage'
import { HomeOverviewPage } from '@/pages/HomeOverview/HomeOverviewPage'
import { PlaceholderPage } from '@/pages/Placeholder/PlaceholderPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <ShellLayout />,
    children: [
      { index: true, element: <Navigate to="/overview" replace /> },
      { path: 'overview', element: <HomeOverviewPage /> },
      { path: 'command', element: <CommandPage /> },
      { path: 'alerts', element: <AlertsPage /> },
      { path: 'spatial', element: <PlaceholderPage kind="spatial" /> },
      { path: 'history', element: <PlaceholderPage kind="history" /> },
      { path: 'reports', element: <PlaceholderPage kind="reports" /> },
    ],
  },
])
