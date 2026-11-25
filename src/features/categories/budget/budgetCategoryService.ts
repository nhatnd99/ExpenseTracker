/**
 * budgetCategoryService.ts
 * Independent business logic and validation for Monthly Budget Plan categories
 * used on Settings -> Monthly Budget Plan.
 *
 * Enforces Base Category lock (positions 1, 2, 3) and sequential Custom Category
 * ordering starting at position 4.
 */
import { crypto } from '@/utils/crypto'
import {
  budgetCategoryRepository,
  BASE_BUDGET_CATEGORY_IDS,
  isBaseBudgetCategory,
} from '@/repositories/budgetCategoryRepository'
import type { BudgetCategory, CategoryType } from '@/types/models'

export interface CreateBudgetCategoryInput {
  name: string
  icon?: string
  isFixedBill?: boolean
  type?: CategoryType
  excludeFromExpenseTracking?: boolean
  enableItemizedRecords?: boolean
}

export interface BudgetCategoryValidationResult {
  valid: boolean
  errorCode?: 'NAME_REQUIRED'
}

/**
 * Validates budget category form input independently.
 */
export function validateBudgetCategoryInput(name: string): BudgetCategoryValidationResult {
  if (!name.trim()) {
    return { valid: false, errorCode: 'NAME_REQUIRED' }
  }
  return { valid: true }
}

export async function getAllBudgetCategories(): Promise<BudgetCategory[]> {
  return budgetCategoryRepository.findAll()
}

export async function addBudgetCategory(input: CreateBudgetCategoryInput): Promise<BudgetCategory> {
  const validation = validateBudgetCategoryInput(input.name)
  if (!validation.valid) {
    throw new Error('Budget category name is required.')
  }

  const existing = await budgetCategoryRepository.findAll()
  const maxCustomOrder = existing.reduce<number>(
    (max, c) => (isBaseBudgetCategory(c.id) ? max : Math.max(max, c.sortOrder)),
    BASE_BUDGET_CATEGORY_IDS.length,
  )

  const now = new Date().toISOString()
  const newCategory: BudgetCategory = {
    id: `cat-${crypto.randomUUID().slice(0, 8)}`,
    name: input.name.trim(),
    icon: input.icon?.trim() || '🏷️',
    isFixedBill: Boolean(input.isFixedBill),
    type: 'expense',
    excludeFromExpenseTracking: Boolean(input.excludeFromExpenseTracking),
    enableItemizedRecords: Boolean(input.enableItemizedRecords),
    sortOrder: maxCustomOrder + 1,
    createdAt: now,
    updatedAt: now,
  }

  await budgetCategoryRepository.create(newCategory)
  const stored = await budgetCategoryRepository.findById(newCategory.id)
  return stored ?? newCategory
}

export async function updateBudgetCategory(
  id: string,
  changes: Partial<
    Pick<
      BudgetCategory,
      | 'name'
      | 'icon'
      | 'isFixedBill'
      | 'excludeFromExpenseTracking'
      | 'enableItemizedRecords'
    >
  >,
): Promise<void> {
  if (changes.name !== undefined) {
    const validation = validateBudgetCategoryInput(changes.name)
    if (!validation.valid) {
      throw new Error('Budget category name is required.')
    }
  }
  await budgetCategoryRepository.update(id, changes)
}

export async function deleteBudgetCategory(id: string): Promise<void> {
  if (isBaseBudgetCategory(id)) {
    throw new Error('Base budget categories cannot be deleted.')
  }
  await budgetCategoryRepository.delete(id)
}

export async function reorderBudgetCategories(orderedCustomCategories: BudgetCategory[]): Promise<void> {
  await budgetCategoryRepository.reorder(orderedCustomCategories)
}
