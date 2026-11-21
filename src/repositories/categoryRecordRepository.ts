/**
 * categoryRecordRepository.ts
 * Data access layer for CategoryRecord items.
 * Uses localStorage persistence under CATEGORY_RECORDS_STORAGE_KEY.
 * Provides normalization, CRUD methods, and safe category deletion cleanup.
 */
import type { CategoryRecord } from '@/types/models'

export const CATEGORY_RECORDS_STORAGE_KEY = 'expense_tracker_category_records'

export function normalizeCategoryRecords(raw: unknown): CategoryRecord[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map((item) => {
      const now = new Date().toISOString()
      const amount = Number(item.amount)
      return {
        id: typeof item.id === 'string' && item.id.trim() ? item.id.trim() : `rec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        categoryId: typeof item.categoryId === 'string' ? item.categoryId.trim() : '',
        name: typeof item.name === 'string' ? item.name.trim() : '',
        amount: isNaN(amount) ? 0 : Math.max(0, Math.round(amount)),
        date: typeof item.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.date) ? item.date : now.slice(0, 10),
        note: typeof item.note === 'string' && item.note.trim() ? item.note.trim() : undefined,
        createdAt: typeof item.createdAt === 'string' && item.createdAt ? item.createdAt : now,
        updatedAt: typeof item.updatedAt === 'string' && item.updatedAt ? item.updatedAt : now,
      }
    })
    .filter((item) => item.categoryId.length > 0 && item.name.length > 0)
}

function getStoredRecords(): CategoryRecord[] {
  try {
    if (typeof window === 'undefined') return []
    const raw = window.localStorage.getItem(CATEGORY_RECORDS_STORAGE_KEY)
    if (!raw) return []
    return normalizeCategoryRecords(JSON.parse(raw))
  } catch {
    return []
  }
}

function saveStoredRecords(records: CategoryRecord[]): void {
  try {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(CATEGORY_RECORDS_STORAGE_KEY, JSON.stringify(records))
  } catch {
    // Ignore storage quota or disabled localStorage errors
  }
}

export const categoryRecordRepository = {
  /** Return all category records */
  async findAll(): Promise<CategoryRecord[]> {
    return getStoredRecords()
  },

  /** Find records by category ID */
  async findByCategoryId(categoryId: string): Promise<CategoryRecord[]> {
    const all = getStoredRecords()
    return all.filter((r) => r.categoryId === categoryId)
  },

  /** Find records by category ID and month string (YYYY-MM) */
  async findByCategoryIdAndMonth(categoryId: string, monthId: string): Promise<CategoryRecord[]> {
    const all = getStoredRecords()
    return all.filter((r) => r.categoryId === categoryId && r.date.startsWith(monthId))
  },

  /** Create a new category record */
  async create(record: CategoryRecord): Promise<void> {
    const all = getStoredRecords()
    const updated = [record, ...all.filter((r) => r.id !== record.id)]
    saveStoredRecords(updated)
  },

  /** Update an existing category record */
  async update(id: string, updates: Partial<Omit<CategoryRecord, 'id' | 'createdAt'>>): Promise<void> {
    const all = getStoredRecords()
    const now = new Date().toISOString()
    const updated = all.map((r) => {
      if (r.id !== id) return r
      return {
        ...r,
        ...updates,
        name: updates.name !== undefined ? updates.name.trim() : r.name,
        amount: updates.amount !== undefined ? Math.max(0, Math.round(updates.amount)) : r.amount,
        date: updates.date !== undefined ? updates.date.trim() : r.date,
        note: updates.note !== undefined ? updates.note.trim() || undefined : r.note,
        updatedAt: now,
      }
    })
    saveStoredRecords(updated)
  },

  /** Delete a single category record */
  async delete(id: string): Promise<void> {
    const all = getStoredRecords()
    const updated = all.filter((r) => r.id !== id)
    saveStoredRecords(updated)
  },

  /** Delete all records belonging to a category (used when category is deleted) */
  async deleteByCategoryId(categoryId: string): Promise<void> {
    const all = getStoredRecords()
    const updated = all.filter((r) => r.categoryId !== categoryId)
    saveStoredRecords(updated)
  },
}
