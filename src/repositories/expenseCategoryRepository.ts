/**
 * expenseCategoryRepository.ts
 * Data access layer for ExpenseCategory records (Expenses page & Record New Expense).
 * Provides dual-layer synchronization with IndexedDB (Dexie) and localStorage
 * for zero data loss on iOS Safari PWA swipe-up.
 */
import { db } from '@/db/database'
import type { ExpenseCategory } from '@/types/models'
import { CATEGORIES_STORAGE_KEY, DEFAULT_BUDGET_CATEGORIES } from '@/context/transaction-context'

function getLocalStorageCategories(): ExpenseCategory[] {
  try {
    if (typeof window === 'undefined') return []
    const raw = window.localStorage.getItem(CATEGORIES_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed as ExpenseCategory[]
    }
  } catch {
    // ignore
  }
  return []
}

function syncCategoryToLocalStorage(cat: ExpenseCategory) {
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
  changes: Partial<Omit<ExpenseCategory, 'id' | 'createdAt'>>,
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

function saveReorderedToLocalStorage(orderedCategories: ExpenseCategory[]) {
  try {
    if (typeof window === 'undefined') return
    const now = new Date().toISOString()
    const updated = orderedCategories.map((cat, idx) => ({
      ...cat,
      sortOrder: idx + 1,
      updatedAt: now,
    }))
    window.localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(updated))
  } catch {
    // ignore
  }
}

export const expenseCategoryRepository = {
  /** Returns all expense/income categories ordered by sortOrder */
  async findAll(): Promise<ExpenseCategory[]> {
    let cats: ExpenseCategory[] = []

    if (typeof indexedDB !== 'undefined') {
      try {
        cats = await db.categories.orderBy('sortOrder').toArray()
      } catch {
        // Fallback to localStorage below when IndexedDB is unavailable
      }
    }

    if (cats.length === 0) {
      const fallback = getLocalStorageCategories()
      if (fallback.length > 0) {
        cats = fallback
        if (typeof indexedDB !== 'undefined') {
          void db.categories.bulkPut(fallback).catch(() => {})
        }
      } else {
        return DEFAULT_BUDGET_CATEGORIES
      }
    }

    return cats.sort((a, b) => a.sortOrder - b.sortOrder)
  },

  /** Finds an expense category by its primary key */
  async findById(id: string): Promise<ExpenseCategory | undefined> {
    if (typeof indexedDB !== 'undefined') {
      try {
        const cat = await db.categories.get(id)
        if (cat) return cat
      } catch {
        // Fallback to localStorage
      }
    }

    const fallback = getLocalStorageCategories()
    return fallback.find((c) => c.id === id)
  },

  /** Inserts a new expense category */
  async create(category: ExpenseCategory): Promise<void> {
    syncCategoryToLocalStorage(category)
    if (typeof indexedDB !== 'undefined') {
      try {
        await db.categories.add(category)
      } catch {
        // LocalStorage already persisted
      }
    }
  },

  /** Updates an existing expense category */
  async update(
    id: string,
    changes: Partial<Omit<ExpenseCategory, 'id' | 'createdAt'>>,
  ): Promise<void> {
    updateCategoryInLocalStorage(id, changes)
    if (typeof indexedDB !== 'undefined') {
      try {
        await db.categories.update(id, { ...changes, updatedAt: new Date().toISOString() })
      } catch {
        // LocalStorage already persisted
      }
    }
  },

  /** Deletes an expense category */
  async delete(id: string): Promise<void> {
    deleteCategoryFromLocalStorage(id)
    if (typeof indexedDB !== 'undefined') {
      try {
        await db.categories.delete(id)
      } catch {
        // LocalStorage already updated
      }
    }
  },

  /** Reorders expense categories sequentially */
  async reorder(orderedCategories: ExpenseCategory[]): Promise<void> {
    saveReorderedToLocalStorage(orderedCategories)
    if (typeof indexedDB !== 'undefined') {
      try {
        const now = new Date().toISOString()
        await db.transaction('rw', db.categories, async () => {
          for (let i = 0; i < orderedCategories.length; i++) {
            const cat = orderedCategories[i]
            await db.categories.update(cat.id, {
              sortOrder: i + 1,
              updatedAt: now,
            })
          }
        })
      } catch {
        // LocalStorage already updated
      }
    }
  },
}
