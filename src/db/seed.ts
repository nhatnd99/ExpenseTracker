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
  { id: 'cat-expenses', name: 'Daily Expenses', icon: '🛒', sortOrder: 1 },
  { id: 'cat-savings', name: 'Savings', icon: '🏦', sortOrder: 2 },
  { id: 'cat-investment', name: 'Investment', icon: '📈', sortOrder: 3 },
  { id: 'cat-emergency', name: 'Emergency Fund', icon: '🆘', sortOrder: 4 },
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

