import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import {
  useBudgetCalculator,
  calculateRebalanceOnFixedBillsChange,
} from '../hooks/useBudgetCalculator'

describe('useBudgetCalculator Auto-balancing Math', () => {
  it('automatically calculates fixedBillsPercent strictly as integer Math.round', () => {
    // 3.300.000 / 10.000.000 = 33%
    const { result } = renderHook(() =>
      useBudgetCalculator({
        income: 10_000_000,
        fixedBillsTotalVnd: 3_300_000,
        initialDailyPercent: 50,
        initialSavingsPercent: 17,
      }),
    )

    expect(result.current.fixedBillsPercent).toBe(33)
    expect(result.current.totalPercent).toBe(100)
    expect(result.current.isAllocationValid).toBe(true)
  })

  it('auto-balances: when user changes Daily Expenses %, Savings absorbs the difference to stay at 100%', () => {
    const { result } = renderHook(() =>
      useBudgetCalculator({
        income: 10_000_000,
        fixedBillsTotalVnd: 3_000_000, // 30%
        initialDailyPercent: 50,
        initialSavingsPercent: 20,
      }),
    )

    expect(result.current.fixedBillsPercent).toBe(30)
    expect(result.current.dailyPercent).toBe(50)
    expect(result.current.savingsPercent).toBe(20)
    expect(result.current.totalPercent).toBe(100)

    // User increases Daily to 60% -> Savings should automatically reduce to 10%
    act(() => {
      result.current.setDailyPercent(60)
    })

    expect(result.current.dailyPercent).toBe(60)
    expect(result.current.savingsPercent).toBe(10)
    expect(result.current.totalPercent).toBe(100)

    // User reduces Daily to 40% -> Savings should automatically increase to 30%
    act(() => {
      result.current.setDailyPercent(40)
    })

    expect(result.current.dailyPercent).toBe(40)
    expect(result.current.savingsPercent).toBe(30)
    expect(result.current.totalPercent).toBe(100)
  })

  it('auto-balances: when user changes Savings %, Daily Expenses absorbs the difference', () => {
    const { result } = renderHook(() =>
      useBudgetCalculator({
        income: 10_000_000,
        fixedBillsTotalVnd: 3_000_000, // 30%
        initialDailyPercent: 50,
        initialSavingsPercent: 20,
      }),
    )

    act(() => {
      result.current.setSavingsPercent(35)
    })

    expect(result.current.savingsPercent).toBe(35)
    expect(result.current.dailyPercent).toBe(35)
    expect(result.current.totalPercent).toBe(100)
  })

  it('when Fixed Bills amount increases: Savings stays unchanged, Daily Expenses absorbs the difference', () => {
    let fixedTotal = 3_000_000 // 30%
    const { result, rerender } = renderHook(
      ({ total }) =>
        useBudgetCalculator({
          income: 10_000_000,
          fixedBillsTotalVnd: total,
          initialDailyPercent: 50,
          initialSavingsPercent: 20,
        }),
      { initialProps: { total: fixedTotal } },
    )

    expect(result.current.fixedBillsPercent).toBe(30)
    expect(result.current.savingsPercent).toBe(20)
    expect(result.current.dailyPercent).toBe(50)
    expect(result.current.totalPercent).toBe(100)

    // Fixed bills increase to 4.000.000 (40%)
    fixedTotal = 4_000_000
    rerender({ total: fixedTotal })

    expect(result.current.fixedBillsPercent).toBe(40)
    // Savings % MUST remain unchanged at 20%
    expect(result.current.savingsPercent).toBe(20)
    // Daily Expenses absorbs the +10% increase by decreasing from 50% down to 40%
    expect(result.current.dailyPercent).toBe(40)
    expect(result.current.totalPercent).toBe(100)
  })

  it('when Fixed Bills amount decreases: Savings stays unchanged, Daily Expenses absorbs the surplus', () => {
    let fixedTotal = 3_000_000 // 30%
    const { result, rerender } = renderHook(
      ({ total }) =>
        useBudgetCalculator({
          income: 10_000_000,
          fixedBillsTotalVnd: total,
          initialDailyPercent: 50,
          initialSavingsPercent: 20,
        }),
      { initialProps: { total: fixedTotal } },
    )

    expect(result.current.fixedBillsPercent).toBe(30)
    expect(result.current.savingsPercent).toBe(20)
    expect(result.current.dailyPercent).toBe(50)

    // Fixed bills decrease to 2.000.000 (20%)
    fixedTotal = 2_000_000
    rerender({ total: fixedTotal })

    expect(result.current.fixedBillsPercent).toBe(20)
    // Savings % remains 20%
    expect(result.current.savingsPercent).toBe(20)
    // Daily Expenses absorbs the -10% drop by increasing from 50% to 60%
    expect(result.current.dailyPercent).toBe(60)
    expect(result.current.totalPercent).toBe(100)
  })

  it('Edge Case: when Fixed Bills exceeds (100% - Savings%), Daily Expenses clamps to 0% and remainder deducts from Savings', () => {
    let fixedTotal = 3_000_000 // 30%
    const { result, rerender } = renderHook(
      ({ total }) =>
        useBudgetCalculator({
          income: 10_000_000,
          fixedBillsTotalVnd: total,
          initialDailyPercent: 50,
          initialSavingsPercent: 20,
        }),
      { initialProps: { total: fixedTotal } },
    )

    // User adds huge fixed bills: 8.500.000 (85%)
    // 100% - 85% - 20% = -5%
    fixedTotal = 8_500_000
    rerender({ total: fixedTotal })

    expect(result.current.fixedBillsPercent).toBe(85)
    // Daily Expenses clamps to 0%
    expect(result.current.dailyPercent).toBe(0)
    // Savings absorbs the -5% deficit: 20% - 5% = 15%
    expect(result.current.savingsPercent).toBe(15)
    expect(result.current.totalPercent).toBe(100)
  })

  it('Edge Case: when Fixed Bills reaches 100%, both Daily Expenses and Savings become 0%', () => {
    let fixedTotal = 3_000_000 // 30%
    const { result, rerender } = renderHook(
      ({ total }) =>
        useBudgetCalculator({
          income: 10_000_000,
          fixedBillsTotalVnd: total,
          initialDailyPercent: 50,
          initialSavingsPercent: 20,
        }),
      { initialProps: { total: fixedTotal } },
    )

    fixedTotal = 10_000_000 // 100%
    rerender({ total: fixedTotal })

    expect(result.current.fixedBillsPercent).toBe(100)
    expect(result.current.dailyPercent).toBe(0)
    expect(result.current.savingsPercent).toBe(0)
    expect(result.current.totalPercent).toBe(100)
  })
})

