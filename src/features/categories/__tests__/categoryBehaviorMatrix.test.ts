import { describe, it, expect, beforeEach } from 'vitest'
import { getEffectiveCycleTransactions } from '../categoryRecordService'
import { categoryRecordRepository } from '@/repositories/categoryRecordRepository'
import { calculateTotalMonthlySpent, calculateSpentToday } from '@/domain/dashboardCalculator'
import type { BudgetCategory, Transaction, CategoryRecord } from '@/types/models'

describe('Category Behavior Matrix & Expense Calculation Integration', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  // 4 Categories representing each cell in the Behavior Matrix
  const normalCategory: BudgetCategory = {
    id: 'cat-normal',
    name: 'Normal Food',
    type: 'expense',
    excludeFromExpenseTracking: false,
    enableItemizedRecords: false,
    sortOrder: 1,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  }

  const excludedWithoutRecordsCategory: BudgetCategory = {
    id: 'cat-excluded-no-records',
    name: 'Excluded Note Only',
    type: 'expense',
    excludeFromExpenseTracking: true,
    enableItemizedRecords: false,
    sortOrder: 2,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  }

  const trackedWithRecordsCategory: BudgetCategory = {
    id: 'cat-tracked-records',
    name: 'Project Expenses',
    type: 'expense',
    excludeFromExpenseTracking: false,
    enableItemizedRecords: true,
    sortOrder: 3,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  }

  const excludedWithRecordsCategory: BudgetCategory = {
    id: 'cat-excluded-records',
    name: 'Vacation & Activities',
    type: 'expense',
    excludeFromExpenseTracking: true,
    enableItemizedRecords: true,
    sortOrder: 4,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  }

  const categories = [
    normalCategory,
    excludedWithoutRecordsCategory,
    trackedWithRecordsCategory,
    excludedWithRecordsCategory,
  ]

  it('Matrix 1 (OFF / OFF): Normal category expenses are included in calculations', async () => {
    const rawTxs: Transaction[] = [
      {
        id: 'tx-1',
        monthlyPlanId: 'plan-1',
        categoryId: 'cat-normal',
        amountVnd: 50000,
        date: '2026-11-10',
        type: 'expense',
        status: 'cleared',
        createdAt: '2026-11-10T10:00:00.000Z',
        updatedAt: '2026-11-10T10:00:00.000Z',
      },
    ]

    const effective = await getEffectiveCycleTransactions(
      rawTxs,
      categories,
      '2026-11-01',
      '2026-11-30',
    )
    expect(effective).toHaveLength(1)
    expect(calculateTotalMonthlySpent(effective)).toBe(50000)
    expect(calculateSpentToday(effective, '2026-11-10')).toBe(50000)
  })

  it('Matrix 2 (ON / OFF): Excluded category transactions are omitted from regular calculations', async () => {
    const rawTxs: Transaction[] = [
      {
        id: 'tx-excluded',
        monthlyPlanId: 'plan-1',
        categoryId: 'cat-excluded-no-records',
        amountVnd: 300000,
        date: '2026-11-10',
        type: 'expense',
        status: 'cleared',
        createdAt: '2026-11-10T10:00:00.000Z',
        updatedAt: '2026-11-10T10:00:00.000Z',
      },
    ]

    const effective = await getEffectiveCycleTransactions(
      rawTxs,
      categories,
      '2026-11-01',
      '2026-11-30',
    )
    expect(effective).toHaveLength(0)
    expect(calculateTotalMonthlySpent(effective)).toBe(0)
    expect(calculateSpentToday(effective, '2026-11-10')).toBe(0)
  })

  it('Matrix 3 (OFF / ON): Itemized records are included in regular expense calculations exactly once without duplication', async () => {
    // Add itemized record
    const itemRecord: CategoryRecord = {
      id: 'rec-proj-1',
      categoryId: 'cat-tracked-records',
      name: 'Server hosting',
      amount: 200000,
      date: '2026-11-12',
      createdAt: '2026-11-12T10:00:00.000Z',
      updatedAt: '2026-11-12T10:00:00.000Z',
    }
    await categoryRecordRepository.create(itemRecord)

    // Even if a legacy or duplicate raw transaction exists for this category, it is not counted twice
    const rawTxs: Transaction[] = [
      {
        id: 'tx-duplicate-test',
        monthlyPlanId: 'plan-1',
        categoryId: 'cat-tracked-records',
        amountVnd: 200000,
        date: '2026-11-12',
        type: 'expense',
        status: 'cleared',
        createdAt: '2026-11-12T10:00:00.000Z',
        updatedAt: '2026-11-12T10:00:00.000Z',
      },
    ]

    const effective = await getEffectiveCycleTransactions(
      rawTxs,
      categories,
      '2026-11-01',
      '2026-11-30',
    )

    // Should include the itemized record exactly once (amount: 200,000 VND)
    expect(effective).toHaveLength(1)
    expect(effective[0].id).toBe('rec-proj-1')
    expect(calculateTotalMonthlySpent(effective)).toBe(200000)
    expect(calculateSpentToday(effective, '2026-11-12')).toBe(200000)
  })

  it('Matrix 4 (ON / ON): Excluded itemized records are stored independently and NEVER enter regular expense calculations', async () => {
    // Add record to excluded itemized category
    const vacayRecord: CategoryRecord = {
      id: 'rec-vacay-1',
      categoryId: 'cat-excluded-records',
      name: 'Resort stay',
      amount: 1500000,
      date: '2026-11-15',
      createdAt: '2026-11-15T12:00:00.000Z',
      updatedAt: '2026-11-15T12:00:00.000Z',
    }
    await categoryRecordRepository.create(vacayRecord)

    const rawTxs: Transaction[] = [
      {
        id: 'tx-normal',
        monthlyPlanId: 'plan-1',
        categoryId: 'cat-normal',
        amountVnd: 40000,
        date: '2026-11-15',
        type: 'expense',
        status: 'cleared',
        createdAt: '2026-11-15T08:00:00.000Z',
        updatedAt: '2026-11-15T08:00:00.000Z',
      },
    ]

    const effective = await getEffectiveCycleTransactions(
      rawTxs,
      categories,
      '2026-11-01',
      '2026-11-30',
    )

    // Only the normal transaction (40,000 VND) is included; the 1,500,000 VND resort record is excluded
    expect(effective).toHaveLength(1)
    expect(calculateTotalMonthlySpent(effective)).toBe(40000)
    expect(calculateSpentToday(effective, '2026-11-15')).toBe(40000)

    // The resort record is still accessible independently
    const independentRecords = await categoryRecordRepository.findByCategoryId('cat-excluded-records')
    expect(independentRecords).toHaveLength(1)
    expect(independentRecords[0].amount).toBe(1500000)
  })

  it('Backward compatibility: existing categories with undefined flags default to false/false', async () => {
    const legacyCategory: BudgetCategory = {
      id: 'cat-legacy',
      name: 'Legacy Coffee',
      sortOrder: 10,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    }

    const rawTxs: Transaction[] = [
      {
        id: 'tx-legacy',
        monthlyPlanId: 'plan-1',
        categoryId: 'cat-legacy',
        amountVnd: 35000,
        date: '2026-11-05',
        type: 'expense',
        status: 'cleared',
        createdAt: '2026-11-05T09:00:00.000Z',
        updatedAt: '2026-11-05T09:00:00.000Z',
      },
    ]

    const effective = await getEffectiveCycleTransactions(
      rawTxs,
      [legacyCategory],
      '2026-11-01',
      '2026-11-30',
    )

    // Works as normal category without exclusion
    expect(effective).toHaveLength(1)
    expect(calculateTotalMonthlySpent(effective)).toBe(35000)
  })
})
