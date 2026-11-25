/**
 * categoryRecordService.ts
 * Integrates category records with transaction calculations.
 * Ensures consistent single-source-of-truth calculations per Behavior Matrix:
 * - OFF / OFF: normal transaction behavior
 * - ON / OFF: excluded from calculations
 * - OFF / ON: itemized records included in regular calculations exactly once
 * - ON / ON: stored independently, excluded from regular calculations
 */
import type { BudgetCategory, ExpenseCategory, Transaction, CategoryRecord } from '@/types/models'
import { categoryRecordRepository } from '@/repositories/categoryRecordRepository'

/**
 * Builds the effective transaction list for a given date range and category configurations.
 * - Excludes transactions belonging to categories with excludeFromExpenseTracking = true
 * - For categories with enableItemizedRecords = true and excludeFromExpenseTracking = false,
 *   injects their itemized CategoryRecords as virtual transactions exactly once.
 */
export async function getEffectiveCycleTransactions(
  rawTransactions: Transaction[],
  categories: Array<BudgetCategory | ExpenseCategory>,
  startDate: string,
  endDate: string,
  monthlyPlanId: string = '',
): Promise<Transaction[]> {
  const categoryMap = new Map(categories.map((c) => [c.id, c]))

  // 1. Filter out raw transactions for excluded categories or itemized categories
  const filteredRaw = rawTransactions.filter((tx) => {
    const cat = categoryMap.get(tx.categoryId)
    if (!cat) return true
    if (cat.excludeFromExpenseTracking) return false
    // If the category has itemized records enabled, the CategoryRecord collection is the authoritative source
    if (cat.enableItemizedRecords) return false
    return true
  })

  // 2. Fetch all category records for tracked itemized categories
  const trackedItemizedCategories = categories.filter(
    (c) => c.enableItemizedRecords && !c.excludeFromExpenseTracking,
  )

  const itemizedTransactions: Transaction[] = []

  for (const cat of trackedItemizedCategories) {
    const records: CategoryRecord[] = await categoryRecordRepository.findByCategoryId(cat.id)
    const cycleRecords = records.filter((r) => r.date >= startDate && r.date <= endDate)

    for (const rec of cycleRecords) {
      itemizedTransactions.push({
        id: rec.id,
        monthlyPlanId,
        categoryId: rec.categoryId,
        amountVnd: rec.amount,
        date: rec.date,
        transactionDate: `${rec.date}T12:00:00.000Z`,
        type: 'expense',
        description: rec.name + (rec.note ? ` - ${rec.note}` : ''),
        isExcludedFromDaily: Boolean(cat.isFixedBill),
        status: 'cleared',
        createdAt: rec.createdAt,
        updatedAt: rec.updatedAt,
      })
    }
  }

  return [...filteredRaw, ...itemizedTransactions]
}
