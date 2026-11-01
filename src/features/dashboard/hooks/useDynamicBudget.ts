/**
 * useDynamicBudget.ts
 * Custom hook implementing the Dynamic Safe-to-Spend algorithm for the Dashboard.
 * Recalculates today's spending allowance based on actual spending and remaining cycle days.
 */
import { useMemo } from 'react'
import type { PaydayCycle } from '@/features/reports/paydayCycle'
import type { Transaction, DateString } from '@/types/models'
import { getTodayString } from '@/services/dateService'
import {
  calculateDynamicBudget,
  calculatePassedDays,
  calculateSpentToDate,
  calculateExtraIncome,
  type DynamicBudgetResult,
} from '@/domain/dynamicBudgetCalculator'

export interface UseDynamicBudgetParams {
  cycle?: PaydayCycle | null
  baseBudget?: number
  transactions?: Transaction[]
  todayStr?: DateString
}

export function useDynamicBudget({
  cycle,
  baseBudget = 0,
  transactions = [],
  todayStr,
}: UseDynamicBudgetParams): DynamicBudgetResult {
  const activeToday = todayStr ?? getTodayString()

  return useMemo(() => {
    if (!cycle || cycle.totalDays <= 0) {
      return {
        totalDays: 0,
        passedDays: 0,
        remainingDays: 1,
        baseBudget: 0,
        totalExtraIncome: 0,
        spentToDate: 0,
        remainingBudget: 0,
        todayLimit: 0,
        idealSpent: 0,
        paceBalance: 0,
        isOnTrack: true,
      }
    }

    const totalDays = cycle.totalDays
    const passedDays = calculatePassedDays(cycle, activeToday)
    const spentToDate = calculateSpentToDate(transactions, cycle.startDate, activeToday)
    const totalExtraIncome = calculateExtraIncome(transactions, cycle.startDate)

    return calculateDynamicBudget({
      totalDays,
      passedDays,
      baseBudget,
      spentToDate,
      totalExtraIncome,
    })
  }, [cycle, baseBudget, transactions, activeToday])
}

