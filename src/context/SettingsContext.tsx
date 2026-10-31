import { useState, type ReactNode } from 'react'
import { SettingsContext } from './settings-context'

const PAYDAY_STORAGE_KEY = 'expense_tracker_payday'

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [payDay, setPayDayState] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(PAYDAY_STORAGE_KEY)
      if (stored) {
        const val = parseInt(stored, 10)
        if (val >= 1 && val <= 28) return val
      }
    } catch {
      // ignore
    }
    // Default is 1 if not configured by user
    return 1
  })

  const setPayDay = (newDay: number) => {
    const safeDay = Math.min(28, Math.max(1, Math.floor(newDay)))
    setPayDayState(safeDay)
    try {
      localStorage.setItem(PAYDAY_STORAGE_KEY, String(safeDay))
    } catch {
      // ignore
    }
  }

  return (
    <SettingsContext.Provider value={{ payDay, setPayDay }}>
      {children}
    </SettingsContext.Provider>
  )
}

