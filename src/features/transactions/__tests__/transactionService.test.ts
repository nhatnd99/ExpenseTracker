import { describe, it, expect, vi, beforeEach } from 'vitest'
import { monthlyPlanRepository } from '@/repositories/monthlyPlanRepository'
import { allocationRepository } from '@/repositories/allocationRepository'
import { transactionRepository } from '@/repositories/transactionRepository'
import { categoryRepository } from '@/repositories/categoryRepository'
import { getExpenseBudgetMeta, createTransaction, getTransactionsForDate } from '../transactionService'
import type { MonthlyPlan, MonthlyAllocation, Transaction, BudgetCategory } from '@/types/models'

describe('transactionService - getExpenseBudgetMeta', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('computes currentBaseBudget and baseDailyLimit accurately for active cycle', async () => {
    const today = '2026-10-25'
    const payDay = 19 // Cycle: 2026-10-19 to 2026-11-18 (31 days)

    const plan: MonthlyPlan = {
      id: 'plan-2026-10',
      month: '2026-10',
      incomeVnd: 10_000_000,
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z',
    }

    const alloc: MonthlyAllocation = {
      id: 'alloc-1',
      monthlyPlanId: 'plan-2026-10',
      categoryId: 'cat-expenses',
      allocationPercent: 50, // 5M VND
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z',
    }

    const tx1: Transaction = {
      id: 'tx-1',
      monthlyPlanId: 'plan-2026-10',
      categoryId: 'cat-expenses',
      amountVnd: 100_000,
      date: '2026-10-20',
      status: 'cleared',
      createdAt: '2026-10-20T00:00:00Z',
      updatedAt: '2026-10-20T00:00:00Z',
      isExcludedFromDaily: false,
    }
    const tx2: Transaction = {
      id: 'tx-2',
      monthlyPlanId: 'plan-2026-10',
      categoryId: 'cat-fixed',
      amountVnd: 3_000_000,
      date: '2026-10-21',
      status: 'cleared',
      createdAt: '2026-10-21T00:00:00Z',
      updatedAt: '2026-10-21T00:00:00Z',
      isExcludedFromDaily: true,
    }

    vi.spyOn(monthlyPlanRepository, 'findByMonth').mockResolvedValue(plan)
    vi.spyOn(allocationRepository, 'findByPlanId').mockResolvedValue([alloc])
    vi.spyOn(transactionRepository, 'findByDateRange').mockResolvedValue([tx1, tx2])

    const meta = await getExpenseBudgetMeta(today, payDay, today)

    expect(meta.currentCycle.totalDays).toBe(31)
    expect(meta.currentBaseBudget).toBe(5_000_000) // 50% of 10M
    // baseDailyLimit = 5,000,000 / 31 = 161,290
    expect(meta.baseDailyLimit).toBe(Math.round(5_000_000 / 31))
    expect(meta.cycleTransactions.length).toBe(2)
  })

  it('clamps progressPercent to 100 max when expenses exceed budget', () => {
    const dailyLimit = 200_000
    const totalDailySpent = 5_000_000 // Huge expense!

    const rawSpentPercent = Math.round((totalDailySpent / dailyLimit) * 100) // 2500%
    const progressPercent = Math.min(100, Math.max(0, rawSpentPercent))

    expect(rawSpentPercent).toBe(2500)
    expect(progressPercent).toBe(100)
  })

  it('createTransaction automatically generates transactionDate combining date with current system time', async () => {
    vi.spyOn(monthlyPlanRepository, 'findByMonth').mockResolvedValue({
      id: 'plan-2026-11',
      month: '2026-11',
      incomeVnd: 10_000_000,
      createdAt: '2026-11-01T00:00:00Z',
      updatedAt: '2026-11-01T00:00:00Z',
    })
    const createSpy = vi.spyOn(transactionRepository, 'create').mockResolvedValue(undefined)

    const tx = await createTransaction({
      categoryId: 'cat-expenses',
      amountVnd: 35000,
      date: '2026-11-02', // Yesterday
      description: 'Ăn trưa',
    })

    expect(tx.date).toBe('2026-11-02')
    expect(tx.transactionDate).toBeDefined()
    expect(tx.transactionDate).toMatch(/^2026-11-02T/)
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        date: '2026-11-02',
        transactionDate: expect.stringMatching(/^2026-11-02T/),
      }),
    )
  })

  it('getTransactionsForDate returns transactions sorted descending with log bù prioritized', async () => {
    const categories: BudgetCategory[] = [
      {
        id: 'cat-expenses',
        name: 'Chi tiêu',
        icon: '🛒',
        type: 'expense',
        sortOrder: 1,
        createdAt: '',
        updatedAt: '',
      },
    ]

    const earlierLoggedTx: Transaction = {
      id: 'tx-earlier',
      monthlyPlanId: 'plan-1',
      categoryId: 'cat-expenses',
      amountVnd: 20000,
      date: '2026-11-02',
      transactionDate: '2026-11-02T08:00:00.000Z',
      createdAt: '2026-11-02T01:00:00.000Z',
      status: 'cleared',
      updatedAt: '',
    }

    const laterBackfilledTx: Transaction = {
      id: 'tx-backfilled',
      monthlyPlanId: 'plan-1',
      categoryId: 'cat-expenses',
      amountVnd: 50000,
      date: '2026-11-02',
      transactionDate: '2026-11-02T21:38:00.000Z',
      createdAt: '2026-11-03T14:38:00.000Z', // Created later (log bù)
      status: 'cleared',
      updatedAt: '',
    }

    vi.spyOn(transactionRepository, 'findByDateOnly').mockResolvedValue([
      earlierLoggedTx,
      laterBackfilledTx,
    ])
    vi.spyOn(categoryRepository, 'findAll').mockResolvedValue(categories)

    const list = await getTransactionsForDate('2026-11-02')
    expect(list.length).toBe(2)
    // The backfilled record should be sorted first (on top of the list)
    expect(list[0].id).toBe('tx-backfilled')
    expect(list[1].id).toBe('tx-earlier')
  })
})
