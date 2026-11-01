/**
 * transactionService.ts
 * Business logic for recording and managing daily expense transactions.
 */
import { crypto } from '@/utils/crypto'
import { transactionRepository } from '@/repositories/transactionRepository'
import { monthlyPlanRepository } from '@/repositories/monthlyPlanRepository'
import { allocationRepository } from '@/repositories/allocationRepository'
import { categoryRepository } from '@/repositories/categoryRepository'
import { dateToMonthId } from '@/services/dateService'
import { calculateDailyLimit } from '@/domain/budgetCalculator'
import { getCycleMonthForDate, getPaydayCycle } from '@/features/reports/paydayCycle'
import type { Transaction, DateString, MonthId, BudgetCategory } from '@/types/models'

export interface CreateTransactionInput {
  categoryId: string
  amountVnd: number
  date: DateString
  description?: string
  isExcludedFromDaily?: boolean
}

export interface EnrichedTransaction extends Transaction {
  categoryName: string
  categoryIcon: string
}

/**
 * Returns all categories available for transactions.
 */
export async function getCategories(): Promise<BudgetCategory[]> {
  return categoryRepository.findAll()
}

/**
 * Returns all transactions for a specific date (across any month) with category metadata.
 */
export async function getTransactionsForDate(date: DateString): Promise<EnrichedTransaction[]> {
  const transactions = await transactionRepository.findByDateOnly(date)
  const categories = await categoryRepository.findAll()
  const categoryMap = new Map(categories.map((c) => [c.id, c]))

  return transactions.map((tx) => {
    const cat = categoryMap.get(tx.categoryId)
    return {
      ...tx,
      categoryName: cat?.name ?? 'Other',
      categoryIcon: cat?.icon ?? '💸',
    }
  })
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

  return transactions.map((tx) => {
    const cat = categoryMap.get(tx.categoryId)
    return {
      ...tx,
      categoryName: cat?.name ?? 'Other',
      categoryIcon: cat?.icon ?? '💸',
    }
  })
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
  const transaction: Transaction = {
    id: crypto.randomUUID(),
    monthlyPlanId: plan.id,
    categoryId: input.categoryId,
    amountVnd: input.amountVnd,
    date: input.date,
    description: input.description?.trim() || undefined,
    isExcludedFromDaily: Boolean(input.isExcludedFromDaily),
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
  changes: Partial<Pick<Transaction, 'amountVnd' | 'date' | 'categoryId' | 'description' | 'status' | 'isExcludedFromDaily'>>,
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

  await transactionRepository.update(id, {
    ...changes,
    ...(monthlyPlanId ? { monthlyPlanId } : {}),
  })
}

/** Deletes a transaction permanently */
export async function deleteTransaction(id: string): Promise<void> {
  await transactionRepository.delete(id)
}
