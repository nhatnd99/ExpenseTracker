/**
 * Core domain types for Personal Expense Tracker.
 *
 * Date conventions:
 *   - Month identifiers use ISO format: "YYYY-MM"  (e.g. "2024-01")
 *   - Transaction dates use ISO format: "YYYY-MM-DD" (e.g. "2024-01-15")
 *
 * Currency:
 *   - All monetary amounts are stored as integer VND to avoid floating-point errors.
 *   - Never use floating-point for monetary arithmetic.
 */

/** Unique identifier type alias for clarity */
export type Id = string

/** Month string in "YYYY-MM" format */
export type MonthId = string

/** Date string in "YYYY-MM-DD" format */
export type DateString = string

// ---------------------------------------------------------------------------
// Monthly Plan
// ---------------------------------------------------------------------------

/**
 * Represents a user's financial plan for a specific calendar month.
 * One MonthlyPlan exists per month once the user sets their income.
 */
export interface MonthlyPlan {
  /** UUID — stable identifier, not position-based */
  id: Id
  /** Month this plan applies to, e.g. "2024-01" */
  month: MonthId
  /** Total monthly income in integer VND */
  incomeVnd: number
  /** ISO timestamp when this record was created */
  createdAt: string
  /** ISO timestamp when this record was last updated */
  updatedAt: string
}

// ---------------------------------------------------------------------------
// Budget Category
// ---------------------------------------------------------------------------

export type CategoryType = 'expense' | 'income'

/**
 * A named spending or savings category defined by the user.
 * Categories are global; their per-month allocation percentages are stored
 * in MonthlyAllocation to preserve historical values.
 */
export interface BudgetCategory {
  id: Id
  name: string
  /** Optional emoji or icon identifier for display */
  icon?: string
  /** Type of category: expense (default) or income */
  type?: CategoryType
  /** Whether expenses in this category are fixed bills/large expenses (excluded from daily limit by default) */
  isFixedBill?: boolean
  /** Display order */
  sortOrder: number
  createdAt: string
  updatedAt: string
}

// ---------------------------------------------------------------------------
// Monthly Allocation
// ---------------------------------------------------------------------------

/**
 * Records the percentage of income allocated to a category for one month.
 *
 * Storing allocations separately from categories ensures that changing
 * a category's percentage in a new month does not alter historical data.
 *
 * Constraint: the sum of allocationPercent values for a given monthlyPlanId
 * must equal 100. This is enforced at the domain/service layer.
 */
export interface MonthlyAllocation {
  id: Id
  monthlyPlanId: Id
  categoryId: Id
  /**
   * Percentage as an integer 0–100.
   * Example: 70 means 70% of monthly income.
   */
  allocationPercent: number
  createdAt: string
  updatedAt: string
}

// ---------------------------------------------------------------------------
// Transaction
// ---------------------------------------------------------------------------

export type TransactionStatus = 'pending' | 'cleared'
export type TransactionType = 'expense' | 'income'

/**
 * A single expense or income transaction recorded by the user.
 */
export interface Transaction {
  id: Id
  monthlyPlanId: Id
  categoryId: Id
  /** Amount in integer VND */
  amountVnd: number
  /** Date of the transaction in "YYYY-MM-DD" format */
  date: DateString
  /** ISO timestamp combining the selected date with the system time (HH:mm:ss) when saved */
  transactionDate?: string
  /** Type of transaction: expense (default) or income */
  type?: TransactionType
  /** Optional user note */
  description?: string
  /** Whether this expense is excluded from the daily spending limit calculation (e.g. fixed bills) */
  isExcludedFromDaily?: boolean
  status: TransactionStatus
  createdAt: string
  updatedAt: string
}

// ---------------------------------------------------------------------------
// Quick Transaction Template
// ---------------------------------------------------------------------------

export interface QuickTemplate {
  id: string
  name: string
  amount: number
  categoryId: string
  note?: string
  type: TransactionType
}

// ---------------------------------------------------------------------------
// Derived / View types (not persisted)
// ---------------------------------------------------------------------------

/** Result of evaluating spending for a single day */
export interface DailyBudgetStatus {
  date: DateString
  /** Budget allocated for this specific day in integer VND */
  dailyBudgetVnd: number
  /** Total spent on this day in integer VND */
  spentVnd: number
  /** remainingVnd = dailyBudgetVnd - spentVnd (may be negative) */
  remainingVnd: number
  isOverBudget: boolean
}

/** Aggregated summary for the entire month */
export interface MonthlyBudgetSummary {
  month: MonthId
  incomeVnd: number
  /** Total budget allocated to expense categories */
  totalExpenseBudgetVnd: number
  totalSpentVnd: number
  remainingVnd: number
  /** Daily budget = totalExpenseBudgetVnd / daysInMonth */
  dailyBudgetVnd: number
  daysInMonth: number
  currentDay: number
  /** Budget that should have been spent by today (dailyBudgetVnd * currentDay) */
  expectedSpentByTodayVnd: number
  isOverBudget: boolean
}
