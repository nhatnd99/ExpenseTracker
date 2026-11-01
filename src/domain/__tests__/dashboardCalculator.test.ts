import { describe, it, expect } from 'vitest'
import {
  groupTransactionsByDate,
  getTopSpendingCategories,
  computeDailyStatuses,
  calculateSpentToday,
  calculateTotalMonthlySpent,
  calculateTotalExcludedBills,
} from '../dashboardCalculator'
import type { Transaction } from '@/types/models'

function makeTx(overrides: Partial<Transaction>): Transaction {
  return {
    id: 'tx-1',
    monthlyPlanId: 'plan-1',
    categoryId: 'cat-1',
    amountVnd: 100_000,
    date: '2024-01-01',
    status: 'cleared',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('Smart Categories calculations (calculateSpentToday, calculateTotalMonthlySpent, calculateTotalExcludedBills)', () => {
  it('calculates spent today by excluding transactions marked as isExcludedFromDaily', () => {
    const txs: Transaction[] = [
      makeTx({ id: '1', date: '2024-01-15', amountVnd: 50_000, isExcludedFromDaily: false }),
      makeTx({ id: '2', date: '2024-01-15', amountVnd: 2_000_000, isExcludedFromDaily: true }), // Rent bill
      makeTx({ id: '3', date: '2024-01-15', amountVnd: 70_000, isExcludedFromDaily: false }),
      makeTx({ id: '4', date: '2024-01-16', amountVnd: 100_000, isExcludedFromDaily: false }),
    ]

    const spentToday = calculateSpentToday(txs, '2024-01-15')
    expect(spentToday).toBe(120_000) // 50k + 70k, ignoring the 2M rent bill
  })

  it('calculates total monthly spent including both daily expenses and excluded bills', () => {
    const txs: Transaction[] = [
      makeTx({ id: '1', amountVnd: 50_000, isExcludedFromDaily: false }),
      makeTx({ id: '2', amountVnd: 2_000_000, isExcludedFromDaily: true }),
      makeTx({ id: '3', amountVnd: 150_000, isExcludedFromDaily: false }),
    ]

    expect(calculateTotalMonthlySpent(txs)).toBe(2_200_000)
  })

  it('calculates total excluded bills correctly', () => {
    const txs: Transaction[] = [
      makeTx({ id: '1', amountVnd: 50_000, isExcludedFromDaily: false }),
      makeTx({ id: '2', amountVnd: 2_000_000, isExcludedFromDaily: true }), // Rent
      makeTx({ id: '3', amountVnd: 500_000, isExcludedFromDaily: true }), // Electricity
      makeTx({ id: '4', amountVnd: 150_000 }), // undefined isExcludedFromDaily
    ]

    expect(calculateTotalExcludedBills(txs)).toBe(2_500_000)
  })
})

describe('groupTransactionsByDate', () => {
  it('groups and sums transactions by date', () => {
    const txs = [
      makeTx({ id: 'tx-1', date: '2024-01-01', amountVnd: 100_000 }),
      makeTx({ id: 'tx-2', date: '2024-01-01', amountVnd: 200_000 }),
      makeTx({ id: 'tx-3', date: '2024-01-02', amountVnd: 50_000 }),
    ]
    const result = groupTransactionsByDate(txs)
    expect(result.get('2024-01-01')).toBe(300_000)
    expect(result.get('2024-01-02')).toBe(50_000)
  })

  it('returns an empty map for no transactions', () => {
    expect(groupTransactionsByDate([])).toEqual(new Map())
  })
})

describe('getTopSpendingCategories', () => {
  it('returns categories sorted by total spending descending', () => {
    const txs = [
      makeTx({ categoryId: 'cat-a', amountVnd: 500_000 }),
      makeTx({ categoryId: 'cat-b', amountVnd: 1_000_000 }),
      makeTx({ categoryId: 'cat-a', amountVnd: 300_000 }),
    ]
    const result = getTopSpendingCategories(txs)
    expect(result[0]).toEqual({ categoryId: 'cat-b', totalVnd: 1_000_000 })
    expect(result[1]).toEqual({ categoryId: 'cat-a', totalVnd: 800_000 })
  })

  it('limits to topN results', () => {
    const txs = Array.from({ length: 10 }, (_, i) =>
      makeTx({ id: `tx-${i}`, categoryId: `cat-${i}`, amountVnd: 100_000 }),
    )
    expect(getTopSpendingCategories(txs, 3)).toHaveLength(3)
  })
})

describe('computeDailyStatuses', () => {
  it('generates statuses for each day in the month', () => {
    const statuses = computeDailyStatuses(3_100_000, 31, 2024, 1, [])
    expect(statuses).toHaveLength(31)
    expect(statuses[0].date).toBe('2024-01-01')
    expect(statuses[30].date).toBe('2024-01-31')
  })

  it('marks days as over-budget when spending exceeds daily budget', () => {
    const txs = [makeTx({ date: '2024-01-01', amountVnd: 200_000 })]
    const statuses = computeDailyStatuses(1_000_000, 31, 2024, 1, txs)
    expect(statuses[0].isOverBudget).toBe(true)
    expect(statuses[0].spentVnd).toBe(200_000)
  })
})

