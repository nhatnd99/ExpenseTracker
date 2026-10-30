import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { MonthlyPlanPage } from '@/features/monthly-plans/MonthlyPlanPage'
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
        element: <DashboardPage />,
      },
      {
        path: 'plan',
        element: <MonthlyPlanPage />,
      },
      {
        path: 'transactions',
        element: <TransactionsPage />,
      },
      {
        path: 'reports',
        element: <ReportsPage />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])
