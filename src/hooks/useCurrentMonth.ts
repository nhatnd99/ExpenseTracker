/**
 * useCurrentMonth.ts
 * Returns the current month as a "YYYY-MM" string.
 * Memoised to avoid recalculation on every render.
 */
import { useMemo } from 'react'
import { getCurrentMonthId } from '@/services/dateService'

export function useCurrentMonth(): string {
  return useMemo(() => getCurrentMonthId(), [])
}

