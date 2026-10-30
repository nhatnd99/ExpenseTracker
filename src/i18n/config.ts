import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import enTranslation from '@/locales/en/translation.json'
import viTranslation from '@/locales/vi/translation.json'

const savedLanguage = localStorage.getItem('i18nextLng') || 'en'
const initialLanguage = savedLanguage.startsWith('vi') ? 'vi' : 'en'

void i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslation,
      },
      vi: {
        translation: viTranslation,
      },
    },
    lng: initialLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
  })

// Save language preference whenever it changes
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('i18nextLng', lng)
})

export default i18n

