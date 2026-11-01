import { useState, useCallback, useEffect, type ReactNode } from 'react'
import {
  SettingsContext,
  PAYDAY_STORAGE_KEY,
  QUICK_AMOUNTS_STORAGE_KEY,
  DEFAULT_QUICK_AMOUNTS,
} from './settings-context'
import { getActiveDailyLimit } from '@/features/monthly-plans/monthlyPlanService'

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

  const [quickAmounts, setQuickAmountsState] = useState<number[]>(() => {
    try {
      const stored = localStorage.getItem(QUICK_AMOUNTS_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) {
          const valid = parsed
            .map((v) => Math.floor(Number(v)))
            .filter((v) => Number.isFinite(v) && v > 0)
          if (valid.length > 0) {
            return Array.from(new Set(valid)).sort((a, b) => a - b)
          }
        }
      }
    } catch {
      // ignore
    }
    return DEFAULT_QUICK_AMOUNTS
  })

  const addQuickAmount = useCallback((amount: number): boolean => {
    const clean = Math.floor(amount)
    if (!clean || clean <= 0) return false
    if (quickAmounts.includes(clean)) return false

    const next = [...quickAmounts, clean].sort((a, b) => a - b)
    setQuickAmountsState(next)
    try {
      localStorage.setItem(QUICK_AMOUNTS_STORAGE_KEY, JSON.stringify(next))
    } catch {
      // ignore
    }
    return true
  }, [quickAmounts])

  const removeQuickAmount = useCallback((amount: number) => {
    setQuickAmountsState((prev) => {
      const next = prev.filter((a) => a !== amount)
      try {
        localStorage.setItem(QUICK_AMOUNTS_STORAGE_KEY, JSON.stringify(next))
      } catch {
        // ignore
      }
      return next
    })
  }, [])

  const setQuickAmounts = useCallback((amounts: number[]) => {
    const valid = Array.from(
      new Set(amounts.map((v) => Math.floor(Number(v))).filter((v) => Number.isFinite(v) && v > 0))
    ).sort((a, b) => a - b)
    setQuickAmountsState(valid)
    try {
      localStorage.setItem(QUICK_AMOUNTS_STORAGE_KEY, JSON.stringify(valid))
    } catch {
      // ignore
    }
  }, [])

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
    <SettingsContext.Provider
      value={{
        payDay,
        setPayDay,
        dailyLimit,
        refreshDailyLimit,
        quickAmounts,
        addQuickAmount,
        removeQuickAmount,
        setQuickAmounts,
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}
