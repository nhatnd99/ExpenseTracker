/**
 * categoryRepository.ts
 * Data access layer for BudgetCategory records.
 */
import { db } from '@/db/database'
import type { BudgetCategory } from '@/types/models'

export const categoryRepository = {
  /** Returns all categories ordered by sortOrder */
  async findAll(): Promise<BudgetCategory[]> {
    return db.categories.orderBy('sortOrder').toArray()
  },

  /** Finds a category by its primary key */
  async findById(id: string): Promise<BudgetCategory | undefined> {
    return db.categories.get(id)
  },

  /** Inserts a new category */
  async create(category: BudgetCategory): Promise<void> {
    await db.categories.add(category)
  },

  /** Updates an existing category */
  async update(
    id: string,
    changes: Partial<Omit<BudgetCategory, 'id' | 'createdAt'>>,
  ): Promise<void> {
    await db.categories.update(id, { ...changes, updatedAt: new Date().toISOString() })
  },

  /** Deletes a category */
  async delete(id: string): Promise<void> {
    await db.categories.delete(id)
  },
}

