import { describe, it, expect } from 'vitest'
import {
  getDaysInMonth,
  parseMonthId,
  calculateAllocationAmount,
  calculateDailyBudget,
  calculateDailyLimit,
  calculateTotalBudget,
  evaluateBudgetStatus,
  buildMonthlyBudgetSummary,
} from '../budgetCalculator'
import type { MonthlyPlan, MonthlyAllocation } from '@/types/models'

describe('getDaysInMonth', () => {
  it('returns 31 for January', () => expect(getDaysInMonth(2024, 1)).toBe(31))
  it('returns 29 for February 2024 (leap year)', () => expect(getDaysInMonth(2024, 2)).toBe(29))
  it('returns 28 for February 2023 (non-leap year)', () => expect(getDaysInMonth(2023, 2)).toBe(28))
  it('returns 30 for April', () => expect(getDaysInMonth(2024, 4)).toBe(30))
  it('returns 31 for December', () => expect(getDaysInMonth(2024, 12)).toBe(31))
})

describe('parseMonthId', () => {
  it('parses a valid month string', () => {
    expect(parseMonthId('2024-01')).toEqual({ year: 2024, month: 1 })
    expect(parseMonthId('2024-12')).toEqual({ year: 2024, month: 12 })
  })

  it('throws on invalid format', () => {
    expect(() => parseMonthId('2024-1')).toThrow()
    expect(() => parseMonthId('24-01')).toThrow()
    expect(() => parseMonthId('')).toThrow()
  })
})

describe('calculateAllocationAmount', () => {
  it('calculates 70% of 10,000,000 VND correctly', () => {
    expect(calculateAllocationAmount(10_000_000, 70)).toBe(7_000_000)
  })

  it('floors the result to avoid fractional VND', () => {
    expect(calculateAllocationAmount(10_000_001, 70)).toBe(7_000_000)
  })

  it('handles 0% allocation', () => {
    expect(calculateAllocationAmount(10_000_000, 0)).toBe(0)
  })

  it('handles 100% allocation', () => {
    expect(calculateAllocationAmount(10_000_000, 100)).toBe(10_000_000)
  })
})

describe('calculateDailyBudget', () => {
  it('divides monthly budget by days in month, floored', () => {
    expect(calculateDailyBudget(30_000_000, 30)).toBe(1_000_000)
  })

  it('floors non-even division', () => {
    expect(calculateDailyBudget(10_000_000, 31)).toBe(322_580)
  })

  it('throws on zero or negative daysInMonth', () => {
    expect(() => calculateDailyBudget(10_000_000, 0)).toThrow(RangeError)
    expect(() => calculateDailyBudget(10_000_000, -1)).toThrow(RangeError)
  })
})

describe('calculateTotalBudget', () => {
  it('sums all allocation amounts', () => {
    const allocations = [
      { allocationPercent: 70 },
      { allocationPercent: 20 },
      { allocationPercent: 10 },
    ]
    expect(calculateTotalBudget(10_000_000, allocations)).toBe(10_000_000)
  })

  it('returns 0 for empty allocations', () => {
    expect(calculateTotalBudget(10_000_000, [])).toBe(0)
  })
})

describe('evaluateBudgetStatus', () => {
  it('returns positive remaining when under budget', () => {
    const result = evaluateBudgetStatus(1_000_000, 800_000)
    expect(result.remainingVnd).toBe(200_000)
    expect(result.isOverBudget).toBe(false)
  })

  it('flags over-budget correctly', () => {
    const result = evaluateBudgetStatus(1_000_000, 1_200_000)
    expect(result.remainingVnd).toBe(-200_000)
    expect(result.isOverBudget).toBe(true)
  })

  it('reports exactly on-budget as not over-budget', () => {
    const result = evaluateBudgetStatus(1_000_000, 1_000_000)
    expect(result.remainingVnd).toBe(0)
    expect(result.isOverBudget).toBe(false)
  })
})

describe('buildMonthlyBudgetSummary', () => {
  const plan: MonthlyPlan = {
    id: 'plan-1',
    month: '2024-01',
    incomeVnd: 10_000_000,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  }

  const allocations: Pick<MonthlyAllocation, 'allocationPercent'>[] = [
    { allocationPercent: 70 },
    { allocationPercent: 30 },
  ]

  it('computes correct monthly summary', () => {
    const today = new Date(2024, 0, 15) // Jan 15
    const result = buildMonthlyBudgetSummary(plan, allocations, 3_000_000, today)

    expect(result.month).toBe('2024-01')
    expect(result.incomeVnd).toBe(10_000_000)
    expect(result.totalExpenseBudgetVnd).toBe(10_000_000)
    expect(result.daysInMonth).toBe(31)
    expect(result.currentDay).toBe(15)
    expect(result.dailyBudgetVnd).toBe(322_580)
    expect(result.totalSpentVnd).toBe(3_000_000)
    expect(result.remainingVnd).toBe(7_000_000)
    expect(result.isOverBudget).toBe(false)
  })
})

describe('calculateDailyLimit', () => {
  it('calculates daily limit for 10M income with 70% daily expenses in 30 days cycle', () => {
    // Daily expenses = (10,000,000 * 70) / 100 = 7,000,000
    // Daily limit = 7,000,000 / 30 = 233,333
    expect(calculateDailyLimit(10_000_000, 70, 30)).toBe(233_333)
  })

  it('calculates daily limit for 10M income with 70% daily expenses in 31 days cycle', () => {
    // Daily expenses = (10,000,000 * 70) / 100 = 7,000,000
    // Daily limit = 7,000,000 / 31 = 225,806
    expect(calculateDailyLimit(10_000_000, 70, 31)).toBe(225_806)
  })

  it('returns 0 if income, percent, or total days is zero or negative', () => {
    expect(calculateDailyLimit(0, 70, 30)).toBe(0)
    expect(calculateDailyLimit(10_000_000, 0, 30)).toBe(0)
    expect(calculateDailyLimit(10_000_000, 70, 0)).toBe(0)
  })
})

