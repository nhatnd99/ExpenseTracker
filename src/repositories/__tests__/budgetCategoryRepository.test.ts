import { describe, it, expect, beforeEach } from 'vitest'
import {
  budgetCategoryRepository,
  BUDGET_CATEGORIES_STORAGE_KEY,
  DEFAULT_BUDGET_PLAN_CATEGORIES,
} from '../budgetCategoryRepository'
import { expenseCategoryRepository } from '../expenseCategoryRepository'
import { CATEGORIES_STORAGE_KEY } from '@/context/transaction-context'
import { CATEGORY_RECORDS_STORAGE_KEY } from '../categoryRecordRepository'
import { db } from '@/db/database'
import type { BudgetCategory } from '@/types/models'

describe('budgetCategoryRepository - Independence & Backward-Compatible Migration', () => {
  beforeEach(async () => {
    localStorage.clear()
    if (typeof indexedDB !== 'undefined') {
      await db.categories.clear()
      await db.allocations.clear()
    }
  })

  it('returns default budget categories on fresh install without polluting expense categories', async () => {
    const budgetCats = await budgetCategoryRepository.findAll()
    expect(budgetCats.map((c) => c.id)).toEqual(
      DEFAULT_BUDGET_PLAN_CATEGORIES.map((c) => c.id),
    )
    expect(localStorage.getItem(CATEGORIES_STORAGE_KEY)).toBeNull()
  })

  it('idempotently migrates legacy budget categories, custom allocations, and itemized categories without mutating expense categories', async () => {
    const legacyCats: BudgetCategory[] = [
      {
        id: 'cat-expenses',
        name: 'Daily Expenses',
        icon: '🛒',
        type: 'expense',
        isFixedBill: false,
        sortOrder: 1,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'cat-fixed',
        name: 'Fixed Bills',
        icon: '🏠',
        type: 'expense',
        isFixedBill: true,
        sortOrder: 2,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'cat-1700000000',
        name: 'Custom Budget Slice',
        icon: '🏷️',
        sortOrder: 4,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'cat-vacay-uuid',
        name: 'Vacation',
        icon: 'Palmtree',
        type: 'expense',
        excludeFromExpenseTracking: true,
        enableItemizedRecords: true,
        sortOrder: 5,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'cat-coffee-uuid',
        name: 'Coffee Only Expense',
        icon: 'Coffee',
        type: 'expense',
        isFixedBill: false,
        sortOrder: 6,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'cat-inc-salary',
        name: 'Tiền lương',
        icon: 'Banknote',
        type: 'income',
        isFixedBill: false,
        sortOrder: 101,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]

    localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(legacyCats))
    localStorage.setItem(
      CATEGORY_RECORDS_STORAGE_KEY,
      JSON.stringify([
        {
          id: 'rec-1',
          categoryId: 'cat-vacay-uuid',
          name: 'Hotel',
          amount: 1000000,
          date: '2026-11-10',
        },
      ]),
    )

    // First read triggers idempotent migration
    const migrated = await budgetCategoryRepository.findAll()
    const migratedIds = migrated.map((c) => c.id)

    expect(migratedIds).toContain('cat-expenses')
    expect(migratedIds).toContain('cat-fixed')
    expect(migratedIds).toContain('cat-1700000000')
    expect(migratedIds).toContain('cat-vacay-uuid')
    // Pure expense & income categories should NOT leak into budget categories
    expect(migratedIds).not.toContain('cat-coffee-uuid')
    expect(migratedIds).not.toContain('cat-inc-salary')

    // Legacy expense categories storage must remain completely untouched
    const untouchedExpense = JSON.parse(localStorage.getItem(CATEGORIES_STORAGE_KEY) || '[]')
    expect(untouchedExpense).toHaveLength(legacyCats.length)

    // Second read uses BUDGET_CATEGORIES_STORAGE_KEY idempotently without overwriting
    await budgetCategoryRepository.update('cat-expenses', { name: 'Renamed Budget Daily' })
    const afterUpdate = await budgetCategoryRepository.findAll()
    expect(afterUpdate.find((c) => c.id === 'cat-expenses')?.name).toBe('Renamed Budget Daily')

    // Expense category name remains untouched
    const expCats = await expenseCategoryRepository.findAll()
    expect(expCats.find((c) => c.id === 'cat-expenses')?.name).toBe('Daily Expenses')
  })

  it('does not recreate deleted default categories if BUDGET_CATEGORIES_STORAGE_KEY already exists', async () => {
    await budgetCategoryRepository.delete('cat-emergency')
    const afterDelete = await budgetCategoryRepository.findAll()
    expect(afterDelete.some((c) => c.id === 'cat-emergency')).toBe(false)

    // Subsequent reads do not restore deleted category
    const reRead = await budgetCategoryRepository.findAll()
    expect(reRead.some((c) => c.id === 'cat-emergency')).toBe(false)
    expect(localStorage.getItem(BUDGET_CATEGORIES_STORAGE_KEY)).not.toBeNull()
  })

  it('keeps Expense Category mutations completely isolated from Budget Categories', async () => {
    await budgetCategoryRepository.create({
      id: 'cat-budget-only',
      name: 'Budget Only Item',
      sortOrder: 99,
      createdAt: '',
      updatedAt: '',
    })

    await expenseCategoryRepository.create({
      id: 'cat-expense-only',
      name: 'Expense Only Item',
      type: 'expense',
      sortOrder: 99,
      createdAt: '',
      updatedAt: '',
    })

    const budgetCats = await budgetCategoryRepository.findAll()
    const expenseCats = await expenseCategoryRepository.findAll()

    expect(budgetCats.some((c) => c.id === 'cat-budget-only')).toBe(true)
    expect(budgetCats.some((c) => c.id === 'cat-expense-only')).toBe(false)

    expect(expenseCats.some((c) => c.id === 'cat-expense-only')).toBe(true)
    expect(expenseCats.some((c) => c.id === 'cat-budget-only')).toBe(false)
  })
})
