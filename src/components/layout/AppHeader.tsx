import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { WalletCards } from 'lucide-react'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'

export function AppHeader() {
  const { pathname } = useLocation()
  const { t } = useTranslation()

  const getTitle = () => {
    switch (pathname) {
      case '/':
      case '/transactions':
        return t('app.transactions')
      case '/dashboard':
        return t('app.dashboard')
      case '/reports':
        return t('app.reports')
      case '/settings':
      case '/plan':
        return t('app.settings')
      default:
        return t('app.title')
    }
  }

  return (
    <header
      className="shrink-0 z-20 w-full border-b border-[var(--color-border)] bg-[var(--color-bg-surface)]/90 backdrop-blur-md transition-colors duration-200 pt-[env(safe-area-inset-top,0px)]"
    >
      <div className="mx-auto flex h-16 max-w-lg items-center justify-between px-4">
        {/* Main Logo & Title */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 text-white shadow-md shadow-blue-500/25 ring-2 ring-white/10 shrink-0 transition-transform active:scale-95">
            <WalletCards className="h-5.5 w-5.5 sm:h-6 sm:w-6 stroke-[2.25]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-extrabold text-[var(--color-text-primary)] leading-tight truncate tracking-tight">
              {getTitle()}
            </h1>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] block truncate">
              {t('app.title', 'Quản Lý Chi Tiêu')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
