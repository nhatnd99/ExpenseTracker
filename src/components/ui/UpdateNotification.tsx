import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Sparkles } from 'lucide-react'

interface UpdateEvent extends CustomEvent {
  detail: { updateSW: (reloadPage?: boolean) => Promise<void> }
}

export function UpdateNotification() {
  const { t } = useTranslation()
  const [updateFn, setUpdateFn] = useState<(() => Promise<void>) | null>(null)

  useEffect(() => {
    function handleUpdate(e: Event) {
      const event = e as UpdateEvent
      setUpdateFn(() => () => event.detail.updateSW(true))
    }
    window.addEventListener('pwa-update-available', handleUpdate)
    return () => window.removeEventListener('pwa-update-available', handleUpdate)
  }, [])

  const dismiss = useCallback(() => setUpdateFn(null), [])

  if (!updateFn) return null

  return (
    <div
      role="alert"
      className="fixed bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] left-4 right-4 z-50 rounded-3xl bg-slate-900 p-4 text-white shadow-2xl border border-slate-700/60 dark:bg-slate-900 dark:border-slate-750"
    >
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-cyan-400" />
        <p className="text-xs font-semibold">{t('pwa.updateAvailable')}</p>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => void updateFn()}
          className="flex-1 rounded-xl bg-cyan-500 px-3 py-2 text-xs font-bold text-slate-950 transition-colors active:bg-cyan-400 touch-target cursor-pointer"
        >
          {t('pwa.updateNow')}
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-300 transition-colors active:bg-slate-700 touch-target cursor-pointer"
        >
          {t('pwa.later')}
        </button>
      </div>
    </div>
  )
}
