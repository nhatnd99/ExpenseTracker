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
      className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] shadow-2xs transition-colors hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)] cursor-pointer"
    >
      {theme === 'dark' ? (
        <Sun className="h-4 w-4 text-[var(--color-warning)] transition-transform hover:rotate-45" />
      ) : (
        <Moon className="h-4 w-4 text-[var(--color-text-secondary)] transition-transform" />
      )}
    </button>
  )
}
