/**
 * categoryRepository.ts
 * Data access layer for BudgetCategory records.
 * Provides dual-layer synchronization with localStorage for zero data loss on iOS Safari PWA swipe-up.
 */
import { db } from '@/db/database'
import type { BudgetCategory } from '@/types/models'
import { CATEGORIES_STORAGE_KEY, DEFAULT_BUDGET_CATEGORIES } from '@/context/transaction-context'

function getLocalStorageCategories(): BudgetCategory[] {
  try {
    if (typeof window === 'undefined') return []
    const raw = window.localStorage.getItem(CATEGORIES_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed as BudgetCategory[]
    }
  } catch {
    // ignore
  }
  return []
}

function syncCategoryToLocalStorage(cat: BudgetCategory) {
  try {
    if (typeof window === 'undefined') return
    const list = getLocalStorageCategories()
    const updated = [...list.filter((c) => c.id !== cat.id), cat]
    window.localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(updated))
  } catch {
    // ignore
  }
}

function updateCategoryInLocalStorage(
  id: string,
  changes: Partial<Omit<BudgetCategory, 'id' | 'createdAt'>>,
) {
  try {
    if (typeof window === 'undefined') return
    const list = getLocalStorageCategories()
    const updated = list.map((c) =>
      c.id === id ? { ...c, ...changes, updatedAt: new Date().toISOString() } : c,
    )
    window.localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(updated))
  } catch {
    // ignore
  }
}

function deleteCategoryFromLocalStorage(id: string) {
  try {
    if (typeof window === 'undefined') return
    const list = getLocalStorageCategories()
    const updated = list.filter((c) => c.id !== id)
    window.localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(updated))
  } catch {
    // ignore
  }
}

export const categoryRepository = {
  /** Returns all categories ordered by sortOrder */
  async findAll(): Promise<BudgetCategory[]> {
    let cats = await db.categories.orderBy('sortOrder').toArray()

    if (cats.length === 0) {
      const fallback = getLocalStorageCategories()
      if (fallback.length > 0) {
        cats = fallback
        void db.categories.bulkPut(fallback).catch(() => {})
      } else {
        // Return defaults if entirely empty
        return DEFAULT_BUDGET_CATEGORIES
      }
    }

    return cats.sort((a, b) => a.sortOrder - b.sortOrder)
  },

  /** Finds a category by its primary key */
  async findById(id: string): Promise<BudgetCategory | undefined> {
    const cat = await db.categories.get(id)
    if (cat) return cat

    const fallback = getLocalStorageCategories()
    return fallback.find((c) => c.id === id)
  },

  /** Inserts a new category */
  async create(category: BudgetCategory): Promise<void> {
    syncCategoryToLocalStorage(category)
    await db.categories.add(category)
  },

  /** Updates an existing category */
  async update(
    id: string,
    changes: Partial<Omit<BudgetCategory, 'id' | 'createdAt'>>,
  ): Promise<void> {
    updateCategoryInLocalStorage(id, changes)
    await db.categories.update(id, { ...changes, updatedAt: new Date().toISOString() })
  },

  /** Deletes a category */
  async delete(id: string): Promise<void> {
    deleteCategoryFromLocalStorage(id)
    await db.categories.delete(id)
  },
}
