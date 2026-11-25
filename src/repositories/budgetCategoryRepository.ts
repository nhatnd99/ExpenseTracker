/**
 * budgetCategoryRepository.ts
 * Independent data access layer for BudgetCategory records (Settings -> Monthly Budget Plan).
 * Stored independently under BUDGET_CATEGORIES_STORAGE_KEY ('expense_tracker_budget_categories').
 *
 * Includes idempotent, non-destructive initialization/migration from legacy shared storage
 * so existing production user plans, custom allocation items, and itemized categories are preserved.
 */
import { db } from '@/db/database'
import type { BudgetCategory, MonthlyAllocation } from '@/types/models'
import { CATEGORIES_STORAGE_KEY } from '@/context/transaction-context'
import { CATEGORY_RECORDS_STORAGE_KEY } from './categoryRecordRepository'
import { categoryRecordRepository } from './categoryRecordRepository'

export const BUDGET_CATEGORIES_STORAGE_KEY = 'expense_tracker_budget_categories'
const GLOBAL_TEMPLATE_STORAGE_KEY = 'global_budget_template'

const DEFAULT_BUDGET_CATEGORY_IDS = new Set([
  'cat-expenses',
  'cat-fixed',
  'cat-savings',
  'cat-investment',
  'cat-emergency',
])

export const DEFAULT_BUDGET_PLAN_CATEGORIES: BudgetCategory[] = [
  { id: 'cat-expenses', name: 'Daily Expenses', icon: '🛒', type: 'expense', isFixedBill: false, sortOrder: 1, createdAt: '', updatedAt: '' },
  { id: 'cat-fixed', name: 'Fixed Bills', icon: '🏠', type: 'expense', isFixedBill: true, sortOrder: 2, createdAt: '', updatedAt: '' },
  { id: 'cat-savings', name: 'Savings', icon: '🏦', type: 'expense', isFixedBill: true, sortOrder: 3, createdAt: '', updatedAt: '' },
  { id: 'cat-investment', name: 'Investment', icon: '📈', type: 'expense', isFixedBill: true, sortOrder: 4, createdAt: '', updatedAt: '' },
  { id: 'cat-emergency', name: 'Emergency Fund', icon: '🆘', type: 'expense', isFixedBill: true, sortOrder: 5, createdAt: '', updatedAt: '' },
]

function readStoredBudgetCategories(): BudgetCategory[] | null {
  try {
    if (typeof window === 'undefined') return null
    const raw = window.localStorage.getItem(BUDGET_CATEGORIES_STORAGE_KEY)
    if (raw === null) return null
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed as BudgetCategory[]
  } catch {
    // ignore corrupt JSON and re-initialize safely
  }
  return null
}

function writeStoredBudgetCategories(categories: BudgetCategory[]): void {
  try {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(BUDGET_CATEGORIES_STORAGE_KEY, JSON.stringify(categories))
  } catch {
    // ignore storage quota errors
  }
}

function readLegacyLocalCategories(): BudgetCategory[] {
  try {
    if (typeof window === 'undefined') return []
    const raw = window.localStorage.getItem(CATEGORIES_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as BudgetCategory[]) : []
  } catch {
    return []
  }
}

