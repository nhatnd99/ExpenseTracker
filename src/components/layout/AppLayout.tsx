import { Outlet, useNavigation } from 'react-router-dom'
import { AppHeader } from './AppHeader'
import { BottomNavigation } from './BottomNavigation'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export function AppLayout() {
  const navigation = useNavigation()
  const isLoading = navigation.state === 'loading'

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <div className="flex flex-col flex-1 pb-[env(safe-area-inset-bottom)]">
        <AppHeader />
        <main className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex h-full items-center justify-center p-8">
              <LoadingSpinner />
            </div>
          ) : (
            <Outlet />
          )}
        </main>
        <BottomNavigation />
      </div>
    </div>
  )
}
