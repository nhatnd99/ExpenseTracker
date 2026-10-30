import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LayoutDashboard, SlidersHorizontal, Receipt, BarChart3 } from 'lucide-react'

export function BottomNavigation() {
  const { t } = useTranslation()

  const navItems = [
    { to: '/', label: t('nav.dashboard'), icon: LayoutDashboard },
    { to: '/plan', label: t('nav.plan'), icon: SlidersHorizontal },
    { to: '/transactions', label: t('nav.expenses'), icon: Receipt },
    { to: '/reports', label: t('nav.reports'), icon: BarChart3 },
  ] as const

  return (
    <nav
      className="sticky bottom-0 z-20 border-t border-[var(--color-border)] bg-[var(--color-bg-surface)]/95 backdrop-blur-md transition-colors duration-200"
      aria-label="Main navigation"
    >
      <div className="mx-auto max-w-lg">
        <ul className="flex items-stretch">
          {navItems.map(({ to, label, icon: Icon }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center py-2.5 text-center transition-all touch-target w-full ${
                    isActive
                      ? 'text-[var(--color-primary)] font-bold'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-xl transition-all ${
                        isActive
                          ? 'bg-[var(--color-primary-soft)] scale-105'
                          : 'bg-transparent'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="mt-0.5 text-[10px] tracking-tight">{label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}
