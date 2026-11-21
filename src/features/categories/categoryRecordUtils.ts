/**
 * categoryRecordUtils.ts
 * Pure utilities for managing category records (filtering, summing, sorting, validation).
 */
import type { CategoryRecord } from '@/types/models'

/**
 * Filters records by month ("YYYY-MM").
 */
export function filterRecordsByMonth(records: CategoryRecord[], monthId: string): CategoryRecord[] {
  if (!monthId) return records
  return records.filter((r) => r.date.startsWith(monthId))
}

/**
 * Calculates total amount of given records.
 */
export function calculateRecordsTotal(records: CategoryRecord[]): number {
  return records.reduce((sum, r) => sum + (Number(r.amount) || 0), 0)
}

/**
 * Sorts records descending by date ("YYYY-MM-DD"), then descending by createdAt.
 */
export function compareRecordsDesc(a: CategoryRecord, b: CategoryRecord): number {
  if (a.date !== b.date) {
    return b.date.localeCompare(a.date)
  }
  return b.createdAt.localeCompare(a.createdAt)
}

/**
 * Validates input for adding/updating a record.
 */
export function validateRecordInput(
  name: string,
  amount: number,
  date: string,
): { valid: boolean; error?: string } {
  if (!name.trim()) {
    return { valid: false, error: 'Record name is required' }
  }
  if (isNaN(amount) || amount <= 0) {
    return { valid: false, error: 'Amount must be greater than zero' }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { valid: false, error: 'Date must be in YYYY-MM-DD format' }
  }
  return { valid: true }
}
