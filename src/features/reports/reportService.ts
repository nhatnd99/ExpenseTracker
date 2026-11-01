/**
 * reportService.ts
 * Data orchestration layer for custom payday cycle monthly reports.
 */
import { monthlyPlanRepository } from '@/repositories/monthlyPlanRepository'
import { allocationRepository } from '@/repositories/allocationRepository'
import { transactionRepository } from '@/repositories/transactionRepository'
import { categoryRepository } from '@/repositories/categoryRepository'
import { calculateTotalBudget } from '@/domain/budgetCalculator'
import {
  calculateDynamicBudget,
  calculatePassedDays,
  calculateSpentToDate,
  calculateExtraIncome,
} from '@/domain/dynamicBudgetCalculator'
import { parseDateString } from '@/services/dateService'
import { isBefore, isSameDay, isAfter } from 'date-fns'
import { getPaydayCycle, computeCycleProgress, type PaydayCycle, type CycleBudgetProgress } from './paydayCycle'
import type { MonthId, DateString } from '@/types/models'
import type { EnrichedTransaction } from '@/features/transactions/transactionService'

export interface DayReportItem {
  date: DateString
  dayNumber: number
  spentVnd: number
  balanceVnd: number
  isToday: boolean
  isFuture: boolean
}

export interface CategorySpending {
  categoryId: string
  name: string
  icon: string
  totalVnd: number
  percent: number
}

export interface CycleReportData {
  cycle: PaydayCycle
  progress: CycleBudgetProgress
  dailyItems: DayReportItem[]
  dailySpentMap: Record<DateString, number>
  categoryBreakdown: CategorySpending[]
  transactions: EnrichedTransaction[]
  baseDailyLimit: number
  safeToSpend: number
}

export async function getCycleReportData(
  monthId: MonthId,
  payDay: number = 19,
  todayStr?: DateString,
): Promise<CycleReportData> {
  const cycle = getPaydayCycle(monthId, payDay)

  // Fetch transactions and categories
  const [rawTxs, categories] = await Promise.all([
    transactionRepository.findByDateRange(cycle.startDate, cycle.endDate),
    categoryRepository.findAll(),
  ])

  const categoryMap = new Map(categories.map((c) => [c.id, c]))
  const transactions: EnrichedTransaction[] = rawTxs.map((tx) => {
    const cat = categoryMap.get(tx.categoryId)
    return {
      ...tx,
      categoryName: cat?.name ?? 'Other',
      categoryIcon: cat?.icon ?? '💸',
    }
  })

  // Calculate total spent in cycle
  const totalSpentVnd = transactions.reduce((sum, tx) => sum + tx.amountVnd, 0)

  // Fetch monthly plan budget
  let budgetVnd = 0
  const plan = await monthlyPlanRepository.findByMonth(monthId)
  if (plan && plan.incomeVnd > 0) {
    const allocations = await allocationRepository.findByPlanId(plan.id)
    const expenseAllocations = allocations.filter((a) => a.categoryId === 'cat-expenses')
    const activeAllocations = expenseAllocations.length > 0 ? expenseAllocations : allocations
    if (activeAllocations.length > 0) {
      budgetVnd = calculateTotalBudget(plan.incomeVnd, activeAllocations)
    }
  }

  // Compute progress (On Track / Off Track)
  const progress = computeCycleProgress(budgetVnd, totalSpentVnd, cycle, todayStr)

  // Group spent by date (only daily expenses, excluding fixed bills)
  const dailySpentMap: Record<DateString, number> = {}
  for (const date of cycle.days) {
    dailySpentMap[date] = 0
  }
  for (const tx of transactions) {
    if (tx.type !== 'income' && !tx.isExcludedFromDaily) {
      dailySpentMap[tx.date] = (dailySpentMap[tx.date] || 0) + tx.amountVnd
    }
  }

  // Dynamic Safe-to-Spend calculations
  const nowStr = todayStr || new Date().toISOString().slice(0, 10)
  const todayDateObj = parseDateString(nowStr)
  const baseDailyLimit = cycle.totalDays > 0 ? Math.round(budgetVnd / cycle.totalDays) : 0

  const passedDays = calculatePassedDays(cycle, nowStr)
  const spentToDate = calculateSpentToDate(transactions, cycle.startDate, nowStr)
  const totalExtraIncome = calculateExtraIncome(transactions, cycle.startDate, nowStr)
  const dynamicResult = calculateDynamicBudget({
    totalDays: cycle.totalDays,
    passedDays,
    baseBudget: budgetVnd,
    spentToDate,
    totalExtraIncome,
  })
  const safeToSpend = dynamicResult.todayLimit

  // Compute daily items according to 3-state time logic (past, today, future)
  const dailyItems: DayReportItem[] = cycle.days.map((date) => {
    const dayNumber = parseInt(date.slice(8), 10)
    const cellDateObj = parseDateString(date)

    // 1. Group spent strictly excluding fixed bills (isExcludedFromDaily)
    const spentVnd = dailySpentMap[date] || 0

    const isPast = isBefore(cellDateObj, todayDateObj)
    const isToday = isSameDay(cellDateObj, todayDateObj)
    const isFuture = isAfter(cellDateObj, todayDateObj)

    let balanceVnd: number
    if (isPast) {
      // 2. Render Các ngày trong Quá khứ: Balance = baseDailyLimit - spentOnThisDay
      balanceVnd = baseDailyLimit - spentVnd
    } else if (isToday) {
      // 3. Render Ngày Hôm Nay: Balance = safeToSpend - spentOnThisDay
      balanceVnd = safeToSpend - spentVnd
    } else {
      // 4. Render Các ngày Tương lai: Balance = safeToSpend (Projection)
      balanceVnd = safeToSpend
    }

    return {
      date,
      dayNumber,
      spentVnd,
      balanceVnd,
      isToday,
      isFuture,
    }
  })

  // Category breakdown for this cycle (strictly expenses)
  const catMap = new Map<string, number>()
  for (const tx of transactions) {
    if (tx.type !== 'income') {
      catMap.set(tx.categoryId, (catMap.get(tx.categoryId) || 0) + tx.amountVnd)
    }
  }

  const categoryBreakdown: CategorySpending[] = Array.from(catMap.entries())
    .map(([categoryId, catTotal]) => {
      const cat = categoryMap.get(categoryId)
      return {
        categoryId,
        name: cat?.name ?? 'Other',
        icon: cat?.icon ?? '💸',
        totalVnd: catTotal,
        percent: totalSpentVnd > 0 ? Math.round((catTotal / totalSpentVnd) * 100) : 0,
      }
    })
    .sort((a, b) => b.totalVnd - a.totalVnd)

  return {
    cycle,
    progress,
    dailyItems,
    dailySpentMap,
    categoryBreakdown,
    transactions,
    baseDailyLimit,
    safeToSpend,
  }
}

