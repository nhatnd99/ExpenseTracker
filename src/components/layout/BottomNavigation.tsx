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
      className="sticky bottom-0 z-20 border-t border-slate-100 bg-white/95 backdrop-blur-md transition-colors dark:border-slate-800 dark:bg-slate-950/90"
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
                      ? 'text-cyan-600 font-bold dark:text-cyan-400'
                      : 'text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-xl transition-all ${
                        isActive
                          ? 'bg-cyan-50 dark:bg-cyan-950/60 scale-105'
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
