/**
 * dashboardService.ts
 * Business logic for the Dashboard feature.
 * Orchestrates repositories and domain calculators to produce view data.
 */
import { monthlyPlanRepository } from '@/repositories/monthlyPlanRepository'
import { allocationRepository } from '@/repositories/allocationRepository'
import { transactionRepository } from '@/repositories/transactionRepository'
import { categoryRepository } from '@/repositories/categoryRepository'
import { buildMonthlyBudgetSummary, parseMonthId } from '@/domain/budgetCalculator'
import { computeDailyStatuses } from '@/domain/dashboardCalculator'
import type { MonthId, MonthlyBudgetSummary, DailyBudgetStatus } from '@/types/models'
import type { EnrichedTransaction } from '@/features/transactions/transactionService'

export interface DashboardData {
  summary: MonthlyBudgetSummary
  dailyStatuses: DailyBudgetStatus[]
  todayStatus: DailyBudgetStatus | null
  recentTransactions: EnrichedTransaction[]
}

/**
 * Loads all data required to render the dashboard for a given month.
 * Returns null if no monthly plan exists for the specified month.
 */
export async function getDashboardData(month: MonthId): Promise<DashboardData | null> {
  const plan = await monthlyPlanRepository.findByMonth(month)
  if (!plan) return null

  const allocations = await allocationRepository.findByPlanId(plan.id)
  const totalSpentVnd = await transactionRepository.sumByPlanId(plan.id)
  const transactions = await transactionRepository.findByPlanId(plan.id)
  const categories = await categoryRepository.findAll()
  const categoryMap = new Map(categories.map((c) => [c.id, c]))

  // Separate expense allocations from savings/investments if configured
  const expenseAllocations = allocations.filter((a) => a.categoryId === 'cat-expenses')
  const activeAllocations = expenseAllocations.length > 0 ? expenseAllocations : allocations

  const summary = buildMonthlyBudgetSummary(plan, activeAllocations, totalSpentVnd)

  const { year, month: monthNum } = parseMonthId(month)
  const dailyStatuses = computeDailyStatuses(
    summary.totalExpenseBudgetVnd,
    summary.daysInMonth,
    year,
    monthNum,
    transactions,
  )

  const todayNum = new Date().getDate()
  const todayStatus = dailyStatuses[todayNum - 1] ?? null

  const recentTransactions: EnrichedTransaction[] = transactions.slice(0, 5).map((tx) => {
    const cat = categoryMap.get(tx.categoryId)
    return {
      ...tx,
      categoryName: cat?.name ?? 'Expense',
      categoryIcon: cat?.icon ?? '💸',
    }
  })

  return { summary, dailyStatuses, todayStatus, recentTransactions }
}
