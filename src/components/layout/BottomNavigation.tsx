import { NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LayoutDashboard, Receipt, BarChart3, Settings } from 'lucide-react'

export function BottomNavigation() {
  const { t } = useTranslation()
  const { pathname } = useLocation()

  const navItems = [
    { to: '/', label: t('nav.expenses', 'Chi tiêu'), icon: Receipt },
    { to: '/dashboard', label: t('nav.dashboard', 'Tổng quan'), icon: LayoutDashboard },
    { to: '/reports', label: t('nav.reports', 'Báo cáo'), icon: BarChart3 },
    { to: '/settings', label: t('nav.settings', 'Cài đặt'), icon: Settings },
  ] as const

  return (
    <nav
      className="shrink-0 z-20 w-full border-t border-[var(--color-border)] bg-[var(--color-bg-surface)]/95 backdrop-blur-md transition-colors duration-200 pb-[env(safe-area-inset-bottom,0px)]"
      aria-label="Main navigation"
    >
      <div className="mx-auto max-w-lg">
        <ul className="flex items-stretch">
          {navItems.map(({ to, label, icon: Icon }) => {
            const isTabActive =
              to === '/'
                ? pathname === '/' || pathname === '/transactions'
                : pathname.startsWith(to)

            return (
              <li key={to} className="flex-1">
                <NavLink
                  to={to}
                  className={`flex flex-col items-center justify-center pt-2 pb-1 text-center transition-all touch-target w-full ${
                    isTabActive
                      ? 'text-[var(--color-primary)] font-bold'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
                  }`}
                >
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-xl transition-all ${
                      isTabActive
                        ? 'bg-[var(--color-primary-soft)] scale-105'
                        : 'bg-transparent'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="mt-0.5 text-[10px] tracking-tight">{label}</span>
                </NavLink>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}
