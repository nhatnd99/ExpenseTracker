/**
 * transactionService.ts
 * Business logic for recording and managing daily expense transactions.
 */
import { crypto } from '@/utils/crypto'
import { transactionRepository } from '@/repositories/transactionRepository'
import { monthlyPlanRepository } from '@/repositories/monthlyPlanRepository'
import { allocationRepository } from '@/repositories/allocationRepository'
import { categoryRepository } from '@/repositories/categoryRepository'
import { dateToMonthId, getTodayString, combineDateWithCurrentTime, compareTransactionsDesc } from '@/services/dateService'
import { calculateDailyLimit } from '@/domain/budgetCalculator'
import { getCycleMonthForDate, getPaydayCycle, type PaydayCycle } from '@/features/reports/paydayCycle'
import type { Transaction, DateString, MonthId, BudgetCategory } from '@/types/models'

export interface CreateTransactionInput {
  categoryId: string
  amountVnd: number
  date: DateString
  type?: 'expense' | 'income'
  description?: string
  isExcludedFromDaily?: boolean
  transactionDate?: string
}

export interface EnrichedTransaction extends Transaction {
  categoryName: string
  categoryIcon: string
}

export interface ExpenseBudgetMeta {
  currentCycle: PaydayCycle
  currentBaseBudget: number
  cycleTransactions: Transaction[]
  baseDailyLimit: number
}

/**
 * Loads budget and cycle metadata for the Expense page.
 * Provides the current cycle and cycle transactions (for today's Dynamic Safe-to-Spend)
 * as well as the standard base daily limit for the selected date.
 */
export async function getExpenseBudgetMeta(
  selectedDate: DateString,
  payDay: number = 1,
  todayStr: DateString = getTodayString(),
): Promise<ExpenseBudgetMeta> {
  const currentCycleMonth = getCycleMonthForDate(todayStr, payDay)
  const currentCycle = getPaydayCycle(currentCycleMonth, payDay)

  const selectedCycleMonth = getCycleMonthForDate(selectedDate, payDay)
  const selectedCycle = getPaydayCycle(selectedCycleMonth, payDay)

  const [currentPlan, selectedPlan, cycleTransactions] = await Promise.all([
    monthlyPlanRepository.findByMonth(currentCycleMonth),
    selectedCycleMonth === currentCycleMonth
      ? null
      : monthlyPlanRepository.findByMonth(selectedCycleMonth),
    transactionRepository.findByDateRange(currentCycle.startDate, currentCycle.endDate),
  ])

  const activeSelectedPlan = selectedPlan ?? currentPlan

  let currentBaseBudget = 0
  if (currentPlan && currentPlan.incomeVnd > 0) {
    const allocations = await allocationRepository.findByPlanId(currentPlan.id)
    const dailyAlloc = allocations.find((a) => a.categoryId === 'cat-expenses')
    const percent = dailyAlloc ? dailyAlloc.allocationPercent : 0
    currentBaseBudget = Math.floor((currentPlan.incomeVnd * percent) / 100)
  }

  let baseDailyLimit = 0
  if (activeSelectedPlan && activeSelectedPlan.incomeVnd > 0) {
    const allocations = await allocationRepository.findByPlanId(activeSelectedPlan.id)
    const dailyAlloc = allocations.find((a) => a.categoryId === 'cat-expenses')
    const percent = dailyAlloc ? dailyAlloc.allocationPercent : 0
    baseDailyLimit = calculateDailyLimit(activeSelectedPlan.incomeVnd, percent, selectedCycle.totalDays)
  }

  return {
    currentCycle,
    currentBaseBudget,
    cycleTransactions,
    baseDailyLimit,
  }
}

export const DEFAULT_INCOME_CATEGORIES: Omit<BudgetCategory, 'createdAt' | 'updatedAt'>[] = [
  { id: 'cat-inc-salary', name: 'Tiền lương', icon: 'Banknote', type: 'income', isFixedBill: false, sortOrder: 101 },
  { id: 'cat-inc-bonus', name: 'Tiền thưởng', icon: 'Gift', type: 'income', isFixedBill: false, sortOrder: 102 },
  { id: 'cat-inc-debt', name: 'Được trả nợ', icon: 'HandCoins', type: 'income', isFixedBill: false, sortOrder: 103 },
  { id: 'cat-inc-selling', name: 'Bán thanh lý', icon: 'Tag', type: 'income', isFixedBill: false, sortOrder: 104 },
  { id: 'cat-inc-extra', name: 'Thu nhập phụ', icon: 'Sparkles', type: 'income', isFixedBill: false, sortOrder: 105 },
  { id: 'cat-inc-other', name: 'Thu nhập khác', icon: 'Coins', type: 'income', isFixedBill: false, sortOrder: 106 },
]

/**
 * Returns all categories available for transactions.
 * Automatically seeds default income categories if none exist in the database.
 */
export async function getCategories(): Promise<BudgetCategory[]> {
  const all = await categoryRepository.findAll()
  const hasIncome = all.some((c) => c.type === 'income')
  if (!hasIncome) {
    const now = new Date().toISOString()
    for (const c of DEFAULT_INCOME_CATEGORIES) {
      await categoryRepository.create({
        ...c,
        createdAt: now,
        updatedAt: now,
      })
    }
    return categoryRepository.findAll()
  }
  return all
}

