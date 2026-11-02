import { useState, useCallback, useEffect, type ReactNode } from 'react'
import {
  SettingsContext,
  PAYDAY_STORAGE_KEY,
  QUICK_AMOUNTS_STORAGE_KEY,
  QUICK_TEMPLATES_STORAGE_KEY,
  FIXED_BILLS_STORAGE_KEY,
  MONTHLY_INCOME_STORAGE_KEY,
  BUDGET_PLAN_STORAGE_KEY,
  DEFAULT_QUICK_AMOUNTS,
  DEFAULT_QUICK_TEMPLATES,
  DEFAULT_FIXED_BILLS,
  DEFAULT_MONTHLY_INCOME,
} from './settings-context'
import type { QuickTemplate } from '@/types/models'
import type { FixedBillItem } from '@/features/settings/types'
import { formatCompactVnd } from '@/utils/currency'
import { getActiveDailyLimit } from '@/features/monthly-plans/monthlyPlanService'
import { useLocalStorage } from '@/hooks/useLocalStorage'

export function SettingsProvider({ children }: { children: ReactNode }) {
  // 1. PayDay - Persisted via useLocalStorage
  const [payDay, setPayDayState] = useLocalStorage<number>(PAYDAY_STORAGE_KEY, 1)

  const setPayDay = useCallback((newDay: number) => {
    const safeDay = Math.min(28, Math.max(1, Math.floor(newDay)))
    setPayDayState(safeDay)
  }, [setPayDayState])

  // Daily limit is derived from active plan and payday
  const [dailyLimit, setDailyLimit] = useState<number>(0)

  // 2. Quick Amounts - Persisted via useLocalStorage
  const [quickAmounts, setQuickAmountsState] = useLocalStorage<number[]>(
    QUICK_AMOUNTS_STORAGE_KEY,
    DEFAULT_QUICK_AMOUNTS,
    useCallback((val: unknown) => {
      if (Array.isArray(val) && val.length > 0) {
        const valid = val
          .map((v) => Math.floor(Number(v)))
          .filter((v) => Number.isFinite(v) && v > 0)
        if (valid.length > 0) {
          return Array.from(new Set(valid)).sort((a, b) => a - b)
        }
      }
      return DEFAULT_QUICK_AMOUNTS
    }, []),
  )

  const addQuickAmount = useCallback((amount: number): boolean => {
    const clean = Math.floor(amount)
    if (!clean || clean <= 0) return false
    if (quickAmounts.includes(clean)) return false

    const next = [...quickAmounts, clean].sort((a, b) => a - b)
    setQuickAmountsState(next)
    return true
  }, [quickAmounts, setQuickAmountsState])

  const removeQuickAmount = useCallback((amount: number) => {
    setQuickAmountsState((prev) => prev.filter((a) => a !== amount))
  }, [setQuickAmountsState])

  const setQuickAmounts = useCallback((amounts: number[]) => {
    const valid = Array.from(
      new Set(amounts.map((v) => Math.floor(Number(v))).filter((v) => Number.isFinite(v) && v > 0))
    ).sort((a, b) => a - b)
    setQuickAmountsState(valid)
  }, [setQuickAmountsState])

  // 3. Quick Transaction Templates - Persisted via useLocalStorage with migration support
  const [quickTemplates, setQuickTemplatesState] = useLocalStorage<QuickTemplate[]>(
    QUICK_TEMPLATES_STORAGE_KEY,
    () => {
      try {
        if (typeof window !== 'undefined') {
          // Check legacy quick amounts migration if no templates exist
          const legacy = window.localStorage.getItem(QUICK_AMOUNTS_STORAGE_KEY)
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
                return migrated
              }
            }
          }
        }
      } catch {
        // ignore
      }
      return DEFAULT_QUICK_TEMPLATES
    },
  )

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

    setQuickTemplatesState((prev) => [...prev, newTemplate])
    return true
  }, [setQuickTemplatesState])

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
        return next
      })
      return updated
    },
    [setQuickTemplatesState]
  )

  const deleteQuickTemplate = useCallback((id: string) => {
    setQuickTemplatesState((prev) => prev.filter((t) => t.id !== id))
  }, [setQuickTemplatesState])

  const setQuickTemplates = useCallback((templates: QuickTemplate[]) => {
    setQuickTemplatesState(templates)
  }, [setQuickTemplatesState])

  // 4. Fixed Bills - Persisted via useLocalStorage
  const [fixedBills, setFixedBillsState] = useLocalStorage<FixedBillItem[]>(
    FIXED_BILLS_STORAGE_KEY,
    DEFAULT_FIXED_BILLS,
  )

  const setFixedBills = useCallback((bills: FixedBillItem[]) => {
    setFixedBillsState(bills)
  }, [setFixedBillsState])

  // 5. Monthly Income & Budget Plan - Persisted via useLocalStorage
  const [monthlyIncome, setMonthlyIncome] = useLocalStorage<number>(
    MONTHLY_INCOME_STORAGE_KEY,
    DEFAULT_MONTHLY_INCOME,
  )

  const [budgetPlan, setBudgetPlan] = useLocalStorage<unknown>(
    BUDGET_PLAN_STORAGE_KEY,
    null,
  )

  // Daily limit calculation
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
        monthlyIncome,
        setMonthlyIncome,
        budgetPlan,
        setBudgetPlan,
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}
