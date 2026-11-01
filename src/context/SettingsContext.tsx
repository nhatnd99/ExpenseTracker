import { useState, useCallback, useEffect, type ReactNode } from 'react'
import { SettingsContext } from './settings-context'
import { getActiveDailyLimit } from '@/features/monthly-plans/monthlyPlanService'

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

  const [dailyLimit, setDailyLimit] = useState<number>(0)

  const refreshDailyLimit = useCallback(async (): Promise<number> => {
    try {
      const limit = await getActiveDailyLimit(payDay)
      setDailyLimit(limit)
      return limit
    } catch {
      return 0
    }
  }, [payDay])

  useEffect(() => {
    let active = true
    getActiveDailyLimit(payDay)
      .then((limit) => {
        if (active) setDailyLimit(limit)
      })
      .catch(() => {
        if (active) setDailyLimit(0)
      })

    return () => {
      active = false
    }
  }, [payDay])

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
    <SettingsContext.Provider value={{ payDay, setPayDay, dailyLimit, refreshDailyLimit }}>
      {children}
    </SettingsContext.Provider>
  )
}
