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
      title={currentLang === 'en' ? 'Chuyển sang Tiếng Việt' : 'Switch to English'}
      className="flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 shadow-xs transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white cursor-pointer"
    >
      <Languages className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
      <span className="uppercase tracking-wider">{currentLang}</span>
    </button>
  )
}

