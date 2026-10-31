/**
 * reportService.ts
 * Data orchestration layer for custom payday cycle monthly reports.
 */
import { monthlyPlanRepository } from '@/repositories/monthlyPlanRepository'
import { allocationRepository } from '@/repositories/allocationRepository'
import { transactionRepository } from '@/repositories/transactionRepository'
import { categoryRepository } from '@/repositories/categoryRepository'
import { calculateTotalBudget } from '@/domain/budgetCalculator'
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

  // Group spent by date
  const dailySpentMap: Record<DateString, number> = {}
  for (const date of cycle.days) {
    dailySpentMap[date] = 0
  }
  for (const tx of transactions) {
    dailySpentMap[tx.date] = (dailySpentMap[tx.date] || 0) + tx.amountVnd
  }

  // Compute daily items
  const nowStr = todayStr || new Date().toISOString().slice(0, 10)
  const dailyItems: DayReportItem[] = cycle.days.map((date) => {
    const dayNumber = parseInt(date.slice(8), 10)
    const spentVnd = dailySpentMap[date] || 0
    const balanceVnd = progress.dailyBudgetVnd - spentVnd
    const isToday = date === nowStr
    const isFuture = date > nowStr

    return {
      date,
      dayNumber,
      spentVnd,
      balanceVnd,
      isToday,
      isFuture,
    }
  })

  // Category breakdown for this cycle
  const catMap = new Map<string, number>()
  for (const tx of transactions) {
    catMap.set(tx.categoryId, (catMap.get(tx.categoryId) || 0) + tx.amountVnd)
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
  }
}

