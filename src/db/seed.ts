/**
 * seed.ts
 * Seeds the database with default categories for first-time users.
 *
 * This runs once during application startup if no categories exist.
 * It is idempotent — running it multiple times will not duplicate data.
 */
import { db } from './database'
import type { BudgetCategory } from '@/types/models'

const DEFAULT_CATEGORIES: Omit<BudgetCategory, 'createdAt' | 'updatedAt'>[] = [
  { id: 'cat-expenses', name: 'Daily Expenses', icon: '🛒', isFixedBill: false, sortOrder: 1 },
  { id: 'cat-fixed', name: 'Fixed Bills', icon: '🏠', isFixedBill: true, sortOrder: 2 },
  { id: 'cat-savings', name: 'Savings', icon: '🏦', isFixedBill: true, sortOrder: 3 },
  { id: 'cat-investment', name: 'Investment', icon: '📈', isFixedBill: true, sortOrder: 4 },
  { id: 'cat-emergency', name: 'Emergency Fund', icon: '🆘', isFixedBill: true, sortOrder: 5 },
]

export async function seedDefaultCategories(): Promise<void> {
  const existingCount = await db.categories.count()
  if (existingCount > 0) return

  const now = new Date().toISOString()
  const categories: BudgetCategory[] = DEFAULT_CATEGORIES.map((c) => ({
    ...c,
    createdAt: now,
    updatedAt: now,
  }))

  await db.categories.bulkAdd(categories)
}

