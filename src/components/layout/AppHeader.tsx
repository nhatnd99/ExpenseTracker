import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Wallet } from 'lucide-react'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'

export function AppHeader() {
  const { pathname } = useLocation()
  const { t } = useTranslation()

  const getTitle = () => {
    switch (pathname) {
      case '/':
        return t('app.dashboard')
      case '/plan':
        return t('app.plan')
      case '/transactions':
        return t('app.transactions')
      case '/reports':
        return t('app.reports')
      default:
        return t('app.title')
    }
  }

  return (
    <header
      className="sticky top-0 z-20 border-b border-[var(--color-border)] bg-[var(--color-bg-surface)]/90 backdrop-blur-md transition-colors duration-200"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)] shadow-2xs">
            <Wallet className="h-4 w-4" />
          </div>
          <h1 className="text-base font-bold text-[var(--color-text-primary)]">
            {getTitle()}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
