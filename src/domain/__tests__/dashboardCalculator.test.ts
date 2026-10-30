import { describe, it, expect } from 'vitest'
import { groupTransactionsByDate, getTopSpendingCategories, computeDailyStatuses } from '../dashboardCalculator'
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

