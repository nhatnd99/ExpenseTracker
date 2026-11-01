/**
 * dashboardCalculator.ts
 * Pure functions for computing dashboard statistics.
 * No React, no browser APIs — suitable for unit testing in isolation.
 */
import type { DailyBudgetStatus, DateString, Transaction } from '@/types/models'
import { calculateDailyBudget, evaluateBudgetStatus } from './budgetCalculator'

/**
 * Groups transactions by date and returns totals per day.
 * By default excludes transactions marked as isExcludedFromDaily (fixed bills).
 */
export function groupTransactionsByDate(
  transactions: Transaction[],
  excludeBills: boolean = true,
): Map<DateString, number> {
  const map = new Map<DateString, number>()
  for (const tx of transactions) {
    if (excludeBills && tx.isExcludedFromDaily) continue
    map.set(tx.date, (map.get(tx.date) ?? 0) + tx.amountVnd)
  }
  return map
}

/**
 * Calculates total spent on a specific date, filtering ONLY transactions
 * where isExcludedFromDaily === false (protecting the daily limit from large fixed bills).
 */
export function calculateSpentToday(
  transactions: Transaction[],
  date: DateString,
): number {
  return transactions
    .filter((tx) => tx.date === date && !tx.isExcludedFromDaily)
    .reduce((sum, tx) => sum + tx.amountVnd, 0)
}

/**
 * Calculates total spent across the entire month (includes all expenses and fixed bills).
 */
export function calculateTotalMonthlySpent(
  transactions: Transaction[],
): number {
  return transactions.reduce((sum, tx) => sum + tx.amountVnd, 0)
}

/**
 * Calculates total of all excluded bills and large expenses (isExcludedFromDaily === true).
 */
export function calculateTotalExcludedBills(
  transactions: Transaction[],
): number {
  return transactions
    .filter((tx) => Boolean(tx.isExcludedFromDaily))
    .reduce((sum, tx) => sum + tx.amountVnd, 0)
}

/**
 * Computes daily budget status for each day in a month.
 */
export function computeDailyStatuses(
  monthlyBudgetVnd: number,
  daysInMonth: number,
  year: number,
  month: number,
  transactions: Transaction[],
): DailyBudgetStatus[] {
  const dailyBudgetVnd = calculateDailyBudget(monthlyBudgetVnd, daysInMonth)
  const spendingByDate = groupTransactionsByDate(transactions)

  const statuses: DailyBudgetStatus[] = []
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` as DateString
    const spentVnd = spendingByDate.get(date) ?? 0
    const { remainingVnd, isOverBudget } = evaluateBudgetStatus(dailyBudgetVnd, spentVnd)
    statuses.push({ date, dailyBudgetVnd, spentVnd, remainingVnd, isOverBudget })
  }
  return statuses
}

/**
 * Returns the top N spending categories by total amount.
 */
export function getTopSpendingCategories(
  transactions: Transaction[],
  topN = 5,
): Array<{ categoryId: string; totalVnd: number }> {
  const map = new Map<string, number>()
  for (const tx of transactions) {
    map.set(tx.categoryId, (map.get(tx.categoryId) ?? 0) + tx.amountVnd)
  }
  return [...map.entries()]
    .map(([categoryId, totalVnd]) => ({ categoryId, totalVnd }))
    .sort((a, b) => b.totalVnd - a.totalVnd)
    .slice(0, topN)
}

