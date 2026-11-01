import { describe, it, expect, vi, beforeEach } from 'vitest'
import { monthlyPlanRepository } from '@/repositories/monthlyPlanRepository'
import { allocationRepository } from '@/repositories/allocationRepository'
import { transactionRepository } from '@/repositories/transactionRepository'
import { categoryRepository } from '@/repositories/categoryRepository'
import { getCycleReportData } from '../reportService'
import type { MonthlyPlan, MonthlyAllocation, Transaction } from '@/types/models'

describe('reportService - 3-State Time Logic & Dynamic Safe-to-Spend', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('applies Past, Today, and Future balance logic accurately with fixed bills filtered', async () => {
    // 3-day cycle for simple testing: 2026-10-19 to 2026-10-21 (total 3 days)
    // Today is 2026-10-20 (Mid-cycle: 19 is Past, 20 is Today, 21 is Future)
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
      allocationPercent: 50, // 3,000,000 VND Daily Expenses
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

    // Base daily limit = 3,000,000 / 31 (for standard 31-day cycle 19/10 to 18/11) = 96,774đ
    expect(res.baseDailyLimit).toBe(Math.round(3_000_000 / res.cycle.totalDays))

    // 1. Check Past Day (2026-10-19):
    const pastItem = res.dailyItems.find((d) => d.date === '2026-10-19')!
    expect(pastItem).toBeDefined()
    // spentVnd must filter out the 2,000,000 rent bill:
    expect(pastItem.spentVnd).toBe(200_000)
    // Past balance = baseDailyLimit - spentOnThisDay:
    expect(pastItem.balanceVnd).toBe(res.baseDailyLimit - 200_000)
    expect(pastItem.isToday).toBe(false)
    expect(pastItem.isFuture).toBe(false)

    // 2. Check Today (2026-10-20):
    const todayItem = res.dailyItems.find((d) => d.date === '2026-10-20')!
    expect(todayItem).toBeDefined()
    expect(todayItem.isToday).toBe(true)
    expect(todayItem.spentVnd).toBe(300_000)
    // Today balance = safeToSpend - spentOnThisDay:
    expect(todayItem.balanceVnd).toBe(res.safeToSpend - 300_000)

    // 3. Check Future Day (2026-10-21):
    const futureItem = res.dailyItems.find((d) => d.date === '2026-10-21')!
    expect(futureItem).toBeDefined()
    expect(futureItem.isFuture).toBe(true)
    expect(futureItem.spentVnd).toBe(0)
    // Future balance = safeToSpend (Projection, not deducting anything):
    expect(futureItem.balanceVnd).toBe(res.safeToSpend)
  })
})
