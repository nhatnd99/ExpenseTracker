import { useTranslation } from 'react-i18next'
import { Languages } from 'lucide-react'

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation()

  const currentLang = i18n.resolvedLanguage?.startsWith('vi') ? 'vi' : 'en'

  const toggleLanguage = () => {
    const nextLang = currentLang === 'en' ? 'vi' : 'en'
    void i18n.changeLanguage(nextLang)
  }

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      aria-label={t('language.select')}
      title={currentLang === 'en' ? t('language.switchToVi', 'Chuyển sang Tiếng Việt') : t('language.switchToEn', 'Switch to English')}
      className="flex h-9 items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-2.5 text-xs font-bold text-[var(--color-text-secondary)] shadow-2xs transition-colors hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)] cursor-pointer"
    >
      <Languages className="h-3.5 w-3.5 text-[var(--color-primary)]" />
      <span className="uppercase tracking-wider">{currentLang}</span>
    </button>
  )
}
