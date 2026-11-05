/**
 * reportService.ts
 * Data orchestration layer for custom payday cycle monthly reports.
 * Implements 3-state time logic (Past, Today, Future) and dynamic Safe-to-Spend.
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
} from '@/domain/dynamicBudgetCalculator'
import { parseDateString } from '@/services/dateService'
import { isBefore, isSameDay, isAfter } from 'date-fns'
import { getPaydayCycle, computeCycleProgress, type PaydayCycle, type CycleBudgetProgress } from './paydayCycle'
import type { MonthId, DateString } from '@/types/models'
import type { EnrichedTransaction } from '@/features/transactions/transactionService'

export interface DayReportItem {
  date: DateString
  dayNumber: number
  dailyLimitVnd: number
  spentVnd: number
  balanceVnd: number
  isToday: boolean
  isFuture: boolean
  isPast: boolean
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
  totalDailySpent: number
  totalExcludedBills: number
  totalExtraIncome: number
  averageDailySpend: number
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

  // 1. Transaction totals breakdown
  // Total daily expenses spent in cycle (excluding fixed bills and excluding income)
  const totalDailySpent = transactions
    .filter((tx) => tx.type !== 'income' && !tx.isExcludedFromDaily)
    .reduce((sum, tx) => sum + tx.amountVnd, 0)

  // Extra income recorded in cycle
  const totalExtraIncome = transactions
    .filter((tx) => tx.type === 'income')
    .reduce((sum, tx) => sum + tx.amountVnd, 0)

  // Fixed bills recorded in cycle
  const totalExcludedBills = transactions
    .filter((tx) => tx.type !== 'income' && Boolean(tx.isExcludedFromDaily))
    .reduce((sum, tx) => sum + tx.amountVnd, 0)

  // Total expenses across the cycle (including fixed bills, excluding income)
  const totalExpenseVnd = transactions
    .filter((tx) => tx.type !== 'income')
    .reduce((sum, tx) => sum + tx.amountVnd, 0)

  // 2. Fetch monthly plan budget (Daily Expenses budget: cat-expenses)
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

  const nowStr = todayStr || new Date().toISOString().slice(0, 10)
  const todayDateObj = parseDateString(nowStr)
  const baseDailyLimit = cycle.totalDays > 0 ? Math.round(budgetVnd / cycle.totalDays) : 0

  // 3. Compute overall cycle progress against Daily Expenses budget
  const effectiveBudget = budgetVnd + totalExtraIncome
  const progress = computeCycleProgress(effectiveBudget, totalDailySpent, cycle, nowStr)

  // 4. Group daily spent (strictly daily expenses, excluding fixed bills)
  const dailySpentMap: Record<DateString, number> = {}
  for (const date of cycle.days) {
    dailySpentMap[date] = 0
  }
  for (const tx of transactions) {
    if (tx.type !== 'income' && !tx.isExcludedFromDaily) {
      dailySpentMap[tx.date] = (dailySpentMap[tx.date] || 0) + tx.amountVnd
    }
  }

  // 5. Dynamic Safe-to-Spend for Today
  const passedDays = calculatePassedDays(cycle, nowStr)
  const spentToDate = calculateSpentToDate(transactions, cycle.startDate, nowStr)
  const dynamicResult = calculateDynamicBudget({
    totalDays: cycle.totalDays,
    passedDays,
    baseBudget: budgetVnd,
    spentToDate,
    totalExtraIncome,
  })
  const safeToSpend = dynamicResult.todayLimit
  const averageDailySpend = Math.round(spentToDate / Math.max(1, passedDays))

  // 6. Standardized 3-State Time Logic:
  // - Quá khứ (date < today): limit = baseDailyLimit (Hạn mức tĩnh gốc), balance = limit - spentOnDay
  // - Hôm nay (date === today): limit = dynamicSafeToSpend (Hạn mức linh hoạt), balance = limit - spentOnDay
  // - Tương lai (date > today): limit = dynamicSafeToSpend, balance = limit
  const dailyItems: DayReportItem[] = cycle.days.map((date) => {
    const dayNumber = parseInt(date.slice(8), 10)
    const cellDateObj = parseDateString(date)

    const spentVnd = dailySpentMap[date] || 0

    const isPast = isBefore(cellDateObj, todayDateObj)
    const isToday = isSameDay(cellDateObj, todayDateObj)
    const isFuture = isAfter(cellDateObj, todayDateObj)

    let limitVnd: number
    let balanceVnd: number

    if (isPast) {
      limitVnd = baseDailyLimit
      balanceVnd = limitVnd - spentVnd
    } else if (isToday) {
      limitVnd = safeToSpend
      balanceVnd = limitVnd - spentVnd
    } else {
      limitVnd = safeToSpend
      balanceVnd = limitVnd
    }

    return {
      date,
      dayNumber,
      dailyLimitVnd: limitVnd,
      spentVnd,
      balanceVnd,
      isToday,
      isPast,
      isFuture,
    }
  })

  // 7. Category breakdown for this cycle (strictly expenses)
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
        percent: totalExpenseVnd > 0 ? Math.round((catTotal / totalExpenseVnd) * 100) : 0,
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
    totalDailySpent,
    totalExcludedBills,
    totalExtraIncome,
    averageDailySpend,
  }
}
