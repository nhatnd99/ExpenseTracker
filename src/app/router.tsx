import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { TransactionsPage } from '@/features/transactions/TransactionsPage'
import { ReportsPage } from '@/features/reports/ReportsPage'
import { NotFoundPage } from '@/components/ui/NotFoundPage'
import { ErrorPage } from '@/components/ui/ErrorPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: <TransactionsPage />,
      },
      {
        path: 'transactions',
        element: <TransactionsPage />,
      },
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      {
        path: 'reports',
        element: <ReportsPage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
      {
        path: 'plan',
        element: <Navigate to="/settings" replace />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])
