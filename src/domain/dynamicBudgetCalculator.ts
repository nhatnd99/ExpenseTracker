/**
 * dynamicBudgetCalculator.ts
 * Pure functions for Dynamic Safe-to-Spend calculations.
 * Applies daily budget recalculation based on actual spending and remaining cycle days.
 * No React dependencies — fully testable in isolation.
 */
import type { DateString, Transaction } from '@/types/models'
import type { PaydayCycle } from '@/features/reports/paydayCycle'

export interface DynamicBudgetCalculationParams {
  totalDays: number
  passedDays: number
  baseBudget: number
  spentToDate: number
  totalExtraIncome?: number
}

export interface DynamicBudgetResult {
  // Step 1: Time
  totalDays: number
  passedDays: number
  remainingDays: number

  // Step 2: Cash flow
  baseBudget: number
  totalExtraIncome: number
  spentToDate: number
  remainingBudget: number

  // Step 3: Safe-to-Spend
  todayLimit: number

  // Step 4: Pace / Rollover status
  idealSpent: number
  paceBalance: number
  isOnTrack: boolean
}

/**
 * Step 1 Helper: Calculates the number of passed days in the cycle up to and including today.
 */
export function calculatePassedDays(
  cycle: Pick<PaydayCycle, 'startDate' | 'endDate' | 'totalDays' | 'days'>,
  todayStr: DateString,
): number {
  if (cycle.totalDays <= 0) return 1

  if (todayStr < cycle.startDate) {
    return 1
  }

  if (todayStr > cycle.endDate) {
    return cycle.totalDays
  }

  if (cycle.days && cycle.days.length > 0) {
    const idx = cycle.days.indexOf(todayStr)
    if (idx >= 0) {
      return idx + 1
    }
  }

  // Fallback day calculation using UTC dates
  const start = new Date(`${cycle.startDate}T00:00:00Z`).getTime()
  const current = new Date(`${todayStr}T00:00:00Z`).getTime()
  const diffDays = Math.floor((current - start) / 86_400_000) + 1
  return Math.min(cycle.totalDays, Math.max(1, diffDays))
}

/**
 * Step 1 Helper: Calculates remaining days in the cycle.
 * Formula: totalDays - passedDays + 1
 * Guaranteed >= 1 to prevent division by 0 on the final day.
 */
export function calculateRemainingDays(totalDays: number, passedDays: number): number {
  const safeTotal = Math.max(1, totalDays)
  const safePassed = Math.max(1, passedDays)
  return Math.max(1, safeTotal - safePassed + 1)
}

/**
 * Step 2 Helper: Calculates total spent from cycle start date to today,
 * strictly filtering out transactions where isExcludedFromDaily === true (fixed bills)
 * and ignoring income transactions (type === 'income').
 */
export function calculateSpentToDate(
  transactions: Transaction[],
  startDate: DateString,
  todayStr: DateString,
): number {
  return transactions
    .filter(
      (tx) =>
        tx.date >= startDate &&
        tx.date <= todayStr &&
        tx.type !== 'income' &&
        !tx.isExcludedFromDaily,
    )
    .reduce((sum, tx) => sum + (Number(tx.amountVnd) || 0), 0)
}

/**
 * Step 2 Helper: Calculates total extra income recorded in the cycle.
 * Filters transactions where type === 'income'.
 */
export function calculateExtraIncome(
  transactions: Transaction[],
  startDate: DateString,
  todayStr?: DateString,
): number {
  return transactions
    .filter((tx) => {
      const inRange = tx.date >= startDate && (!todayStr || tx.date <= todayStr)
      return inRange && tx.type === 'income'
    })
    .reduce((sum, tx) => sum + (Number(tx.amountVnd) || 0), 0)
}

/**
 * Core Dynamic Safe-to-Spend calculation function.
 *
 * Bước 1: Thời gian
 *   remainingDays = totalDays - passedDays + 1 (>= 1)
 *
 * Bước 2: Dòng tiền
 *   remainingBudget = (baseBudget + totalExtraIncome) - spentToDate
 *
 * Bước 3: Safe-to-Spend
 *   todayLimit = remainingBudget / remainingDays (set 0 nếu remainingBudget <= 0)
 *
 * Bước 4: Pace / Rollover
 *   idealSpent = (baseBudget / totalDays) * passedDays
 *   paceBalance = idealSpent - spentToDate (> 0: On track, < 0: Off track)
 */
export function calculateDynamicBudget(params: DynamicBudgetCalculationParams): DynamicBudgetResult {
  const { totalDays, passedDays, baseBudget, spentToDate, totalExtraIncome = 0 } = params

  // Bước 1: Xác định thời gian
  const safeTotalDays = Math.max(1, totalDays)
  const safePassedDays = Math.min(safeTotalDays, Math.max(1, passedDays))
  const remainingDays = calculateRemainingDays(safeTotalDays, safePassedDays)

  // Bước 2: Xác định dòng tiền (chỉ tính chi tiêu hằng ngày, bổ sung extra income, bỏ qua Fixed Bills)
  const safeBaseBudget = Math.max(0, baseBudget)
  const safeExtraIncome = Math.max(0, totalExtraIncome)
  const safeSpentToDate = Math.max(0, spentToDate)
  // remainingBudget = (baseBudget + totalExtraIncome) - spentToDate
  const remainingBudget = (safeBaseBudget + safeExtraIncome) - safeSpentToDate

  // Bước 3: Tính toán Hạn mức hôm nay (Safe-to-Spend)
  // Edge Case: Nếu remainingBudget <= 0, set todayLimit = 0
  const todayLimit = remainingBudget > 0 ? Math.round(remainingBudget / remainingDays) : 0

  // Bước 4: Tính toán Trạng thái Tiến độ (Pace / Rollover Status)
  const idealSpent = Math.round((safeBaseBudget / safeTotalDays) * safePassedDays)
  const paceBalance = idealSpent - safeSpentToDate
  const isOnTrack = paceBalance >= 0

  return {
    totalDays: safeTotalDays,
    passedDays: safePassedDays,
    remainingDays,
    baseBudget: safeBaseBudget,
    totalExtraIncome: safeExtraIncome,
    spentToDate: safeSpentToDate,
    remainingBudget,
    todayLimit,
    idealSpent,
    paceBalance,
    isOnTrack,
  }
}