describe('calculateRebalanceOnFixedBillsChange pure function', () => {
  it('keeps savings unchanged and absorbs difference into daily expenses', () => {
    // Fixed: 40%, Savings: 20% -> Daily: 100 - 40 - 20 = 40%
    const result1 = calculateRebalanceOnFixedBillsChange(40, 20)
    expect(result1.dailyPercent).toBe(40)
    expect(result1.savingsPercent).toBe(20)

    // Fixed: 20%, Savings: 20% -> Daily: 100 - 20 - 20 = 60%
    const result2 = calculateRebalanceOnFixedBillsChange(20, 20)
    expect(result2.dailyPercent).toBe(60)
    expect(result2.savingsPercent).toBe(20)
  })

  it('handles negative daily expenses edge case by clamping to 0% and deducting from savings', () => {
    // Fixed: 85%, Savings: 20% -> Daily: 100 - 85 - 20 = -5% => Daily: 0%, Savings: 15%
    const result = calculateRebalanceOnFixedBillsChange(85, 20)
    expect(result.dailyPercent).toBe(0)
    expect(result.savingsPercent).toBe(15)
  })

  it('handles custom categories sum properly', () => {
    // Fixed: 30%, Savings: 20%, Customs: 10% -> Daily: 100 - 30 - 20 - 10 = 40%
    const result = calculateRebalanceOnFixedBillsChange(30, 20, 10)
    expect(result.dailyPercent).toBe(40)
    expect(result.savingsPercent).toBe(20)
  })
})
