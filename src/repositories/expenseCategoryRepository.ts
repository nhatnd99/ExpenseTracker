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

/**
 * Consistent automatic ordering for Expense Categories:
 * 1. Preserves existing default/system or legacy ordering when legacy sortOrder is present.
 * 2. Places newer categories (without sortOrder) consistently afterwards by createdAt, then name/id.
 */
export function sortExpenseCategories(categories: ExpenseCategory[]): ExpenseCategory[] {
  return [...categories].sort((a, b) => {
    const aHasOrder = typeof a.sortOrder === 'number' && Number.isFinite(a.sortOrder)
    const bHasOrder = typeof b.sortOrder === 'number' && Number.isFinite(b.sortOrder)

    if (aHasOrder && bHasOrder && a.sortOrder !== b.sortOrder) {
      return a.sortOrder! - b.sortOrder!
    }
    if (aHasOrder !== bHasOrder) {
      return aHasOrder ? -1 : 1
    }
    if (a.createdAt && b.createdAt && a.createdAt !== b.createdAt) {
      return a.createdAt.localeCompare(b.createdAt)
    }
    const nameCompare = a.name.localeCompare(b.name)
    if (nameCompare !== 0) return nameCompare
    return a.id.localeCompare(b.id)
  })
}

export const expenseCategoryRepository = {
  /** Returns all expense/income categories using consistent automatic ordering */
  async findAll(): Promise<ExpenseCategory[]> {
    let cats: ExpenseCategory[] = []

    if (typeof indexedDB !== 'undefined') {
      try {
        // Fetch all records via toArray() so categories without legacy sortOrder are never omitted
        cats = await db.categories.toArray()
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
        return sortExpenseCategories(DEFAULT_BUDGET_CATEGORIES)
      }
    }

    return sortExpenseCategories(cats)
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
}
