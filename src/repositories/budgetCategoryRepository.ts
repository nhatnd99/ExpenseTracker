/**
 * budgetCategoryRepository.ts
 * Independent data access layer for BudgetCategory records (Settings -> Monthly Budget Plan).
 * Stored independently under BUDGET_CATEGORIES_STORAGE_KEY ('expense_tracker_budget_categories').
 *
 * Enforces invariant Display Order rules:
 * - Positions 1, 2, 3 are permanently locked to the 3 Base Categories:
 *   1: Daily Expenses ('cat-expenses')
 *   2: Fixed Bills ('cat-fixed')
 *   3: Savings ('cat-savings')
 * - Custom Budget Categories occupy sequential positions starting at 4 (4, 5, 6...).
 * - Includes idempotent, non-destructive initialization/normalization for legacy data.
 */
import { db } from '@/db/database'
import type { BudgetCategory, MonthlyAllocation } from '@/types/models'
import { CATEGORIES_STORAGE_KEY } from '@/context/transaction-context'
import { CATEGORY_RECORDS_STORAGE_KEY, categoryRecordRepository } from './categoryRecordRepository'

export const BUDGET_CATEGORIES_STORAGE_KEY = 'expense_tracker_budget_categories'
const GLOBAL_TEMPLATE_STORAGE_KEY = 'global_budget_template'

export const BASE_BUDGET_CATEGORY_IDS = ['cat-expenses', 'cat-fixed', 'cat-savings'] as const
export const BASE_BUDGET_CATEGORY_ID_SET = new Set<string>(BASE_BUDGET_CATEGORY_IDS)

export function isBaseBudgetCategory(categoryId: string): boolean {
  return BASE_BUDGET_CATEGORY_ID_SET.has(categoryId)
}

export const DEFAULT_BUDGET_PLAN_CATEGORIES: BudgetCategory[] = [
  { id: 'cat-expenses', name: 'Daily Expenses', icon: '🛒', type: 'expense', isFixedBill: false, sortOrder: 1, createdAt: '', updatedAt: '' },
  { id: 'cat-fixed', name: 'Fixed Bills', icon: '🏠', type: 'expense', isFixedBill: true, sortOrder: 2, createdAt: '', updatedAt: '' },
  { id: 'cat-savings', name: 'Savings', icon: '🏦', type: 'expense', isFixedBill: true, sortOrder: 3, createdAt: '', updatedAt: '' },
]

const LEGACY_BUDGET_DEFAULT_IDS = new Set([
  ...BASE_BUDGET_CATEGORY_IDS,
  'cat-investment',
  'cat-emergency',
])

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
 * Normalizes Budget Categories so:
 * 1. Base Categories ('cat-expenses', 'cat-fixed', 'cat-savings') are always at positions 1, 2, 3.
 * 2. All custom categories preserve their relative order and receive sequential positions 4, 5, 6...
 * 3. Duplicates and income categories are filtered out safely.
 */
export function normalizeBudgetCategories(categories: BudgetCategory[]): BudgetCategory[] {
  const byId = new Map<string, BudgetCategory>()
  for (const cat of categories) {
    if (!cat || !cat.id || cat.type === 'income') continue
    if (!byId.has(cat.id)) {
      byId.set(cat.id, cat)
    }
  }

  // 1. Lock Base Categories to positions 1, 2, 3
  const baseCategories: BudgetCategory[] = DEFAULT_BUDGET_PLAN_CATEGORIES.map((def, idx) => {
    const existing = byId.get(def.id)
    if (existing) {
      return {
        ...existing,
        type: 'expense',
        sortOrder: idx + 1,
      }
    }
    return { ...def, sortOrder: idx + 1 }
  })

  // 2. Collect custom categories preserving relative order
  const customRaw = Array.from(byId.values()).filter((c) => !BASE_BUDGET_CATEGORY_ID_SET.has(c.id))
  const originalIndexMap = new Map(customRaw.map((c, i) => [c.id, i]))

  const sortedCustom = [...customRaw].sort((a, b) => {
    const aOrder = typeof a.sortOrder === 'number' && Number.isFinite(a.sortOrder) ? a.sortOrder : Number.MAX_SAFE_INTEGER
    const bOrder = typeof b.sortOrder === 'number' && Number.isFinite(b.sortOrder) ? b.sortOrder : Number.MAX_SAFE_INTEGER
    if (aOrder !== bOrder) return aOrder - bOrder
    return (originalIndexMap.get(a.id) ?? 0) - (originalIndexMap.get(b.id) ?? 0)
  })

  const normalizedCustom: BudgetCategory[] = sortedCustom.map((cat, idx) => ({
    ...cat,
    type: 'expense',
    sortOrder: BASE_BUDGET_CATEGORY_IDS.length + idx + 1, // Starts at 4
  }))

  return [...baseCategories, ...normalizedCustom]
}

function hasOrderDrift(before: BudgetCategory[], after: BudgetCategory[]): boolean {
  if (before.length !== after.length) return true
  for (let i = 0; i < after.length; i++) {
    if (before[i]?.id !== after[i].id || before[i]?.sortOrder !== after[i].sortOrder) {
      return true
    }
  }
  return false
}

/**
 * Idempotently initializes & normalizes independent Budget Categories from legacy shared storage
 * if BUDGET_CATEGORIES_STORAGE_KEY does not yet exist. Never mutates legacy stores.
 */
