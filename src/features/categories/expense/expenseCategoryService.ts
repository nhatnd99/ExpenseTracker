/**
 * expenseCategoryService.ts
 * Independent business logic and validation for Expense & Income categories
 * used on the Expenses page and Record New Expense flow.
 *
 * Strictly manages Expense Category properties (name, icon, type, sortOrder).
 * Any legacy budget-specific properties on existing persisted objects are left
 * untouched during partial updates for full backward compatibility.
 */
import { crypto } from '@/utils/crypto'
import { expenseCategoryRepository } from '@/repositories/expenseCategoryRepository'
import type { ExpenseCategory, CategoryType } from '@/types/models'

export interface CreateExpenseCategoryInput {
  name: string
  icon?: string
  type?: CategoryType
}

export interface ExpenseCategoryValidationResult {
  valid: boolean
  errorCode?: 'NAME_REQUIRED'
}

/**
 * Validates expense category form input independently.
 */
export function validateExpenseCategoryInput(name: string): ExpenseCategoryValidationResult {
  if (!name.trim()) {
    return { valid: false, errorCode: 'NAME_REQUIRED' }
  }
  return { valid: true }
}

export async function getAllExpenseCategories(): Promise<ExpenseCategory[]> {
  return expenseCategoryRepository.findAll()
}

export async function addExpenseCategory(input: CreateExpenseCategoryInput): Promise<ExpenseCategory> {
  const validation = validateExpenseCategoryInput(input.name)
  if (!validation.valid) {
    throw new Error('Expense category name is required.')
  }

  const existing = await expenseCategoryRepository.findAll()
  const maxSortOrder = existing.reduce((max, c) => Math.max(max, c.sortOrder), 0)

  const now = new Date().toISOString()
  const newCategory: ExpenseCategory = {
    id: `cat-${crypto.randomUUID().slice(0, 8)}`,
    name: input.name.trim(),
    icon: input.icon?.trim() || '🏷️',
    type: input.type ?? 'expense',
    sortOrder: maxSortOrder + 1,
    createdAt: now,
    updatedAt: now,
  }

  await expenseCategoryRepository.create(newCategory)
  return newCategory
}

export async function updateExpenseCategory(
  id: string,
  changes: Partial<Pick<ExpenseCategory, 'name' | 'icon' | 'type' | 'sortOrder'>>,
): Promise<void> {
  if (changes.name !== undefined) {
    const validation = validateExpenseCategoryInput(changes.name)
    if (!validation.valid) {
      throw new Error('Expense category name is required.')
    }
  }
  await expenseCategoryRepository.update(id, changes)
}

export async function deleteExpenseCategory(id: string): Promise<void> {
  await expenseCategoryRepository.delete(id)
}

export async function reorderExpenseCategories(orderedCategories: ExpenseCategory[]): Promise<void> {
  await expenseCategoryRepository.reorder(orderedCategories)
}
