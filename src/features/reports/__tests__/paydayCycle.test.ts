import { describe, it, expect } from 'vitest'
import {
  getPaydayCycle,
  getCycleMonthForDate,
  getCycleForDate,
  shiftMonthId,
  computeCycleProgress,
  formatCompactVnd,
  getDayOfWeekOffset,
} from '../paydayCycle'

describe('paydayCycle helpers', () => {
  it('correctly resolves cycle for startDay = 19 and today = 31/10 (Requirement 3: Ví dụ 1)', () => {
    // startDay = 19, today = 31/10. 31 >= 19 -> month is 2026-10
    const cycleMonth = getCycleMonthForDate('2026-10-31', 19)
    expect(cycleMonth).toBe('2026-10')

    const cycle = getPaydayCycle('2026-10', 19)
    expect(cycle.startDate).toBe('2026-10-19')
    expect(cycle.endDate).toBe('2026-11-18')
    expect(cycle.days).toContain('2026-10-31')

    // getCycleForDate directly returns this cycle
    const directCycle = getCycleForDate('2026-10-31', 19)
    expect(directCycle.startDate).toBe('2026-10-19')
    expect(directCycle.endDate).toBe('2026-11-18')
  })

  it('correctly resolves cycle for startDay = 19 and today = 15/10 (Requirement 3: Ví dụ 2)', () => {
    // startDay = 19, today = 15/10. 15 < 19 -> month is 2026-09
    const cycleMonth = getCycleMonthForDate('2026-10-15', 19)
    expect(cycleMonth).toBe('2026-09')

    const cycle = getPaydayCycle('2026-09', 19)
    expect(cycle.startDate).toBe('2026-09-19')
    expect(cycle.endDate).toBe('2026-10-18')
    expect(cycle.days).toContain('2026-10-15')
  })

  it('calculates standard calendar month when startDay = 1 (Default)', () => {
    const cycleMonth = getCycleMonthForDate('2026-10-31', 1)
    expect(cycleMonth).toBe('2026-10')

    const cycle = getPaydayCycle('2026-10', 1)
    expect(cycle.startDate).toBe('2026-10-01')
    expect(cycle.endDate).toBe('2026-10-31')
    expect(cycle.totalDays).toBe(31)
  })

  it('handles year transitions cleanly (January and December)', () => {
    // 10 Jan 2026 with startDay = 15 -> 10 < 15 -> month is 2025-12 (2025-12-15 to 2026-01-14)
    const cycleMonth = getCycleMonthForDate('2026-01-10', 15)
    expect(cycleMonth).toBe('2025-12')

    const cycle = getPaydayCycle('2025-12', 15)
    expect(cycle.startDate).toBe('2025-12-15')
    expect(cycle.endDate).toBe('2026-01-14')
    expect(cycle.days).toContain('2026-01-10')
  })

  it('shifts monthId accurately', () => {
    expect(shiftMonthId('2026-10', 1)).toBe('2026-11')
    expect(shiftMonthId('2026-10', -1)).toBe('2026-09')
    expect(shiftMonthId('2026-01', -1)).toBe('2025-12')
    expect(shiftMonthId('2025-12', 1)).toBe('2026-01')
  })

  it('computes On Track status correctly', () => {
    const cycle = getPaydayCycle('2026-10', 19) // 19/10 to 18/11 (31 days)
    const budget = 3_100_000 // 100k per day
    // 5 days elapsed (2026-10-23) -> max expected = 500k
    const today = '2026-10-23'
    const progressOnTrack = computeCycleProgress(budget, 400_000, cycle, today)
    expect(progressOnTrack.dailyBudgetVnd).toBe(100_000)
    expect(progressOnTrack.elapsedDays).toBe(5)
    expect(progressOnTrack.expectedMaxSpentVnd).toBe(500_000)
    expect(progressOnTrack.isOnTrack).toBe(true)

    // Spent 600k (> 500k) -> Off Track
    const progressOffTrack = computeCycleProgress(budget, 600_000, cycle, today)
    expect(progressOffTrack.isOnTrack).toBe(false)
  })

  it('formats compact currency properly and avoids redundant .0M on round millions', () => {
    expect(formatCompactVnd(50_000)).toBe('50k')
    expect(formatCompactVnd(1_500_000)).toBe('1.5M')
    expect(formatCompactVnd(2_000_000)).toBe('2M')
    expect(formatCompactVnd(5_000_000)).toBe('5M') // Not 5.0M
    expect(formatCompactVnd(4_990_000)).toBe('5M') // Rounds to 5M, not 5.0M
    expect(formatCompactVnd(4_900_000)).toBe('4.9M')
    expect(formatCompactVnd(500)).toBe('500')
  })

  it('calculates day of week offset properly', () => {
    // 2026-10-19 is a Monday -> offset 0
    expect(getDayOfWeekOffset('2026-10-19')).toBe(0)
    // 2026-10-25 is a Sunday -> offset 6
    expect(getDayOfWeekOffset('2026-10-25')).toBe(6)
  })
})
