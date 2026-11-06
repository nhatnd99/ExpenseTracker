import { describe, it, expect, beforeEach } from 'vitest'
import {
  getDailyLimitSnapshots,
  saveDailyLimitSnapshots,
  clearDailyLimitSnapshots,
  calculateCycleSnapshots,
  syncCycleSnapshots,
  DAILY_LIMIT_SNAPSHOTS_STORAGE_KEY,
} from '../snapshotService'
import { getPaydayCycle } from '../paydayCycle'
import type { Transaction } from '@/types/models'

describe('snapshotService - Daily Limit Snapshot Management', () => {
  beforeEach(() => {
    window.localStorage.clear()
    clearDailyLimitSnapshots()
  })

  it('reads and writes snapshots to LocalStorage', () => {
    expect(getDailyLimitSnapshots()).toEqual({})

    const mockData = {
      '2026-10-19': 100_000,
      '2026-10-20': 105_000,
    }

    saveDailyLimitSnapshots(mockData)
    expect(getDailyLimitSnapshots()).toEqual(mockData)
    expect(window.localStorage.getItem(DAILY_LIMIT_SNAPSHOTS_STORAGE_KEY)).toBe(
      JSON.stringify(mockData),
    )
  })

  it('calculates chronological flex limits strictly for past days and excludes today and future', () => {
    // 5-day cycle: 2026-10-01 to 2026-10-05 (5 days)
    // Budget: 500,000 VND (100,000 VND / day base)
    // Today is Day 3 (2026-10-03)
    // Day 1 (01/10): user spends 50,000 VND (saving 50,000 VND)
    // Day 2 (02/10): remaining budget is (500k - 50k) / 4 = 112,500 VND. User spends 150,000 VND.
    // Day 3 (03/10, Today): has NOT ended -> MUST NOT BE IN SNAPSHOTS!
    // Day 4 & 5 (Future): MUST NOT BE IN SNAPSHOTS!
    const cycle = getPaydayCycle('2026-10', 1)
    const todayStr = '2026-10-03'
    const budgetVnd = 500_000

    const txDay1: Transaction = {
      id: 'tx-1',
      monthlyPlanId: 'p1',
      categoryId: 'c1',
      amountVnd: 50_000,
      date: '2026-10-01',
      status: 'cleared',
      createdAt: '',
      updatedAt: '',
    }
    const txDay2: Transaction = {
      id: 'tx-2',
      monthlyPlanId: 'p1',
      categoryId: 'c1',
      amountVnd: 150_000,
      date: '2026-10-02',
      status: 'cleared',
      createdAt: '',
      updatedAt: '',
    }

    const snapshots = calculateCycleSnapshots({
      cycle,
      budgetVnd,
      transactions: [txDay1, txDay2],
      todayStr,
    })

    // Cycle total days in October is 31:
    // Day 1: 500,000 / 31 = 16,129đ
    // Day 2: (500,000 - 50,000) / 30 = 15,000đ
    expect(snapshots['2026-10-01']).toBe(Math.round(500_000 / 31))
    expect(snapshots['2026-10-02']).toBe(Math.round((500_000 - 50_000) / 30))

    // Today and future are not snapshotted
    expect(snapshots['2026-10-03']).toBeUndefined()
    expect(snapshots['2026-10-04']).toBeUndefined()
  })

  it('updates subsequent day snapshots when user backlogs a transaction (log bù)', () => {
    const cycle = getPaydayCycle('2026-10', 1)
    const todayStr = '2026-10-03'
    const budgetVnd = 500_000

    // Initial state: Day 1 spent 50,000đ
    const txDay1: Transaction = {
      id: 'tx-1',
      monthlyPlanId: 'p1',
      categoryId: 'c1',
      amountVnd: 50_000,
      date: '2026-10-01',
      status: 'cleared',
      createdAt: '',
      updatedAt: '',
    }

    const initialSnapshots = syncCycleSnapshots({
      cycle,
      budgetVnd,
      transactions: [txDay1],
      todayStr,
    })
    expect(initialSnapshots['2026-10-02']).toBe(Math.round((500_000 - 50_000) / 30)) // 15,000đ

    // User logs bù: adds 70,000đ to Day 1!
    const txDay1Backlog: Transaction = {
      id: 'tx-backlog',
      monthlyPlanId: 'p1',
      categoryId: 'c1',
      amountVnd: 70_000,
      date: '2026-10-01',
      status: 'cleared',
      createdAt: '',
      updatedAt: '',
    }

    const updatedSnapshots = syncCycleSnapshots({
      cycle,
      budgetVnd,
      transactions: [txDay1, txDay1Backlog],
      todayStr,
    })

    // Day 2 snapshot updates to reflect Day 1's increased spending:
    // (500,000 - 120,000) / 30 = 12,667đ
    expect(updatedSnapshots['2026-10-02']).toBe(Math.round((500_000 - 120_000) / 30))
    expect(getDailyLimitSnapshots()['2026-10-02']).toBe(Math.round((500_000 - 120_000) / 30))
  })
})

