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

    // Average daily spend: strictly includes only past days up to yesterday (19 Oct).
    // Today (20 Oct) is strictly excluded because the day is not yet finished.
    // 200k past spent / 1 active spending day (19 Oct) = 200,000đ
    expect(res.activeSpendingDays).toBe(1)
    expect(res.averageDailySpend).toBe(200_000)
    // Benchmark average active limit:
    // 19 Oct (Past): baseDailyLimit = 96,774đ
    expect(res.averageActiveLimit).toBe(Math.round(3_000_000 / 31))

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
    // Average daily spend: only Day 1 had spending (1 active day) -> 40,000 / 1 = 40,000đ (even though 2 days elapsed)
    expect(res.activeSpendingDays).toBe(1)
    expect(res.averageDailySpend).toBe(40_000)
    // Benchmark limit for Day 1 (Past) is baseDailyLimit = 300,000 / 31 = 9,677đ
    expect(res.averageActiveLimit).toBe(Math.round(300_000 / 31))
  })

  it('calculates average daily spend accurately deduplicating multiple records on same day and ignoring zero days', async () => {
    // 5-day cycle: 2026-10-01 to 2026-10-05
    // Today is Day 5 (2026-10-05) -> 5 days passed
    // But ONLY Day 2 (2 records: 50k + 50k = 100k) and Day 4 (1 record: 200k) have expenses
    // Day 1 has Fixed Bill (Rent: 5M, excluded)
    // Day 3 has Income (Salary: 10M, excluded)
    const todayStr = '2026-10-05'
    const monthId = '2026-10'
    const payDay = 1

    const plan: MonthlyPlan = {
      id: 'plan-3',
      month: monthId,
      incomeVnd: 10_000_000,
      createdAt: '',
      updatedAt: '',
    }
    const alloc: MonthlyAllocation = {
      id: 'alloc-3',
      monthlyPlanId: 'plan-3',
      categoryId: 'cat-expenses',
      allocationPercent: 10, // 1,000,000đ Daily Expenses
      createdAt: '',
      updatedAt: '',
    }

    const txDay1Fixed: Transaction = {
      id: 'tx-fixed-1',
      monthlyPlanId: 'plan-3',
      categoryId: 'cat-fixed',
      amountVnd: 5_000_000,
      date: '2026-10-01',
      status: 'cleared',
      createdAt: '',
      updatedAt: '',
      isExcludedFromDaily: true,
    }
    const txDay2A: Transaction = {
      id: 'tx-d2-a',
      monthlyPlanId: 'plan-3',
      categoryId: 'cat-expenses',
      amountVnd: 50_000,
      date: '2026-10-02',
      status: 'cleared',
      createdAt: '',
      updatedAt: '',
    }
    const txDay2B: Transaction = {
      id: 'tx-d2-b',
      monthlyPlanId: 'plan-3',
      categoryId: 'cat-expenses',
      amountVnd: 50_000,
      date: '2026-10-02',
      status: 'cleared',
      createdAt: '',
      updatedAt: '',
    }
    const txDay3Income: Transaction = {
      id: 'tx-d3-inc',
      monthlyPlanId: 'plan-3',
      categoryId: 'cat-inc-salary',
      amountVnd: 10_000_000,
      date: '2026-10-03',
      status: 'cleared',
      createdAt: '',
      updatedAt: '',
      type: 'income',
    }
    const txDay4: Transaction = {
      id: 'tx-d4',
      monthlyPlanId: 'plan-3',
      categoryId: 'cat-expenses',
      amountVnd: 200_000,
      date: '2026-10-04',
      status: 'cleared',
      createdAt: '',
      updatedAt: '',
    }

    vi.spyOn(categoryRepository, 'findAll').mockResolvedValue([])
    vi.spyOn(monthlyPlanRepository, 'findByMonth').mockResolvedValue(plan)
    vi.spyOn(allocationRepository, 'findByPlanId').mockResolvedValue([alloc])
    vi.spyOn(transactionRepository, 'findByDateRange').mockResolvedValue([
      txDay1Fixed,
      txDay2A,
      txDay2B,
      txDay3Income,
      txDay4,
    ])

    const res = await getCycleReportData(monthId, payDay, todayStr)

    // Active days: Day 2 and Day 4 only = 2 active days (Day 1 fixed bill & Day 3 income are ignored)
    expect(res.activeSpendingDays).toBe(2)
    // Total valid spent: 50k + 50k + 200k = 300,000đ
    // Average daily spend: 300,000 / 2 = 150,000đ
    expect(res.averageDailySpend).toBe(150_000)
    // Benchmark average limit for past active days with snapshots:
    // Day 2 limit = 33,333đ, Day 4 limit (with 10M income) = 389,286đ -> Average = 211,310đ
    expect(res.averageActiveLimit).toBe(Math.round((33_333 + 389_286) / 2))
  })

  it('falls back to baseDailyLimit when there are no active spending days', async () => {
    const todayStr = '2026-10-05'
    const monthId = '2026-10'
    const payDay = 1

    const plan: MonthlyPlan = {
      id: 'plan-empty',
      month: monthId,
      incomeVnd: 10_000_000,
      createdAt: '',
      updatedAt: '',
    }
    const alloc: MonthlyAllocation = {
      id: 'alloc-empty',
      monthlyPlanId: 'plan-empty',
      categoryId: 'cat-expenses',
      allocationPercent: 10, // 1,000,000đ
      createdAt: '',
      updatedAt: '',
    }

    vi.spyOn(categoryRepository, 'findAll').mockResolvedValue([])
    vi.spyOn(monthlyPlanRepository, 'findByMonth').mockResolvedValue(plan)
    vi.spyOn(allocationRepository, 'findByPlanId').mockResolvedValue([alloc])
    vi.spyOn(transactionRepository, 'findByDateRange').mockResolvedValue([])

    const res = await getCycleReportData(monthId, payDay, todayStr)

    expect(res.activeSpendingDays).toBe(0)
    expect(res.averageDailySpend).toBe(0)
    expect(res.averageActiveLimit).toBe(res.baseDailyLimit)
  })

  it('strictly excludes today (even with ISO timestamp) and future transactions from average daily spend', async () => {
    // 31-day cycle: 2026-10-19 to 2026-11-18
    // Today is 2026-10-22 (normalized to 00:00:00)
    // Past days with spending:
    // - 2026-10-19: 100,000đ (ISO timestamp with time: 2026-10-19T14:30:00Z)
    // - 2026-10-21: 200,000đ
    // Today:
    // - 2026-10-22: 500,000đ (ISO timestamp: 2026-10-22T08:00:00Z) -> MUST BE EXCLUDED!
    // Future:
    // - 2026-10-25: 150,000đ -> MUST BE EXCLUDED!
    const todayStr = '2026-10-22'
    const monthId = '2026-10'
    const payDay = 19

    const plan: MonthlyPlan = {
      id: 'plan-time-boundary',
      month: monthId,
      incomeVnd: 6_200_000,
      createdAt: '',
      updatedAt: '',
    }
    const alloc: MonthlyAllocation = {
      id: 'alloc-tb',
      monthlyPlanId: 'plan-time-boundary',
      categoryId: 'cat-expenses',
      allocationPercent: 50, // 3,100,000đ budget -> baseDailyLimit = 100,000đ
      createdAt: '',
      updatedAt: '',
    }

    const txPast1: Transaction = {
      id: 'tx-p1',
      monthlyPlanId: 'plan-time-boundary',
      categoryId: 'cat-expenses',
      amountVnd: 100_000,
      date: '2026-10-19',
      transactionDate: '2026-10-19T14:30:00.000Z',
      status: 'cleared',
      createdAt: '',
      updatedAt: '',
      isExcludedFromDaily: false,
    }
    const txPast2: Transaction = {
      id: 'tx-p2',
      monthlyPlanId: 'plan-time-boundary',
      categoryId: 'cat-expenses',
      amountVnd: 200_000,
      date: '2026-10-21',
      transactionDate: '2026-10-21T14:45:00.000Z',
      status: 'cleared',
      createdAt: '',
      updatedAt: '',
      isExcludedFromDaily: false,
    }
    const txToday: Transaction = {
      id: 'tx-today',
      monthlyPlanId: 'plan-time-boundary',
      categoryId: 'cat-expenses',
      amountVnd: 500_000,
      date: '2026-10-22',
      transactionDate: '2026-10-22T09:15:00.000Z',
      status: 'cleared',
      createdAt: '',
      updatedAt: '',
      isExcludedFromDaily: false,
    }
    const txFuture: Transaction = {
      id: 'tx-future',
      monthlyPlanId: 'plan-time-boundary',
      categoryId: 'cat-expenses',
      amountVnd: 150_000,
      date: '2026-10-25',
      transactionDate: '2026-10-25T10:00:00.000Z',
      status: 'cleared',
      createdAt: '',
      updatedAt: '',
      isExcludedFromDaily: false,
    }

    vi.spyOn(categoryRepository, 'findAll').mockResolvedValue([])
    vi.spyOn(monthlyPlanRepository, 'findByMonth').mockResolvedValue(plan)
    vi.spyOn(allocationRepository, 'findByPlanId').mockResolvedValue([alloc])
    vi.spyOn(transactionRepository, 'findByDateRange').mockResolvedValue([
      txPast1,
      txPast2,
      txToday,
      txFuture,
    ])

    const res = await getCycleReportData(monthId, payDay, todayStr)

    // Base daily limit: 3,100,000 / 31 = 100,000đ
    expect(res.baseDailyLimit).toBe(100_000)

    // Only past days (19 Oct and 21 Oct) are active days (2 days)
    // Today (22 Oct) and Future (25 Oct) are strictly excluded!
    expect(res.activeSpendingDays).toBe(2)
    // Total spent in past = 100k + 200k = 300,000đ
    // Average daily spend = 300,000 / 2 = 150,000đ
    expect(res.averageDailySpend).toBe(150_000)
    // Benchmark average limit for past active days with snapshot:
    // Day 1 (19 Oct): limit 100,000đ
    // Day 3 (21 Oct): limit (3,100,000 - 100,000) / 29 = 103,448đ
    // Average active limit = (100,000 + 103,448) / 2 = 101,724đ
    expect(res.averageActiveLimit).toBe(Math.round((100_000 + 103_448) / 2))
  })

  it('handles edge case when cycle has just started today with expenses (activeSpendingDays = 0, averageSpend = 0)', async () => {
    // Cycle starts on 2026-10-19. Today is day 1: 2026-10-19.
    // User spends 400,000đ today.
    // Since today is NOT finished (transactionDate < today is empty), activeSpendingDays = 0 and averageDailySpend = 0.
    const todayStr = '2026-10-19'
    const monthId = '2026-10'
    const payDay = 19

    const plan: MonthlyPlan = {
      id: 'plan-start',
      month: monthId,
      incomeVnd: 6_200_000,
      createdAt: '',
      updatedAt: '',
    }
    const alloc: MonthlyAllocation = {
      id: 'alloc-start',
      monthlyPlanId: 'plan-start',
      categoryId: 'cat-expenses',
      allocationPercent: 50,
      createdAt: '',
      updatedAt: '',
    }
    const txToday: Transaction = {
      id: 'tx-day1',
      monthlyPlanId: 'plan-start',
      categoryId: 'cat-expenses',
      amountVnd: 400_000,
      date: '2026-10-19',
      transactionDate: '2026-10-19T11:00:00.000Z',
      status: 'cleared',
      createdAt: '',
      updatedAt: '',
      isExcludedFromDaily: false,
    }

    vi.spyOn(categoryRepository, 'findAll').mockResolvedValue([])
    vi.spyOn(monthlyPlanRepository, 'findByMonth').mockResolvedValue(plan)
    vi.spyOn(allocationRepository, 'findByPlanId').mockResolvedValue([alloc])
    vi.spyOn(transactionRepository, 'findByDateRange').mockResolvedValue([txToday])

    const res = await getCycleReportData(monthId, payDay, todayStr)

    // No past days exist before day 1!
    expect(res.activeSpendingDays).toBe(0)
    expect(res.averageDailySpend).toBe(0)
    expect(res.averageActiveLimit).toBe(res.baseDailyLimit)
  })

  it('preserves historical Flex limit snapshots for past days rather than reverting to base limit', async () => {
    // 31-day cycle: 2026-10-01 to 2026-10-31
    // Budget: 300,000đ Daily Expenses
    // Day 1 (01/10): User spends 40,000đ
    // Day 2 (02/10): Limit increases to (300,000 - 40,000) / 30 = 8,667đ. User spends 100,000đ.
    // Today is Day 3 (03/10):
    // Day 1 (Past): Limit = 300k / 31 = 9,677đ (Snapshot), Balance = 9,677 - 40,000 = -30,323đ
    // Day 2 (Past): Limit = 8,667đ (Snapshot preserved!), Balance = 8,667 - 100,000 = -91,333đ. MUST NOT REVERT TO 9,677đ!
    // Day 3 (Today): Limit = (300k - 140k) / 29 = 5,517đ
    const todayStr = '2026-10-03'
    const monthId = '2026-10'
    const payDay = 1

    const plan: MonthlyPlan = {
      id: 'plan-snap-1',
      month: monthId,
      incomeVnd: 10_000_000,
      createdAt: '',
      updatedAt: '',
    }
    const alloc: MonthlyAllocation = {
      id: 'alloc-snap-1',
      monthlyPlanId: 'plan-snap-1',
      categoryId: 'cat-expenses',
      allocationPercent: 3, // 300,000đ Daily Expenses
      createdAt: '',
      updatedAt: '',
    }

    const txDay1: Transaction = {
      id: 'tx-d1',
      monthlyPlanId: 'plan-snap-1',
      categoryId: 'cat-expenses',
      amountVnd: 40_000,
      date: '2026-10-01',
      status: 'cleared',
      createdAt: '',
      updatedAt: '',
      isExcludedFromDaily: false,
    }
    const txDay2: Transaction = {
      id: 'tx-d2',
      monthlyPlanId: 'plan-snap-1',
      categoryId: 'cat-expenses',
      amountVnd: 100_000,
      date: '2026-10-02',
      status: 'cleared',
      createdAt: '',
      updatedAt: '',
      isExcludedFromDaily: false,
    }

    vi.spyOn(categoryRepository, 'findAll').mockResolvedValue([])
    vi.spyOn(monthlyPlanRepository, 'findByMonth').mockResolvedValue(plan)
    vi.spyOn(allocationRepository, 'findByPlanId').mockResolvedValue([alloc])
    vi.spyOn(transactionRepository, 'findByDateRange').mockResolvedValue([txDay1, txDay2])

    const res = await getCycleReportData(monthId, payDay, todayStr)

    const itemDay1 = res.dailyItems.find((d) => d.date === '2026-10-01')!
    const itemDay2 = res.dailyItems.find((d) => d.date === '2026-10-02')!
    const itemDay3 = res.dailyItems.find((d) => d.date === '2026-10-03')!

    expect(itemDay1.dailyLimitVnd).toBe(Math.round(300_000 / 31))
    expect(itemDay1.spentVnd).toBe(40_000)
    expect(itemDay1.balanceVnd).toBe(itemDay1.dailyLimitVnd - 40_000)

    // Day 2 was in past when today is Day 3. Its flex limit snapshot (8,667đ) is preserved!
    expect(itemDay2.dailyLimitVnd).toBe(Math.round((300_000 - 40_000) / 30))
    expect(itemDay2.spentVnd).toBe(100_000)
    expect(itemDay2.balanceVnd).toBe(itemDay2.dailyLimitVnd - 100_000)

    // Day 3 (Today) has no snapshot -> calculated dynamically via safeToSpend
    expect(itemDay3.isToday).toBe(true)
    expect(itemDay3.dailyLimitVnd).toBe(Math.round((300_000 - 140_000) / 29))

    // Snapshots map verification
    expect(res.dailyLimitSnapshots['2026-10-01']).toBe(itemDay1.dailyLimitVnd)
    expect(res.dailyLimitSnapshots['2026-10-02']).toBe(itemDay2.dailyLimitVnd)
    expect(res.dailyLimitSnapshots['2026-10-03']).toBeUndefined() // Today has no snapshot
  })

  it('recalculates and cascades snapshot updates when user backlogs a transaction in the past (log bù)', async () => {
    // Initial state: today is 2026-10-03
    // Day 1 spent was 40,000đ -> Day 2 snapshot limit was (300k - 40k) / 30 = 8,667đ
    // Now user backlogs an additional 30,000đ expense to Day 1!
    // Day 1 spent becomes 70,000đ
    // Day 2 snapshot limit MUST be updated to (300k - 70k) / 30 = 7,667đ!
    const todayStr = '2026-10-03'
    const monthId = '2026-10'
    const payDay = 1

    const plan: MonthlyPlan = {
      id: 'plan-snap-2',
      month: monthId,
      incomeVnd: 10_000_000,
      createdAt: '',
      updatedAt: '',
    }
    const alloc: MonthlyAllocation = {
      id: 'alloc-snap-2',
      monthlyPlanId: 'plan-snap-2',
      categoryId: 'cat-expenses',
      allocationPercent: 3, // 300,000đ
      createdAt: '',
      updatedAt: '',
    }

    const txDay1Original: Transaction = {
      id: 'tx-d1-orig',
      monthlyPlanId: 'plan-snap-2',
      categoryId: 'cat-expenses',
      amountVnd: 40_000,
      date: '2026-10-01',
      status: 'cleared',
      createdAt: '',
      updatedAt: '',
    }
    const txDay1Backlogged: Transaction = {
      id: 'tx-d1-backlog',
      monthlyPlanId: 'plan-snap-2',
      categoryId: 'cat-expenses',
      amountVnd: 30_000,
      date: '2026-10-01',
      status: 'cleared',
      createdAt: '',
      updatedAt: '',
    }

    vi.spyOn(categoryRepository, 'findAll').mockResolvedValue([])
    vi.spyOn(monthlyPlanRepository, 'findByMonth').mockResolvedValue(plan)
    vi.spyOn(allocationRepository, 'findByPlanId').mockResolvedValue([alloc])
    vi.spyOn(transactionRepository, 'findByDateRange').mockResolvedValue([
      txDay1Original,
      txDay1Backlogged,
    ])

    const res = await getCycleReportData(monthId, payDay, todayStr)

    const itemDay2 = res.dailyItems.find((d) => d.date === '2026-10-02')!
    // Day 2 snapshot limit dynamically updated with cascaded cashflow:
    // (300,000 - 70,000) / 30 = 7,667đ
    expect(itemDay2.dailyLimitVnd).toBe(Math.round((300_000 - 70_000) / 30))
    expect(res.dailyLimitSnapshots['2026-10-02']).toBe(Math.round((300_000 - 70_000) / 30))
  })
})
