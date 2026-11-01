import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useBudgetCalculator } from '../hooks/useBudgetCalculator'

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

  it('auto-balances when Fixed Bills amount increases', () => {
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
    expect(result.current.totalPercent).toBe(100)

    // Fixed bills increase to 4.000.000 (40%)
    fixedTotal = 4_000_000
    rerender({ total: fixedTotal })

    expect(result.current.fixedBillsPercent).toBe(40)
    // Savings buffers from 20% down to 10%
    expect(result.current.savingsPercent).toBe(10)
    expect(result.current.dailyPercent).toBe(50)
    expect(result.current.totalPercent).toBe(100)
  })
})

