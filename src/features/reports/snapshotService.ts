/**
 * snapshotService.ts
 * Manages daily limit snapshots for historical data consistency on the Reports page.
 * Snapshots record the actual Flex Limit (Safe-to-Spend) allocated for each past day.
 * Persists in LocalStorage for instant, reactive, and reliable retrieval.
 */
import type { DateString, Transaction } from '@/types/models'
import type { PaydayCycle } from './paydayCycle'
import { parseDateString, getTodayString } from '@/services/dateService'
import { isBefore } from 'date-fns'

export const DAILY_LIMIT_SNAPSHOTS_STORAGE_KEY = 'expense_tracker_daily_limit_snapshots'

/**
 * Reads all daily limit snapshots from LocalStorage.
 */
export function getDailyLimitSnapshots(): Record<DateString, number> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(DAILY_LIMIT_SNAPSHOTS_STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<DateString, number>
  } catch (err) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn('[snapshotService] Failed to read snapshots from localStorage:', err)
    }
    return {}
  }
}

/**
 * Saves daily limit snapshots to LocalStorage.
 */
export function saveDailyLimitSnapshots(snapshots: Record<DateString, number>): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(DAILY_LIMIT_SNAPSHOTS_STORAGE_KEY, JSON.stringify(snapshots))
  } catch (err) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn('[snapshotService] Failed to save snapshots to localStorage:', err)
    }
  }
}

/**
 * Retrieves a single snapshot for a given date.
 */
export function getDailyLimitSnapshot(date: DateString): number | undefined {
  const snapshots = getDailyLimitSnapshots()
  return snapshots[date]
}

/**
 * Clears all snapshots (useful for tests or full resets).
 */
export function clearDailyLimitSnapshots(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(DAILY_LIMIT_SNAPSHOTS_STORAGE_KEY)
  } catch (err) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn('[snapshotService] Failed to clear snapshots:', err)
    }
  }
}

export interface CalculateCycleSnapshotsParams {
  cycle: PaydayCycle
  budgetVnd: number
  transactions: Transaction[]
  todayStr?: DateString
}

/**
 * Calculates or recalculates the chronological Flex limits for all past days in a cycle.
 *
 * Algorithm (Sequential Cash-Flow Simulation):
 * For each day in the cycle from day 1 to totalDays:
 * - If the day has ended (date < todayStr):
 *     remainingDays = totalDays - passedDays + 1
 *     remainingBudget = (baseBudget + extraIncomeUpToDate) - spentBeforeThisDay
 *     limit = remainingBudget > 0 ? Math.round(remainingBudget / remainingDays) : 0
 *     snapshot[date] = limit
 *     cumulativeSpentBefore += actualDailySpentOnThisDay
 * - If the day is today or future (date >= todayStr):
 *     No snapshot is stored (Step 3: dynamic safe-to-spend is used).
 */
export function calculateCycleSnapshots({
  cycle,
  budgetVnd,
  transactions,
  todayStr,
}: CalculateCycleSnapshotsParams): Record<DateString, number> {
  const activeToday = todayStr ?? getTodayString()
  const todayDateObj = parseDateString(activeToday)

  if (!cycle || cycle.totalDays <= 0 || !cycle.days || cycle.days.length === 0) {
    return {}
  }

  // Pre-calculate daily spent map (strictly daily expenses, excluding fixed bills and income)
  const dailySpentMap: Record<DateString, number> = {}
  for (const date of cycle.days) {
    dailySpentMap[date] = 0
  }
  for (const tx of transactions) {
    if (tx.type !== 'income' && !tx.isExcludedFromDaily && dailySpentMap[tx.date] !== undefined) {
      dailySpentMap[tx.date] += Number(tx.amountVnd) || 0
    }
  }

  // Pre-calculate extra income up to each date
  const extraIncomeMap: Record<DateString, number> = {}
  for (const date of cycle.days) {
    extraIncomeMap[date] = 0
  }
  for (const tx of transactions) {
    if (tx.type === 'income' && extraIncomeMap[tx.date] !== undefined) {
      extraIncomeMap[tx.date] += Number(tx.amountVnd) || 0
    }
  }

  const resultSnapshots: Record<DateString, number> = {}
  let cumulativeSpentBefore = 0
  let cumulativeExtraIncome = 0

  for (let i = 0; i < cycle.days.length; i++) {
    const date = cycle.days[i]
    const cellDateObj = parseDateString(date)
    const isPast = isBefore(cellDateObj, todayDateObj)

    // Accumulate extra income up to this day
    cumulativeExtraIncome += extraIncomeMap[date] || 0

    // Remaining days in cycle from this day to end of cycle
    const passedDays = i + 1
    const remainingDays = Math.max(1, cycle.totalDays - passedDays + 1)

    // Remaining budget at start of this day
    const effectiveBudget = Math.max(0, budgetVnd) + cumulativeExtraIncome
    const remainingBudget = effectiveBudget - cumulativeSpentBefore
    const flexLimit = remainingBudget > 0 ? Math.round(remainingBudget / remainingDays) : 0

    if (isPast) {
      // Only past days have ended and qualify for snapshot
      resultSnapshots[date] = flexLimit
    }

    // Add this day's spending to cumulative spent for subsequent days
    cumulativeSpentBefore += dailySpentMap[date] || 0
  }

  return resultSnapshots
}

/**
 * Synchronizes cycle snapshots with LocalStorage:
 * - Recalculates snapshots for the cycle.
 * - Merges new snapshots with existing stored snapshots.
 * - Writes merged snapshots back to LocalStorage.
 * - Returns the updated snapshots record.
 */
export function syncCycleSnapshots(params: CalculateCycleSnapshotsParams): Record<DateString, number> {
  const calculatedSnapshots = calculateCycleSnapshots(params)
  const existingStored = getDailyLimitSnapshots()

  // Merge: for days in this cycle, update to newly calculated snapshots
  // Keep snapshots for other cycles intact
  const mergedSnapshots = {
    ...existingStored,
    ...calculatedSnapshots,
  }

  // Remove any stale snapshot for today or future dates if present
  const activeToday = params.todayStr ?? getTodayString()
  for (const date of Object.keys(mergedSnapshots)) {
    if (date >= activeToday && params.cycle.days.includes(date)) {
      delete mergedSnapshots[date]
    }
  }

  saveDailyLimitSnapshots(mergedSnapshots)
  return mergedSnapshots
}

