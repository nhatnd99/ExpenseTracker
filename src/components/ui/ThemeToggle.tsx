import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/context/useTheme'
import { useTranslation } from 'react-i18next'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const { t } = useTranslation()

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={t('theme.toggleTheme')}
      title={theme === 'dark' ? t('theme.light') : t('theme.dark')}
      className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-xs transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white cursor-pointer"
    >
      {theme === 'dark' ? (
        <Sun className="h-4 w-4 text-amber-400 transition-transform hover:rotate-45" />
      ) : (
        <Moon className="h-4 w-4 text-slate-700 transition-transform" />
      )}
    </button>
  )
}
