/**
 * budgetCalculator.ts
 * Pure functions for budget allocation and daily budget calculations.
 *
 * All monetary values are integer VND.
 * No floating-point arithmetic is used for final monetary results.
 * Division results are floored intentionally to avoid rounding up the budget.
 */
import type { MonthlyAllocation, MonthlyPlan } from '@/types/models'

/**
 * Returns the number of days in a given month.
 * @param year  Full year, e.g. 2024
 * @param month 1-based month number (1 = January … 12 = December)
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

/**
 * Parses a "YYYY-MM" month string into { year, month } numbers.
 * @throws if the format is invalid
 */
export function parseMonthId(monthId: string): { year: number; month: number } {
  const match = monthId.match(/^(\d{4})-(0[1-9]|1[0-2])$/)
  if (!match) throw new Error(`Invalid monthId format: "${monthId}"`)
  return { year: parseInt(match[1], 10), month: parseInt(match[2], 10) }
}

/**
 * Calculates the VND amount allocated to a category for a month.
 * Uses integer math: result is floored to avoid fractional VND.
 *
 * @param incomeVnd        Monthly income in integer VND
 * @param allocationPercent Integer percentage 0–100
 */
export function calculateAllocationAmount(
  incomeVnd: number,
  allocationPercent: number,
): number {
  return Math.floor((incomeVnd * allocationPercent) / 100)
}

/**
 * Calculates the daily spending budget.
 * Floors the result to keep the budget conservative.
 *
 * @param monthlyBudgetVnd  Total budget for the month (integer VND)
 * @param daysInMonth       Number of days in the month
 */
export function calculateDailyBudget(
  monthlyBudgetVnd: number,
  daysInMonth: number,
): number {
  if (daysInMonth <= 0) throw new RangeError('daysInMonth must be positive')
  return Math.floor(monthlyBudgetVnd / daysInMonth)
}

/**
 * Calculates the total expense budget from a set of allocations.
 */
export function calculateTotalBudget(
  incomeVnd: number,
  allocations: Pick<MonthlyAllocation, 'allocationPercent'>[],
): number {
  return allocations.reduce(
    (total, a) => total + calculateAllocationAmount(incomeVnd, a.allocationPercent),
    0,
  )
}

/**
 * Evaluates whether spending is over budget and by how much.
 */
export function evaluateBudgetStatus(
  budgetVnd: number,
  spentVnd: number,
): { remainingVnd: number; isOverBudget: boolean } {
  const remainingVnd = budgetVnd - spentVnd
  return { remainingVnd, isOverBudget: remainingVnd < 0 }
}

/**
 * Builds a full monthly budget summary from a plan, its expense allocations,
 * and the total spent so far in the month.
 */
export function buildMonthlyBudgetSummary(
  plan: MonthlyPlan,
  expenseAllocations: Pick<MonthlyAllocation, 'allocationPercent'>[],
  totalSpentVnd: number,
  today: Date = new Date(),
) {
  const { year, month } = parseMonthId(plan.month)
  const daysInMonth = getDaysInMonth(year, month)
  const totalExpenseBudgetVnd = calculateTotalBudget(plan.incomeVnd, expenseAllocations)
  const dailyBudgetVnd = calculateDailyBudget(totalExpenseBudgetVnd, daysInMonth)

  const currentDay = Math.min(today.getDate(), daysInMonth)
  const expectedSpentByTodayVnd = dailyBudgetVnd * currentDay
  const remainingVnd = totalExpenseBudgetVnd - totalSpentVnd

  return {
    month: plan.month,
    incomeVnd: plan.incomeVnd,
    totalExpenseBudgetVnd,
    totalSpentVnd,
    remainingVnd,
    dailyBudgetVnd,
    daysInMonth,
    currentDay,
    expectedSpentByTodayVnd,
    isOverBudget: remainingVnd < 0,
  }
}