async function ensureInitialized(): Promise<BudgetCategory[]> {
  const existing = readStoredBudgetCategories()
  if (existing !== null) {
    const normalized = normalizeBudgetCategories(existing)
    if (hasOrderDrift(existing, normalized)) {
      writeStoredBudgetCategories(normalized)
    }
    return normalized
  }

  // Gather legacy read-only data (safely handle environments without IndexedDB)
  let dbCats: BudgetCategory[] = []
  let dbAllocs: MonthlyAllocation[] = []
  if (typeof indexedDB !== 'undefined') {
    try {
      const [rawDbCats, rawDbAllocs] = await Promise.all([
        db.categories.toArray(),
        db.allocations.toArray(),
      ])
      dbCats = rawDbCats.map((c, idx) => ({
        ...c,
        sortOrder: typeof c.sortOrder === 'number' ? c.sortOrder : idx + 1,
      }))
      dbAllocs = rawDbAllocs
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
    return DEFAULT_BUDGET_PLAN_CATEGORIES
  }

  // Extract budget-relevant categories from legacy shared data without touching income categories
  const migrated = legacyAll.filter((c) => {
    if (c.type === 'income') return false
    return (
      LEGACY_BUDGET_DEFAULT_IDS.has(c.id) ||
      allocatedIds.has(c.id) ||
      Boolean(c.excludeFromExpenseTracking) ||
      Boolean(c.enableItemizedRecords) ||
      recordCatIds.has(c.id) ||
      /^cat-\d+$/.test(c.id)
    )
  })

  const normalized = normalizeBudgetCategories(migrated.length > 0 ? migrated : DEFAULT_BUDGET_PLAN_CATEGORIES)
  writeStoredBudgetCategories(normalized)
  return normalized
}

export const budgetCategoryRepository = {
  /** Returns all budget categories normalized and ordered by sortOrder (1-3 base, 4+ custom) */
  async findAll(): Promise<BudgetCategory[]> {
    return ensureInitialized()
  },

  /** Finds a budget category by its primary key */
  async findById(id: string): Promise<BudgetCategory | undefined> {
    const all = await ensureInitialized()
    return all.find((c) => c.id === id)
  },

  /** Inserts a new custom budget category at the next sequential position (4+) */
  async create(category: BudgetCategory): Promise<void> {
    const all = await ensureInitialized()
    const maxCustomOrder = all.reduce<number>(
      (max, c) => (BASE_BUDGET_CATEGORY_ID_SET.has(c.id) ? max : Math.max(max, c.sortOrder)),
      BASE_BUDGET_CATEGORY_IDS.length,
    )
    const entry: BudgetCategory = {
      ...category,
      type: 'expense',
      sortOrder: BASE_BUDGET_CATEGORY_ID_SET.has(category.id)
        ? DEFAULT_BUDGET_PLAN_CATEGORIES.find((b) => b.id === category.id)!.sortOrder
        : maxCustomOrder + 1,
    }
    const normalized = normalizeBudgetCategories([...all.filter((c) => c.id !== entry.id), entry])
    writeStoredBudgetCategories(normalized)
  },

  /** Updates an existing budget category without altering Display Order */
  async update(
    id: string,
    changes: Partial<Omit<BudgetCategory, 'id' | 'createdAt'>>,
  ): Promise<void> {
    const all = await ensureInitialized()
    const now = new Date().toISOString()
    // Base categories cannot change sortOrder or identity
    const safeChanges = { ...changes }
    delete safeChanges.sortOrder

    const updated = all.map((c) =>
      c.id === id ? { ...c, ...safeChanges, updatedAt: now } : c,
    )
    const normalized = normalizeBudgetCategories(updated)
    writeStoredBudgetCategories(normalized)
  },

  /** Deletes a custom budget category, normalizes remaining positions, and cleans up itemized records */
  async delete(id: string): Promise<void> {
    if (BASE_BUDGET_CATEGORY_ID_SET.has(id)) {
      throw new Error('Base budget categories cannot be deleted.')
    }
    const all = await ensureInitialized()
    const remaining = all.filter((c) => c.id !== id)
    const normalized = normalizeBudgetCategories(remaining)
    writeStoredBudgetCategories(normalized)
    await categoryRecordRepository.deleteByCategoryId(id)
  },

  /**
   * Reorders custom budget categories sequentially starting at position 4.
   * Base Categories (1, 2, 3) always stay locked at their original positions.
   */
  async reorder(orderedCategories: BudgetCategory[]): Promise<void> {
    const all = await ensureInitialized()
    const now = new Date().toISOString()

    // Extract custom categories in the requested sequence
    const orderedCustomOnly = orderedCategories.filter(
      (c) => !BASE_BUDGET_CATEGORY_ID_SET.has(c.id) && c.type !== 'income',
    )
    // Preserve any custom category that wasn't passed explicitly
    const passedIds = new Set(orderedCustomOnly.map((c) => c.id))
    const missingCustoms = all.filter(
      (c) => !BASE_BUDGET_CATEGORY_ID_SET.has(c.id) && !passedIds.has(c.id),
    )

    const reassignedCustoms = [...orderedCustomOnly, ...missingCustoms].map((cat, idx) => ({
      ...cat,
      sortOrder: BASE_BUDGET_CATEGORY_IDS.length + idx + 1,
      updatedAt: now,
    }))

    const baseCategories = all.filter((c) => BASE_BUDGET_CATEGORY_ID_SET.has(c.id))
    const normalized = normalizeBudgetCategories([...baseCategories, ...reassignedCustoms])
    writeStoredBudgetCategories(normalized)
  },
}
