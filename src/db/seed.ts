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
  { id: 'cat-expenses', name: 'Daily Expenses', icon: '🛒', type: 'expense', isFixedBill: false, sortOrder: 1 },
  { id: 'cat-fixed', name: 'Fixed Bills', icon: '🏠', type: 'expense', isFixedBill: true, sortOrder: 2 },
  { id: 'cat-savings', name: 'Savings', icon: '🏦', type: 'expense', isFixedBill: true, sortOrder: 3 },
  { id: 'cat-investment', name: 'Investment', icon: '📈', type: 'expense', isFixedBill: true, sortOrder: 4 },
  { id: 'cat-emergency', name: 'Emergency Fund', icon: '🆘', type: 'expense', isFixedBill: true, sortOrder: 5 },
  // Default Income Categories
  { id: 'cat-inc-salary', name: 'Tiền lương', icon: 'Banknote', type: 'income', isFixedBill: false, sortOrder: 101 },
  { id: 'cat-inc-bonus', name: 'Tiền thưởng', icon: 'Gift', type: 'income', isFixedBill: false, sortOrder: 102 },
  { id: 'cat-inc-debt', name: 'Được trả nợ', icon: 'HandCoins', type: 'income', isFixedBill: false, sortOrder: 103 },
  { id: 'cat-inc-selling', name: 'Bán thanh lý', icon: 'Tag', type: 'income', isFixedBill: false, sortOrder: 104 },
  { id: 'cat-inc-extra', name: 'Thu nhập phụ', icon: 'Sparkles', type: 'income', isFixedBill: false, sortOrder: 105 },
  { id: 'cat-inc-other', name: 'Thu nhập khác', icon: 'Coins', type: 'income', isFixedBill: false, sortOrder: 106 },
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

