import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n/config'
import { App } from './app/App'
import { registerSW } from 'virtual:pwa-register'

// Register service worker with update prompt behavior
// On update, we notify the user rather than auto-refreshing to prevent data loss
const updateSW = registerSW({
  onNeedRefresh() {
    // Dispatch a custom event so the UI can show an update notification
    window.dispatchEvent(new CustomEvent('pwa-update-available', { detail: { updateSW } }))
  },
  onOfflineReady() {
    console.info('[PWA] App ready for offline use.')
  },
})

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element not found')

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
