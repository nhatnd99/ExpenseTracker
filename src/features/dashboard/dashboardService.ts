/**
 * dashboardService.ts
 * Business logic for the Dashboard feature.
 * Orchestrates repositories and domain calculators to produce view data.
 */
import { monthlyPlanRepository } from '@/repositories/monthlyPlanRepository'
import { allocationRepository } from '@/repositories/allocationRepository'
import { transactionRepository } from '@/repositories/transactionRepository'
import { categoryRepository } from '@/repositories/categoryRepository'
import { buildMonthlyBudgetSummary, parseMonthId, calculateDailyBudget } from '@/domain/budgetCalculator'
import {
  computeDailyStatuses,
  calculateSpentToday,
  calculateTotalMonthlySpent,
  calculateTotalExcludedBills,
} from '@/domain/dashboardCalculator'
import { getPaydayCycle, type PaydayCycle } from '@/features/reports/paydayCycle'
import type { MonthId, MonthlyBudgetSummary, DailyBudgetStatus, DateString, Transaction } from '@/types/models'
import type { EnrichedTransaction } from '@/features/transactions/transactionService'
import { getTodayString } from '@/services/dateService'

export interface DashboardData {
  summary: MonthlyBudgetSummary
  dailyStatuses: DailyBudgetStatus[]
  todayStatus: DailyBudgetStatus | null
  recentTransactions: EnrichedTransaction[]
  cycle: PaydayCycle
  totalExcludedBills: number
  transactions: Transaction[]
}

/**
 * Loads all data required to render the dashboard for a given month and custom payday cycle.
 * Returns null if no monthly plan exists for the specified month.
 */
export async function getDashboardData(
  month: MonthId,
  payDay: number = 1,
  todayStr?: DateString,
): Promise<DashboardData | null> {
  const plan = await monthlyPlanRepository.findByMonth(month)
  if (!plan) return null

  const cycle = getPaydayCycle(month, payDay)
  const [transactions, categories] = await Promise.all([
    transactionRepository.findByDateRange(cycle.startDate, cycle.endDate),
    categoryRepository.findAll(),
  ])

  const categoryMap = new Map(categories.map((c) => [c.id, c]))
  const totalSpentVnd = calculateTotalMonthlySpent(transactions)
  const totalExcludedBills = calculateTotalExcludedBills(transactions)

  const allocations = await allocationRepository.findByPlanId(plan.id)

  // Separate expense allocations from savings/investments if configured
  const expenseAllocations = allocations.filter((a) => a.categoryId === 'cat-expenses')
  const activeAllocations = expenseAllocations.length > 0 ? expenseAllocations : allocations

  const baseSummary = buildMonthlyBudgetSummary(plan, activeAllocations, totalSpentVnd)
  const dailyBudgetVnd = calculateDailyBudget(baseSummary.totalExpenseBudgetVnd, cycle.totalDays)
  const summary: MonthlyBudgetSummary = {
    ...baseSummary,
    daysInMonth: cycle.totalDays,
    dailyBudgetVnd,
  }

  const { year, month: monthNum } = parseMonthId(month)
  const dailyStatuses = computeDailyStatuses(
    summary.totalExpenseBudgetVnd,
    cycle.totalDays,
    year,
    monthNum,
    transactions,
  )

  const activeToday = todayStr ?? getTodayString()
  const todaySpent = calculateSpentToday(transactions, activeToday)
  const todayRemaining = dailyBudgetVnd - todaySpent
  const todayStatus: DailyBudgetStatus = {
    date: activeToday,
    dailyBudgetVnd,
    spentVnd: todaySpent,
    remainingVnd: todayRemaining,
    isOverBudget: todaySpent > dailyBudgetVnd,
  }

  // Sort descending by date, then by creation
  const sortedTxs = [...transactions].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date)
    return b.createdAt.localeCompare(a.createdAt)
  })

  const recentTransactions: EnrichedTransaction[] = sortedTxs.slice(0, 5).map((tx) => {
    const cat = categoryMap.get(tx.categoryId)
    return {
      ...tx,
      categoryName: cat?.name ?? 'Expense',
      categoryIcon: cat?.icon ?? '💸',
    }
  })

  return { summary, dailyStatuses, todayStatus, recentTransactions, cycle, totalExcludedBills, transactions }
}
