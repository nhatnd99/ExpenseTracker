import { useState, useCallback, useEffect, type ReactNode } from 'react'
import {
  SettingsContext,
  PAYDAY_STORAGE_KEY,
  QUICK_AMOUNTS_STORAGE_KEY,
  QUICK_TEMPLATES_STORAGE_KEY,
  FIXED_BILLS_STORAGE_KEY,
  DEFAULT_QUICK_AMOUNTS,
  DEFAULT_QUICK_TEMPLATES,
  DEFAULT_FIXED_BILLS,
} from './settings-context'
import type { QuickTemplate } from '@/types/models'
import type { FixedBillItem } from '@/features/settings/types'
import { formatCompactVnd } from '@/utils/currency'
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

  // Quick Transaction Templates State with Automatic Migration
  const [quickTemplates, setQuickTemplatesState] = useState<QuickTemplate[]>(() => {
    try {
      const stored = localStorage.getItem(QUICK_TEMPLATES_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) {
          const valid = parsed.filter(
            (item): item is QuickTemplate =>
              typeof item === 'object' &&
              item !== null &&
              typeof item.id === 'string' &&
              typeof item.name === 'string' &&
              typeof item.amount === 'number' &&
              item.amount > 0 &&
              typeof item.categoryId === 'string' &&
              (item.type === 'expense' || item.type === 'income')
          )
          if (valid.length > 0) {
            return valid
          }
        }
      }

      // Migration: Check legacy quick amounts [25000, 30000, 50000]
      const legacy = localStorage.getItem(QUICK_AMOUNTS_STORAGE_KEY)
      if (legacy) {
        const parsedLegacy = JSON.parse(legacy)
        if (Array.isArray(parsedLegacy) && parsedLegacy.length > 0) {
          const migrated: QuickTemplate[] = parsedLegacy
            .filter((n) => typeof n === 'number' && n > 0)
            .map((amt, idx) => ({
              id: `tpl-migrated-${idx}-${amt}`,
              name: `${formatCompactVnd(amt)}`,
              amount: amt,
              categoryId: 'cat-expenses',
              note: '',
              type: 'expense' as const,
            }))

          if (migrated.length > 0) {
            localStorage.setItem(QUICK_TEMPLATES_STORAGE_KEY, JSON.stringify(migrated))
            return migrated
          }
        }
      }
    } catch {
      // ignore
    }
    return DEFAULT_QUICK_TEMPLATES
  })

  const addQuickTemplate = useCallback((templateData: Omit<QuickTemplate, 'id'>): boolean => {
    if (!templateData.name.trim() || templateData.amount <= 0 || !templateData.categoryId) {
      return false
    }

    const newTemplate: QuickTemplate = {
      ...templateData,
      id: `tpl-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: templateData.name.trim(),
      amount: Math.floor(templateData.amount),
      note: templateData.note?.trim() || undefined,
      type: templateData.type || 'expense',
    }

    setQuickTemplatesState((prev) => {
      const next = [...prev, newTemplate]
      try {
        localStorage.setItem(QUICK_TEMPLATES_STORAGE_KEY, JSON.stringify(next))
      } catch {
        // ignore
      }
      return next
    })
    return true
  }, [])

  const updateQuickTemplate = useCallback(
    (id: string, updates: Partial<Omit<QuickTemplate, 'id'>>): boolean => {
      let updated = false
      setQuickTemplatesState((prev) => {
        const next = prev.map((t) => {
          if (t.id === id) {
            updated = true
            return {
              ...t,
              ...updates,
              name: updates.name !== undefined ? updates.name.trim() : t.name,
              amount: updates.amount !== undefined ? Math.floor(updates.amount) : t.amount,
              note: updates.note !== undefined ? updates.note.trim() || undefined : t.note,
            }
          }
          return t
        })
        if (updated) {
          try {
            localStorage.setItem(QUICK_TEMPLATES_STORAGE_KEY, JSON.stringify(next))
          } catch {
            // ignore
          }
        }
        return next
      })
      return updated
    },
    []
  )

  const deleteQuickTemplate = useCallback((id: string) => {
    setQuickTemplatesState((prev) => {
      const next = prev.filter((t) => t.id !== id)
      try {
        localStorage.setItem(QUICK_TEMPLATES_STORAGE_KEY, JSON.stringify(next))
      } catch {
        // ignore
      }
      return next
    })
  }, [])

  const setQuickTemplates = useCallback((templates: QuickTemplate[]) => {
    setQuickTemplatesState(templates)
    try {
      localStorage.setItem(QUICK_TEMPLATES_STORAGE_KEY, JSON.stringify(templates))
    } catch {
      // ignore
    }
  }, [])

  // Fixed Bills Global State
  const [fixedBills, setFixedBillsState] = useState<FixedBillItem[]>(() => {
    try {
      const stored = localStorage.getItem(FIXED_BILLS_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed as FixedBillItem[]
        }
      }
    } catch {
      // ignore
    }
    return DEFAULT_FIXED_BILLS
  })

  const setFixedBills = useCallback((bills: FixedBillItem[]) => {
    setFixedBillsState(bills)
    try {
      localStorage.setItem(FIXED_BILLS_STORAGE_KEY, JSON.stringify(bills))
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
        quickTemplates,
        addQuickTemplate,
        updateQuickTemplate,
        deleteQuickTemplate,
        setQuickTemplates,
        fixedBills,
        setFixedBills,
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}
