import { describe, it, expect, vi, beforeEach } from 'vitest'
import { monthlyPlanRepository } from '@/repositories/monthlyPlanRepository'
import { allocationRepository } from '@/repositories/allocationRepository'
import { transactionRepository } from '@/repositories/transactionRepository'
import { categoryRepository } from '@/repositories/categoryRepository'
import { getCycleReportData } from '../reportService'
import type { MonthlyPlan, MonthlyAllocation, Transaction } from '@/types/models'

describe('reportService - Dynamic Daily Budget Recalculation (Safe-to-Spend)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('recalculates daily limits dynamically based on actual spending and remaining cycle days', async () => {
    // 31-day cycle: 2026-10-19 to 2026-11-18 (total 31 days)
    // Today is 2026-10-20 (Day 2 of cycle: 19 is Past, 20 is Today, 21 onwards is Future)
    const todayStr = '2026-10-20'
    const monthId = '2026-10'
    const payDay = 19

    const plan: MonthlyPlan = {
      id: 'plan-1',
      month: monthId,
      incomeVnd: 6_000_000,
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z',
    }

    const alloc: MonthlyAllocation = {
      id: 'alloc-1',
      monthlyPlanId: 'plan-1',
      categoryId: 'cat-expenses',
      allocationPercent: 50, // 3,000,000 VND Daily Expenses Budget
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z',
    }

    // Past day (2026-10-19): spent 200,000đ daily + 2,000,000đ rent bill (isExcludedFromDaily: true)
    const txPastDaily: Transaction = {
      id: 'tx-1',
      monthlyPlanId: 'plan-1',
      categoryId: 'cat-expenses',
      amountVnd: 200_000,
      date: '2026-10-19',
      status: 'cleared',
      createdAt: '2026-10-19T00:00:00Z',
      updatedAt: '2026-10-19T00:00:00Z',
      isExcludedFromDaily: false,
    }
    const txPastFixed: Transaction = {
      id: 'tx-2',
      monthlyPlanId: 'plan-1',
      categoryId: 'cat-fixed',
      amountVnd: 2_000_000,
      date: '2026-10-19',
      status: 'cleared',
      createdAt: '2026-10-19T00:00:00Z',
      updatedAt: '2026-10-19T00:00:00Z',
      isExcludedFromDaily: true,
    }

    // Today (2026-10-20): spent 300,000đ daily
    const txTodayDaily: Transaction = {
      id: 'tx-3',
      monthlyPlanId: 'plan-1',
      categoryId: 'cat-expenses',
      amountVnd: 300_000,
      date: '2026-10-20',
      status: 'cleared',
      createdAt: '2026-10-20T00:00:00Z',
      updatedAt: '2026-10-20T00:00:00Z',
      isExcludedFromDaily: false,
    }

    vi.spyOn(categoryRepository, 'findAll').mockResolvedValue([])
    vi.spyOn(monthlyPlanRepository, 'findByMonth').mockResolvedValue(plan)
    vi.spyOn(allocationRepository, 'findByPlanId').mockResolvedValue([alloc])
    vi.spyOn(transactionRepository, 'findByDateRange').mockResolvedValue([
      txPastDaily,
      txPastFixed,
      txTodayDaily,
    ])

    const res = await getCycleReportData(monthId, payDay, todayStr)

    // Base daily limit = 3,000,000 / 31 = 96,774đ
    expect(res.baseDailyLimit).toBe(Math.round(3_000_000 / 31))

    // Average daily spend = totalSpentToDate (200k + 300k = 500k, excluding 2M fixed bill) / 2 passed days = 250,000đ
    expect(res.averageDailySpend).toBe(250_000)

    // 1. Check Past Day (2026-10-19):
    // Day 1 has 31 remaining days. Limit = 3,000,000 / 31 = 96,774đ
    const pastItem = res.dailyItems.find((d) => d.date === '2026-10-19')!
    expect(pastItem).toBeDefined()
    expect(pastItem.dailyLimitVnd).toBe(96_774)
    expect(pastItem.spentVnd).toBe(200_000)
    expect(pastItem.balanceVnd).toBe(96_774 - 200_000) // -103,226đ
    expect(pastItem.isToday).toBe(false)
    expect(pastItem.isFuture).toBe(false)

    // 2. Check Today (2026-10-20):
    // Remaining budget after spending 200k (past) and 300k (today) = 3,000,000 - 500,000 = 2,500,000đ
    // Remaining days = 30. Limit = 2,500,000 / 30 = 83,333đ
    const todayItem = res.dailyItems.find((d) => d.date === '2026-10-20')!
    expect(todayItem).toBeDefined()
    expect(todayItem.isToday).toBe(true)
    expect(todayItem.dailyLimitVnd).toBe(83_333)
    expect(todayItem.spentVnd).toBe(300_000)
    expect(todayItem.balanceVnd).toBe(83_333 - 300_000) // -216,667đ

    // 3. Check Future Day (2026-10-21):
    // Standardized 3-state logic: future days project dynamicSafeToSpend (83,333đ)
    const futureItem = res.dailyItems.find((d) => d.date === '2026-10-21')!
    expect(futureItem).toBeDefined()
    expect(futureItem.isFuture).toBe(true)
    expect(futureItem.spentVnd).toBe(0)
    expect(futureItem.dailyLimitVnd).toBe(83_333)
    expect(futureItem.balanceVnd).toBe(83_333)
  })

  it('increases daily limit when user saves money on previous days', async () => {
    // 3-day cycle: 2026-10-01 to 2026-10-03 (3 days)
    // Budget: 300,000đ (100k/day)
    // Day 1 (01/10): user spends ONLY 40,000đ (saves 60,000đ)
    // Day 2 (02/10, Today): limit should INCREASE to (300k - 40k) / 2 = 130,000đ!
    const todayStr = '2026-10-02'
    const monthId = '2026-10'
    const payDay = 1

    const plan: MonthlyPlan = {
      id: 'plan-2',
      month: monthId,
      incomeVnd: 10_000_000,
      createdAt: '',
      updatedAt: '',
    }
    const alloc: MonthlyAllocation = {
      id: 'alloc-2',
      monthlyPlanId: 'plan-2',
      categoryId: 'cat-expenses',
      allocationPercent: 3, // 300,000đ Daily Expenses
      createdAt: '',
      updatedAt: '',
    }

    const txDay1: Transaction = {
      id: 'tx-save-1',
      monthlyPlanId: 'plan-2',
      categoryId: 'cat-expenses',
      amountVnd: 40_000,
      date: '2026-10-01',
      status: 'cleared',
      createdAt: '',
      updatedAt: '',
    }

    vi.spyOn(categoryRepository, 'findAll').mockResolvedValue([])
    vi.spyOn(monthlyPlanRepository, 'findByMonth').mockResolvedValue(plan)
    vi.spyOn(allocationRepository, 'findByPlanId').mockResolvedValue([alloc])
    vi.spyOn(transactionRepository, 'findByDateRange').mockResolvedValue([txDay1])

    const res = await getCycleReportData(monthId, payDay, todayStr)

    // Day 1 (Past): Limit = 300k / 31 = 9,677đ (Oct has 31 days)
    // Let's check Day 2 limit is higher than base limit because Day 1 spent less than expected:
    const day1 = res.dailyItems.find((d) => d.date === '2026-10-01')!
    const day2 = res.dailyItems.find((d) => d.date === '2026-10-02')!

    expect(day1.spentVnd).toBe(40_000)
    // Remaining budget after day 1 is 300k - 40k = 260k for 30 days = 8,667đ
    expect(day2.dailyLimitVnd).toBe(Math.round(260_000 / 30))
    // Average daily spend: 40k / 2 passed days = 20,000đ
    expect(res.averageDailySpend).toBe(20_000)
  })
})
