import { describe, it, expect } from 'vitest'
import {
  calculatePassedDays,
  calculateRemainingDays,
  calculateSpentToDate,
  calculateExtraIncome,
  calculateDynamicBudget,
} from '../dynamicBudgetCalculator'
import type { Transaction } from '@/types/models'
import type { PaydayCycle } from '@/features/reports/paydayCycle'

function makeTx(overrides: Partial<Transaction>): Transaction {
  return {
    id: 'tx-1',
    monthlyPlanId: 'plan-1',
    categoryId: 'cat-expenses',
    amountVnd: 50_000,
    date: '2026-10-20',
    status: 'cleared',
    createdAt: '2026-10-20T00:00:00.000Z',
    updatedAt: '2026-10-20T00:00:00.000Z',
    ...overrides,
  }
}

describe('Dynamic Safe-to-Spend: dynamicBudgetCalculator', () => {
  const sampleCycle: PaydayCycle = {
    startDate: '2026-10-19',
    endDate: '2026-11-18',
    days: [
      '2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23',
      '2026-10-24', '2026-10-25', '2026-10-26', '2026-10-27', '2026-10-28',
      '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02',
      '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07',
      '2026-11-08', '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12',
      '2026-11-13', '2026-11-14', '2026-11-15', '2026-11-16', '2026-11-17',
      '2026-11-18',
    ],
    totalDays: 31,
  }

  describe('Bước 1: Xác định thời gian (calculatePassedDays & calculateRemainingDays)', () => {
    it('calculates passedDays as 1 on the first day of the cycle', () => {
      expect(calculatePassedDays(sampleCycle, '2026-10-19')).toBe(1)
    })

    it('calculates passedDays correctly for a mid-cycle date', () => {
      // 2026-10-25 is index 6 -> passedDays is 7
      expect(calculatePassedDays(sampleCycle, '2026-10-25')).toBe(7)
    })

    it('calculates passedDays as totalDays on the final cycle date', () => {
      expect(calculatePassedDays(sampleCycle, '2026-11-18')).toBe(31)
    })

    it('handles dates before startDate or after endDate safely', () => {
      expect(calculatePassedDays(sampleCycle, '2026-10-10')).toBe(1)
      expect(calculatePassedDays(sampleCycle, '2026-11-25')).toBe(31)
    })

    it('calculates remainingDays correctly with formula totalDays - passedDays + 1', () => {
      // Day 1 of 30: remaining = 30 - 1 + 1 = 30
      expect(calculateRemainingDays(30, 1)).toBe(30)
      // Day 10 of 30: remaining = 30 - 10 + 1 = 21
      expect(calculateRemainingDays(30, 10)).toBe(21)
      // Day 30 of 30: remaining = 30 - 30 + 1 = 1 (never 0, prevents division by 0)
      expect(calculateRemainingDays(30, 30)).toBe(1)
      // Edge case: passedDays exceeds totalDays -> remaining is still at least 1
      expect(calculateRemainingDays(30, 35)).toBe(1)
    })
  })

  describe('Bước 2: Xác định dòng tiền (calculateSpentToDate & calculateExtraIncome)', () => {
    it('sums daily expenses and ignores transactions marked with isExcludedFromDaily: true and ignores income', () => {
      const txs: Transaction[] = [
        makeTx({ id: '1', date: '2026-10-19', amountVnd: 50_000, isExcludedFromDaily: false, type: 'expense' }),
        makeTx({ id: '2', date: '2026-10-20', amountVnd: 3_000_000, isExcludedFromDaily: true }), // Rent bill
        makeTx({ id: '3', date: '2026-10-21', amountVnd: 70_000 }),
        makeTx({ id: '4', date: '2026-10-21', amountVnd: 500_000, type: 'income' }), // Income bonus
        makeTx({ id: '5', date: '2026-10-25', amountVnd: 100_000, isExcludedFromDaily: false }), // future relative to 2026-10-22
      ]

      const spent = calculateSpentToDate(txs, '2026-10-19', '2026-10-22')
      expect(spent).toBe(120_000) // 50k + 70k, ignores 3M rent, 500k income, and 100k future tx
    })

    it('sums extra income correctly within date range', () => {
      const txs: Transaction[] = [
        makeTx({ id: '1', date: '2026-10-19', amountVnd: 50_000, type: 'expense' }),
        makeTx({ id: '2', date: '2026-10-20', amountVnd: 1_000_000, type: 'income' }), // Bonus
        makeTx({ id: '3', date: '2026-10-21', amountVnd: 200_000, type: 'income' }), // Debt returned
        makeTx({ id: '4', date: '2026-10-25', amountVnd: 500_000, type: 'income' }), // Future income
      ]

      const income = calculateExtraIncome(txs, '2026-10-19', '2026-10-22')
      expect(income).toBe(1_200_000) // 1M + 200k, ignores future income and expense
    })
  })

  describe('Income Integration into calculateDynamicBudget', () => {
    it('increases remaining budget and today limit when extra income is recorded', () => {
      // Without extra income:
      const withoutIncome = calculateDynamicBudget({
        totalDays: 30,
        passedDays: 10,
        baseBudget: 6_000_000,
        spentToDate: 1_400_000,
        totalExtraIncome: 0,
      })
      expect(withoutIncome.remainingBudget).toBe(4_600_000)
      expect(withoutIncome.todayLimit).toBe(Math.round(4_600_000 / 21)) // 219,048

      // With extra income of 1,000,000 VND:
      const withIncome = calculateDynamicBudget({
        totalDays: 30,
        passedDays: 10,
        baseBudget: 6_000_000,
        spentToDate: 1_400_000,
        totalExtraIncome: 1_000_000,
      })
      // Remaining budget = (6M + 1M) - 1.4M = 5.6M
      expect(withIncome.remainingBudget).toBe(5_600_000)
      expect(withIncome.todayLimit).toBe(Math.round(5_600_000 / 21)) // 266,667
      expect(withIncome.totalExtraIncome).toBe(1_000_000)
      expect(withIncome.todayLimit).toBeGreaterThan(withoutIncome.todayLimit)
    })
  })

  describe('Bước 3 & Bước 4: calculateDynamicBudget (Safe-to-Spend & Pace)', () => {
    it('calculates higher daily limit and positive pace when user is saving ahead of pace', () => {
      const res = calculateDynamicBudget({
        totalDays: 30,
        passedDays: 10,
        baseBudget: 6_000_000,
        spentToDate: 1_400_000,
      })

      expect(res.remainingDays).toBe(21) // 30 - 10 + 1
      expect(res.remainingBudget).toBe(4_600_000) // 6M - 1.4M
      expect(res.todayLimit).toBe(Math.round(4_600_000 / 21)) // 219,048
      expect(res.idealSpent).toBe(2_000_000) // (6M / 30) * 10
      expect(res.paceBalance).toBe(600_000) // 2M - 1.4M
      expect(res.isOnTrack).toBe(true)
    })

    it('calculates lower daily limit and negative pace when user is overspending', () => {
      const res = calculateDynamicBudget({
        totalDays: 30,
        passedDays: 10,
        baseBudget: 6_000_000,
        spentToDate: 2_600_000,
      })

      expect(res.remainingDays).toBe(21)
      expect(res.remainingBudget).toBe(3_400_000)
      expect(res.todayLimit).toBe(Math.round(3_400_000 / 21)) // 161,905
      expect(res.idealSpent).toBe(2_000_000)
      expect(res.paceBalance).toBe(-600_000)
      expect(res.isOnTrack).toBe(false)
    })

    it('handles edge case: sets todayLimit to 0 when remainingBudget <= 0', () => {
      const res = calculateDynamicBudget({
        totalDays: 30,
        passedDays: 15,
        baseBudget: 5_000_000,
        spentToDate: 5_500_000, // overspent monthly budget
      })

      expect(res.remainingBudget).toBe(-500_000)
      expect(res.todayLimit).toBe(0) // No negative daily limit
      expect(res.paceBalance).toBeLessThan(0)
      expect(res.isOnTrack).toBe(false)
    })

    it('handles the final day of the cycle: remainingDays = 1 and todayLimit = remainingBudget', () => {
      const res = calculateDynamicBudget({
        totalDays: 30,
        passedDays: 30,
        baseBudget: 6_000_000,
        spentToDate: 5_700_000,
      })

      expect(res.remainingDays).toBe(1)
      expect(res.remainingBudget).toBe(300_000)
      expect(res.todayLimit).toBe(300_000)
      expect(res.idealSpent).toBe(6_000_000)
      expect(res.paceBalance).toBe(300_000)
      expect(res.isOnTrack).toBe(true)
    })
  })
})

