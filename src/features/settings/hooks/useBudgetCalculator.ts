import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import type { BudgetItemState } from '../types'

export interface UseBudgetCalculatorOptions {
  income: number
  fixedBillsTotalVnd: number
  initialDailyPercent?: number
  initialSavingsPercent?: number
  initialCustomItems?: BudgetItemState[]
}

export function useBudgetCalculator({
  income,
  fixedBillsTotalVnd,
  initialDailyPercent = 50,
  initialSavingsPercent = 20,
  initialCustomItems = [],
}: UseBudgetCalculatorOptions) {
  // Fixed Bills % is strictly calculated: (fixedBillsTotalVnd / income) * 100, rounded to integer
  const fixedBillsPercent = useMemo(() => {
    if (income <= 0 || fixedBillsTotalVnd <= 0) return 0
    return Math.min(100, Math.max(0, Math.round((fixedBillsTotalVnd / income) * 100)))
  }, [income, fixedBillsTotalVnd])

  // Total percentage available for flexible categories (Daily, Savings, Customs)
  const availablePercent = useMemo(() => {
    return Math.max(0, 100 - fixedBillsPercent)
  }, [fixedBillsPercent])

  const [dailyPercent, setDailyPercentState] = useState<number>(initialDailyPercent)
  const [savingsPercent, setSavingsPercentState] = useState<number>(initialSavingsPercent)
  const [customItems, setCustomItems] = useState<BudgetItemState[]>(initialCustomItems)

  // Rebalance helper function that guarantees sum === 100%
  const balanceCategories = useCallback(
    (
      targetDaily: number,
      targetSavings: number,
      targetCustoms: BudgetItemState[],
      fixedPct: number,
      preferredBuffer: 'savings' | 'daily' = 'savings',
    ) => {
      const avail = Math.max(0, 100 - fixedPct)

      // 1. Calculate custom categories sum
      let customs = targetCustoms.map((c) => ({
        ...c,
        percent: Math.max(0, Math.round(Number(c.percent) || 0)),
      }))

      let customsSum = customs.reduce((sum, c) => sum + c.percent, 0)
      if (customsSum > avail) {
        // Truncate custom categories if they exceed available
        let remainingForCustoms = avail
        customs = customs.map((c) => {
          const clamped = Math.min(c.percent, remainingForCustoms)
          remainingForCustoms -= clamped
          return { ...c, percent: clamped }
        })
        customsSum = customs.reduce((sum, c) => sum + c.percent, 0)
      }

      const remForDailyAndSavings = Math.max(0, avail - customsSum)

      let newDaily: number
      let newSavings: number

      if (preferredBuffer === 'savings') {
        // Clamp daily to available remainder
        newDaily = Math.max(0, Math.min(remForDailyAndSavings, Math.round(targetDaily)))
        // Savings absorbs the rest
        newSavings = Math.max(0, remForDailyAndSavings - newDaily)
      } else {
        // Clamp savings to available remainder
        newSavings = Math.max(0, Math.min(remForDailyAndSavings, Math.round(targetSavings)))
        // Daily absorbs the rest
        newDaily = Math.max(0, remForDailyAndSavings - newSavings)
      }

      return {
        daily: newDaily,
        savings: newSavings,
        customs,
      }
    },
    [],
  )

  // Auto re-balance whenever fixedBillsPercent changes
  const prevFixedPctRef = useRef(fixedBillsPercent)
  useEffect(() => {
    if (prevFixedPctRef.current !== fixedBillsPercent) {
      prevFixedPctRef.current = fixedBillsPercent
      const result = balanceCategories(dailyPercent, savingsPercent, customItems, fixedBillsPercent, 'savings')
      setDailyPercentState(result.daily)
      setSavingsPercentState(result.savings)
      setCustomItems(result.customs)
    }
  }, [fixedBillsPercent, dailyPercent, savingsPercent, customItems, balanceCategories])

  // Handler: Change Daily Expenses % (Savings automatically compensates)
  const setDailyPercent = useCallback(
    (newVal: number) => {
      const result = balanceCategories(newVal, savingsPercent, customItems, fixedBillsPercent, 'savings')
      setDailyPercentState(result.daily)
      setSavingsPercentState(result.savings)
      setCustomItems(result.customs)
    },
    [savingsPercent, customItems, fixedBillsPercent, balanceCategories],
  )

  // Handler: Change Savings % (Daily Expenses automatically compensates)
  const setSavingsPercent = useCallback(
    (newVal: number) => {
      const result = balanceCategories(dailyPercent, newVal, customItems, fixedBillsPercent, 'daily')
      setDailyPercentState(result.daily)
      setSavingsPercentState(result.savings)
      setCustomItems(result.customs)
    },
    [dailyPercent, customItems, fixedBillsPercent, balanceCategories],
  )

  // Handler: Change Custom Item % (Savings automatically compensates)
  const setCustomItemPercent = useCallback(
    (id: string, newVal: number) => {
      const updatedCustoms = customItems.map((c) => (c.id === id ? { ...c, percent: Math.max(0, newVal) } : c))
      const result = balanceCategories(dailyPercent, savingsPercent, updatedCustoms, fixedBillsPercent, 'savings')
      setDailyPercentState(result.daily)
      setSavingsPercentState(result.savings)
      setCustomItems(result.customs)
    },
    [customItems, dailyPercent, savingsPercent, fixedBillsPercent, balanceCategories],
  )

  // Handler: Update Custom Item Name
  const updateCustomItemName = useCallback((id: string, name: string) => {
    setCustomItems((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)))
  }, [])

  // Handler: Add Custom Item (starts at 0% or takes a small slice from Savings if available)
  const addCustomItem = useCallback(
    (name: string) => {
      const newItem: BudgetItemState = {
        id: `cat-${Date.now()}`,
        name,
        icon: '🏷️',
        percent: 0,
      }
      setCustomItems((prev) => [...prev, newItem])
    },
    [],
  )

  // Handler: Remove Custom Item (its % is absorbed by Savings)
  const removeCustomItem = useCallback(
    (id: string) => {
      const toRemove = customItems.find((c) => c.id === id)
      const released = toRemove ? toRemove.percent : 0
      const updatedCustoms = customItems.filter((c) => c.id !== id)
      const result = balanceCategories(
        dailyPercent,
        savingsPercent + released,
        updatedCustoms,
        fixedBillsPercent,
        'daily',
      )
      setDailyPercentState(result.daily)
      setSavingsPercentState(result.savings)
      setCustomItems(result.customs)
    },
    [customItems, dailyPercent, savingsPercent, fixedBillsPercent, balanceCategories],
  )

  // Initialize/Set entire state from loaded plan
  const initializeFromPlan = useCallback(
    (daily: number, savings: number, customs: BudgetItemState[], fixedPct: number) => {
      const result = balanceCategories(daily, savings, customs, fixedPct, 'savings')
      setDailyPercentState(result.daily)
      setSavingsPercentState(result.savings)
      setCustomItems(result.customs)
    },
    [balanceCategories],
  )

  // Total allocated percentage
  const totalPercent = useMemo(() => {
    const customSum = customItems.reduce((sum, c) => sum + c.percent, 0)
    return fixedBillsPercent + dailyPercent + savingsPercent + customSum
  }, [fixedBillsPercent, dailyPercent, savingsPercent, customItems])

  const isAllocationValid = totalPercent === 100

  // Real-time calculated amounts in VND
  const dailyExpensesAmount = useMemo(() => {
    return Math.round((income * dailyPercent) / 100)
  }, [income, dailyPercent])

  const savingsAmount = useMemo(() => {
    return Math.round((income * savingsPercent) / 100)
  }, [income, savingsPercent])

  return {
    fixedBillsPercent,
    availablePercent,
    dailyPercent,
    savingsPercent,
    customItems,
    setDailyPercent,
    setSavingsPercent,
    setCustomItemPercent,
    updateCustomItemName,
    addCustomItem,
    removeCustomItem,
    initializeFromPlan,
    totalPercent,
    isAllocationValid,
    dailyExpensesAmount,
    savingsAmount,
  }
}
