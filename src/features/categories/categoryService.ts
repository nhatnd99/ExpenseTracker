/**
 * categoryService.ts
 * Business logic for user-defined categories.
 */
import { crypto } from '@/utils/crypto'
import { db } from '@/db/database'
import { categoryRepository } from '@/repositories/categoryRepository'
import type { BudgetCategory } from '@/types/models'

export interface CreateCategoryInput {
  name: string
  icon?: string
  isFixedBill?: boolean
}

export async function getAllCategories(): Promise<BudgetCategory[]> {
  return categoryRepository.findAll()
}

export async function addCategory(input: CreateCategoryInput): Promise<BudgetCategory> {
  const existing = await categoryRepository.findAll()
  const maxSortOrder = existing.reduce((max, c) => Math.max(max, c.sortOrder), 0)

  const now = new Date().toISOString()
  const newCategory: BudgetCategory = {
    id: `cat-${crypto.randomUUID().slice(0, 8)}`,
    name: input.name.trim(),
    icon: input.icon?.trim() || '🏷️',
    isFixedBill: Boolean(input.isFixedBill),
    sortOrder: maxSortOrder + 1,
    createdAt: now,
    updatedAt: now,
  }

  await categoryRepository.create(newCategory)
  return newCategory
}

export async function updateCategory(
  id: string,
  changes: Partial<Pick<BudgetCategory, 'name' | 'icon' | 'sortOrder' | 'isFixedBill'>>,
): Promise<void> {
  await categoryRepository.update(id, changes)
}

export async function deleteCategory(id: string): Promise<void> {
  await categoryRepository.delete(id)
}

/**
 * Reorders categories by updating sortOrder sequentially in a single Dexie transaction.
 */
export async function reorderCategories(orderedCategories: BudgetCategory[]): Promise<void> {
  await db.transaction('rw', db.categories, async () => {
    for (let i = 0; i < orderedCategories.length; i++) {
      const cat = orderedCategories[i]
      await db.categories.update(cat.id, {
        sortOrder: i + 1,
        updatedAt: new Date().toISOString(),
      })
    }
  })
}