function readAllocatedIdsFromTemplate(): string[] {
  try {
    if (typeof window === 'undefined') return []
    const raw = window.localStorage.getItem(GLOBAL_TEMPLATE_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as { allocations?: Array<{ categoryId: string }> }
    if (!Array.isArray(parsed?.allocations)) return []
    return parsed.allocations.map((a) => a.categoryId).filter(Boolean)
  } catch {
    return []
  }
}

function readCategoryIdsWithRecords(): string[] {
  try {
    if (typeof window === 'undefined') return []
    const raw = window.localStorage.getItem(CATEGORY_RECORDS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Array<{ categoryId?: string }>
    if (!Array.isArray(parsed)) return []
    return parsed.map((r) => r.categoryId).filter((id): id is string => typeof id === 'string' && id.length > 0)
  } catch {
    return []
  }
}

/**
 * Idempotently initializes independent Budget Categories from legacy shared storage
 * if BUDGET_CATEGORIES_STORAGE_KEY does not yet exist. Never mutates legacy stores.
 */
async function ensureInitialized(): Promise<BudgetCategory[]> {
  const existing = readStoredBudgetCategories()
  if (existing !== null) {
    return existing.sort((a, b) => a.sortOrder - b.sortOrder)
  }

  // Gather legacy read-only data (safely handle environments without IndexedDB)
  let dbCats: BudgetCategory[] = []
  let dbAllocs: MonthlyAllocation[] = []
  if (typeof indexedDB !== 'undefined') {
    try {
      ;[dbCats, dbAllocs] = await Promise.all([
        db.categories.toArray(),
        db.allocations.toArray(),
      ])
    } catch {
      // IndexedDB unavailable or closed; proceed with localStorage fallback
    }
  }
  const localCats = readLegacyLocalCategories()

  // Merge legacy dbCats and localCats by ID (read-only)
  const mergedMap = new Map<string, BudgetCategory>()
  for (const c of localCats) {
    mergedMap.set(c.id, c)
  }
  for (const c of dbCats) {
    mergedMap.set(c.id, c)
  }
  const legacyAll = Array.from(mergedMap.values())

  const allocatedIds = new Set<string>([
    ...dbAllocs.map((a) => a.categoryId),
    ...readAllocatedIdsFromTemplate(),
  ])
  const recordCatIds = new Set<string>(readCategoryIdsWithRecords())

  const hasLegacyData = legacyAll.length > 0 || allocatedIds.size > 0 || recordCatIds.size > 0

  if (!hasLegacyData) {
    // Fresh environment: return default budget plan categories
    return DEFAULT_BUDGET_PLAN_CATEGORIES
  }

  // Extract budget-relevant categories from legacy shared data without touching income categories
  const migrated = legacyAll.filter((c) => {
    if (c.type === 'income') return false
    return (
      DEFAULT_BUDGET_CATEGORY_IDS.has(c.id) ||
      allocatedIds.has(c.id) ||
      Boolean(c.excludeFromExpenseTracking) ||
      Boolean(c.enableItemizedRecords) ||
      recordCatIds.has(c.id) ||
      /^cat-\d+$/.test(c.id)
    )
  })

  const result = migrated.length > 0 ? migrated : DEFAULT_BUDGET_PLAN_CATEGORIES
  const sorted = [...result].sort((a, b) => a.sortOrder - b.sortOrder)
  writeStoredBudgetCategories(sorted)
  return sorted
}

export const budgetCategoryRepository = {
  /** Returns all budget categories ordered by sortOrder */
  async findAll(): Promise<BudgetCategory[]> {
    return ensureInitialized()
  },

  /** Finds a budget category by its primary key */
  async findById(id: string): Promise<BudgetCategory | undefined> {
    const all = await ensureInitialized()
    return all.find((c) => c.id === id)
  },

  /** Inserts a new budget category */
  async create(category: BudgetCategory): Promise<void> {
    const all = await ensureInitialized()
    const updated = [...all.filter((c) => c.id !== category.id), category]
    writeStoredBudgetCategories(updated)
  },

  /** Updates an existing budget category */
  async update(
    id: string,
    changes: Partial<Omit<BudgetCategory, 'id' | 'createdAt'>>,
  ): Promise<void> {
    const all = await ensureInitialized()
    const now = new Date().toISOString()
    const updated = all.map((c) =>
      c.id === id ? { ...c, ...changes, updatedAt: now } : c,
    )
    writeStoredBudgetCategories(updated)
  },

  /** Deletes a budget category and cleans up its itemized records to prevent orphans */
  async delete(id: string): Promise<void> {
    const all = await ensureInitialized()
    const updated = all.filter((c) => c.id !== id)
    writeStoredBudgetCategories(updated)
    await categoryRecordRepository.deleteByCategoryId(id)
  },

  /** Reorders budget categories sequentially */
  async reorder(orderedCategories: BudgetCategory[]): Promise<void> {
    const now = new Date().toISOString()
    const updated = orderedCategories.map((cat, idx) => ({
      ...cat,
      sortOrder: idx + 1,
      updatedAt: now,
    }))
    writeStoredBudgetCategories(updated)
  },
}
