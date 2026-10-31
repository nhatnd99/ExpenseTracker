/**
 * paydayCycle.ts
 * Logic for Custom Payday Cycle calculation, progress status, and calendar mapping.
 */
import type { DateString, MonthId } from '@/types/models'
import { getTodayString } from '@/services/dateService'

export interface PaydayCycle {
  startDate: DateString
  endDate: DateString
  days: DateString[]
  totalDays: number
}

export interface CycleBudgetProgress {
  budgetVnd: number
  totalSpentVnd: number
  remainingVnd: number
  dailyBudgetVnd: number
  elapsedDays: number
  totalDays: number
  expectedMaxSpentVnd: number
  isOnTrack: boolean
  spentPercent: number
}

/**
 * Returns the month identifier (YYYY-MM) for the cycle that contains a specific date.
 *
 * Rules:
 * - If startDay == 1: returns the month of dateStr.
 * - If startDay > 1:
 *     - If day >= startDay: cycle started in this month -> returns current month YYYY-MM.
 *       (e.g., today = 31/10, startDay = 19 -> 31 >= 19 -> returns "2026-10", cycle is 19/10 to 18/11)
 *     - If day < startDay: cycle started in previous month -> returns previous month YYYY-MM.
 *       (e.g., today = 15/10, startDay = 19 -> 15 < 19 -> returns "2026-09", cycle is 19/09 to 18/10)
 */
export function getCycleMonthForDate(dateStr: DateString, startDay: number = 1): MonthId {
  const safeStartDay = Math.min(28, Math.max(1, Math.floor(startDay)))
  const [yearStr, monthStr, dayStr] = dateStr.split('-')
  const year = parseInt(yearStr, 10)
  const month = parseInt(monthStr, 10)
  const day = parseInt(dayStr, 10)

  if (safeStartDay === 1 || day >= safeStartDay) {
    return `${year}-${String(month).padStart(2, '0')}`
  }

  // day < safeStartDay -> belongs to the cycle that began in the previous month
  const prevYear = month === 1 ? year - 1 : year
  const prevMonth = month === 1 ? 12 : month - 1
  return `${prevYear}-${String(prevMonth).padStart(2, '0')}`
}

/**
 * Shifts a MonthId by a given number of months (+1 for next cycle, -1 for previous cycle).
 */
export function shiftMonthId(monthId: MonthId, offsetMonths: number): MonthId {
  const [yearStr, monthStr] = monthId.split('-')
  const d = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1 + offsetMonths, 1)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

/**
 * Returns the exact Payday Cycle date range for a given cycle monthId and startDay.
 *
 * Examples:
 * - monthId = "2026-10", startDay = 19:
 *   Runs from 2026-10-19 to 2026-11-18.
 *
 * - monthId = "2026-09", startDay = 19:
 *   Runs from 2026-09-19 to 2026-10-18.
 *
 * - monthId = "2026-10", startDay = 1:
 *   Runs from 2026-10-01 to 2026-10-31.
 */
export function getPaydayCycle(monthId: MonthId, startDay: number = 1): PaydayCycle {
  const safeStartDay = Math.min(28, Math.max(1, Math.floor(startDay)))
  const [yearStr, monthStr] = monthId.split('-')
  const year = parseInt(yearStr, 10)
  const month = parseInt(monthStr, 10)

  const startYear = year
  const startMonth = month
  let startDayNum: number

  let endYear = year
  let endMonth = month
  let endDayNum: number

  if (safeStartDay === 1) {
    startDayNum = 1
    endDayNum = new Date(year, month, 0).getDate()
  } else {
    // Starts on year-month-startDay
    const maxDaysCurrent = new Date(year, month, 0).getDate()
    startDayNum = Math.min(safeStartDay, maxDaysCurrent)

    // Ends in next month on startDay - 1
    if (month === 12) {
      endYear = year + 1
      endMonth = 1
    } else {
      endYear = year
      endMonth = month + 1
    }
    const maxDaysNext = new Date(endYear, endMonth, 0).getDate()
    endDayNum = Math.min(safeStartDay - 1, maxDaysNext)
  }

  const startDate: DateString = `${startYear}-${String(startMonth).padStart(2, '0')}-${String(startDayNum).padStart(2, '0')}`
  const endDate: DateString = `${endYear}-${String(endMonth).padStart(2, '0')}-${String(endDayNum).padStart(2, '0')}`

  // Generate list of all dates in the cycle (inclusive)
  const days: DateString[] = []
  const current = new Date(startYear, startMonth - 1, startDayNum)
  const end = new Date(endYear, endMonth - 1, endDayNum)

  while (current <= end) {
    const y = current.getFullYear()
    const m = String(current.getMonth() + 1).padStart(2, '0')
    const d = String(current.getDate()).padStart(2, '0')
    days.push(`${y}-${m}-${d}`)
    current.setDate(current.getDate() + 1)
  }

  return {
    startDate,
    endDate,
    days,
    totalDays: days.length,
  }
}

