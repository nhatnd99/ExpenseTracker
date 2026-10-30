import { Outlet, useNavigation } from 'react-router-dom'
import { AppHeader } from './AppHeader'
import { BottomNavigation } from './BottomNavigation'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export function AppLayout() {
  const navigation = useNavigation()
  const isLoading = navigation.state === 'loading'

  return (
    <div className="h-dvh w-screen max-w-full flex flex-col overflow-hidden bg-[var(--color-bg-app)] text-[var(--color-text-primary)] transition-colors duration-200">
      {/* Fixed Header */}
      <AppHeader />

      {/* Scrollable Main Content Area */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden w-full max-w-full overscroll-y-contain">
        {isLoading ? (
          <div className="flex h-full items-center justify-center p-8">
            <LoadingSpinner />
          </div>
        ) : (
          <Outlet />
        )}
      </main>

      {/* Fixed Footer / Bottom Navigation */}
      <BottomNavigation />
    </div>
  )
}