/**
 * Returns all transactions for a specific date (across any month) with category metadata.
 */
export async function getTransactionsForDate(date: DateString): Promise<EnrichedTransaction[]> {
  const transactions = await transactionRepository.findByDateOnly(date)
  const categories = await categoryRepository.findAll()
  const categoryMap = new Map(categories.map((c) => [c.id, c]))

  return transactions
    .map((tx) => {
      const cat = categoryMap.get(tx.categoryId)
      return {
        ...tx,
        categoryName: cat?.name ?? 'Other',
        categoryIcon: cat?.icon ?? '💸',
      }
    })
    .sort(compareTransactionsDesc)
}

/**
 * Returns the calculated daily budget (hạn mức chi tiêu mỗi ngày) for a given date.
 * Based on the Daily Expenses category allocation and dynamic cycle days.
 */
export async function getDailyBudgetForDate(date: DateString, payDay: number = 1): Promise<number> {
  const cycleMonth = getCycleMonthForDate(date, payDay)
  const cycle = getPaydayCycle(cycleMonth, payDay)
  const plan = await monthlyPlanRepository.findByMonth(cycleMonth)
  if (!plan || plan.incomeVnd <= 0) return 0

  const allocations = await allocationRepository.findByPlanId(plan.id)
  const dailyExpensesAlloc = allocations.find((a) => a.categoryId === 'cat-expenses')
  const percent = dailyExpensesAlloc ? dailyExpensesAlloc.allocationPercent : 0
  if (percent <= 0) return 0

  return calculateDailyLimit(plan.incomeVnd, percent, cycle.totalDays)
}

/**
 * Returns all transactions for a given month with category metadata.
 */
export async function getTransactionsForMonth(month: MonthId): Promise<EnrichedTransaction[]> {
  const plan = await monthlyPlanRepository.findByMonth(month)
  if (!plan) return []

  const transactions = await transactionRepository.findByPlanId(plan.id)
  const categories = await categoryRepository.findAll()
  const categoryMap = new Map(categories.map((c) => [c.id, c]))

  return transactions
    .map((tx) => {
      const cat = categoryMap.get(tx.categoryId)
      return {
        ...tx,
        categoryName: cat?.name ?? 'Other',
        categoryIcon: cat?.icon ?? '💸',
      }
    })
    .sort(compareTransactionsDesc)
}

/**
 * Records a new expense transaction.
 * Automatically resolves or creates a default monthly plan for the transaction's date.
 */
export async function createTransaction(input: CreateTransactionInput): Promise<Transaction> {
  const month = dateToMonthId(input.date)
  let plan = await monthlyPlanRepository.findByMonth(month)

  if (!plan) {
    // If no plan exists, automatically initialize a starter plan so the user can log expenses immediately
    const now = new Date().toISOString()
    plan = {
      id: crypto.randomUUID(),
      month,
      incomeVnd: 0,
      createdAt: now,
      updatedAt: now,
    }
    await monthlyPlanRepository.create(plan)
  }

  const now = new Date().toISOString()
  const transactionDate = input.transactionDate ?? combineDateWithCurrentTime(input.date)
  const transaction: Transaction = {
    id: crypto.randomUUID(),
    monthlyPlanId: plan.id,
    categoryId: input.categoryId,
    amountVnd: input.amountVnd,
    date: input.date,
    transactionDate,
    type: input.type ?? 'expense',
    description: input.description?.trim() || undefined,
    isExcludedFromDaily: input.type === 'income' ? false : Boolean(input.isExcludedFromDaily),
    status: 'cleared',
    createdAt: now,
    updatedAt: now,
  }

  await transactionRepository.create(transaction)
  return transaction
}

/** Updates an existing transaction's mutable fields */
export async function updateTransaction(
  id: string,
  changes: Partial<Pick<Transaction, 'amountVnd' | 'date' | 'categoryId' | 'type' | 'description' | 'status' | 'isExcludedFromDaily' | 'transactionDate'>>,
): Promise<void> {
  let monthlyPlanId: string | undefined
  if (changes.date) {
    const month = dateToMonthId(changes.date)
    let plan = await monthlyPlanRepository.findByMonth(month)
    if (!plan) {
      const now = new Date().toISOString()
      plan = {
        id: crypto.randomUUID(),
        month,
        incomeVnd: 0,
        createdAt: now,
        updatedAt: now,
      }
      await monthlyPlanRepository.create(plan)
    }
    monthlyPlanId = plan.id
  }

  const transactionDate = changes.transactionDate ?? (changes.date ? combineDateWithCurrentTime(changes.date) : undefined)

  await transactionRepository.update(id, {
    ...changes,
    ...(transactionDate ? { transactionDate } : {}),
    ...(monthlyPlanId ? { monthlyPlanId } : {}),
  })
}

/** Deletes a transaction permanently */
export async function deleteTransaction(id: string): Promise<void> {
  await transactionRepository.delete(id)
}