/**
 * Returns the active cycle containing a given date (e.g. today).
 */
export function getCycleForDate(dateStr: DateString, startDay: number = 1): PaydayCycle {
  const monthId = getCycleMonthForDate(dateStr, startDay)
  return getPaydayCycle(monthId, startDay)
}

/**
 * Calculates progress status (On Track / Off Track) based on the cycle budget and elapsed days.
 * Formula:
 * Daily Standard Limit = Budget / Total Days in Cycle
 * Elapsed Days = count of days from cycle start to min(today, cycle end)
 * On Track if: Total Spent <= (Daily Standard Limit * Elapsed Days)
 */
export function computeCycleProgress(
  budgetVnd: number,
  totalSpentVnd: number,
  cycle: PaydayCycle,
  todayStr: DateString = getTodayString(),
): CycleBudgetProgress {
  const totalDays = cycle.totalDays
  const dailyBudgetVnd = totalDays > 0 ? Math.floor(budgetVnd / totalDays) : 0
  const remainingVnd = budgetVnd - totalSpentVnd

  // Determine elapsed days in this cycle
  let elapsedDays: number
  if (todayStr < cycle.startDate) {
    elapsedDays = 0
  } else if (todayStr > cycle.endDate) {
    elapsedDays = totalDays
  } else {
    const idx = cycle.days.indexOf(todayStr)
    elapsedDays = idx >= 0 ? idx + 1 : 1
  }

  const expectedMaxSpentVnd = dailyBudgetVnd * elapsedDays
  const isOnTrack = budgetVnd > 0 ? totalSpentVnd <= expectedMaxSpentVnd : totalSpentVnd === 0
  const spentPercent = budgetVnd > 0 ? Math.round((totalSpentVnd / budgetVnd) * 100) : 0

  return {
    budgetVnd,
    totalSpentVnd,
    remainingVnd,
    dailyBudgetVnd,
    elapsedDays,
    totalDays,
    expectedMaxSpentVnd,
    isOnTrack,
    spentPercent,
  }
}

/**
 * Formats a VND number into a compact string for small calendar cells (e.g. 50000 -> 50k, 1500000 -> 1.5M)
 */
export function formatCompactVnd(amount: number): string {
  const abs = Math.abs(amount)
  if (abs >= 1_000_000) {
    const val = abs / 1_000_000
    const str = val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)
    return `${str}M`
  }
  if (abs >= 1_000) {
    const val = abs / 1_000
    const str = val % 1 === 0 ? val.toFixed(0) : val.toFixed(0)
    return `${str}k`
  }
  return `${abs}`
}

/**
 * Returns the Monday-based day of week offset for a date (0 = Monday, ..., 6 = Sunday).
 * Useful for grid alignment so that dates fall on their exact day of the week.
 */
export function getDayOfWeekOffset(dateStr: DateString): number {
  const [y, m, d] = dateStr.split('-').map(Number)
  const day = new Date(y, m - 1, d).getDay() // 0 = Sun, 1 = Mon...
  return (day + 6) % 7 // Mon = 0, Tue = 1 ... Sun = 6
}
