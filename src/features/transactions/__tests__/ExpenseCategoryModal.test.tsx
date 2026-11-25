import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@/i18n/config'
import { ExpenseCategoryModal } from '../components/ExpenseCategoryModal'
import * as expenseCategoryService from '@/features/categories/expense/expenseCategoryService'
import { expenseCategoryRepository, sortExpenseCategories } from '@/repositories/expenseCategoryRepository'
import {
  budgetCategoryRepository,
  BUDGET_CATEGORIES_STORAGE_KEY,
} from '@/repositories/budgetCategoryRepository'
import {
  CATEGORIES_STORAGE_KEY,
  TRANSACTIONS_STORAGE_KEY,
} from '@/context/transaction-context'
import type { ExpenseCategory, Transaction } from '@/types/models'

describe('ExpenseCategoryModal - Dedicated Expense Category Management (Step 2)', () => {
  const mockOnClose = vi.fn()
  const mockOnCategoriesChanged = vi.fn()

  const initialCategories: ExpenseCategory[] = [
    {
      id: 'cat-1',
      name: 'Coffee',
      icon: 'Coffee',
      type: 'expense',
      isFixedBill: false,
      excludeFromExpenseTracking: true,
      enableItemizedRecords: true,
      sortOrder: 1,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
    {
      id: 'cat-2',
      name: 'Salary',
      icon: 'Banknote',
      type: 'income',
      sortOrder: 2,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
  ]

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
    localStorage.clear()
    vi.spyOn(window, 'confirm').mockImplementation(() => true)
  })

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <ExpenseCategoryModal
        isOpen={false}
        onClose={mockOnClose}
        categories={initialCategories}
        onCategoriesChanged={mockOnCategoriesChanged}
      />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('contains ONLY Name, Icon, and Type fields and removes all budget-specific options', () => {
    render(
      <ExpenseCategoryModal
        isOpen={true}
        onClose={mockOnClose}
        categories={initialCategories}
        onCategoriesChanged={mockOnCategoriesChanged}
      />,
    )

    // Has Name, Icon, Type
    expect(screen.getByTestId('category-name-input')).toBeDefined()
    expect(screen.getByText(/Expense/i)).toBeDefined()
    expect(screen.getByText(/Income/i)).toBeDefined()

    // Must NOT contain budget-specific fields, Additional Options, or Display Order UI
    expect(screen.queryByTestId('exclude-tracking-checkbox')).toBeNull()
    expect(screen.queryByTestId('itemized-records-checkbox')).toBeNull()
    expect(screen.queryByText(/Additional Options/i)).toBeNull()
    expect(screen.queryByText(/Separate from Expense Tracking/i)).toBeNull()
    expect(screen.queryByText(/Enable Itemized Records/i)).toBeNull()
    expect(screen.queryByText(/Fixed Bill/i)).toBeNull()
    expect(screen.queryByText(/Manage Records/i)).toBeNull()
    expect(screen.queryByText(/Mark as fixed bill/i)).toBeNull()
    expect(screen.queryByText(/Display Order/i)).toBeNull()
    expect(screen.queryByText(/Thứ tự hiển thị/i)).toBeNull()
    expect(screen.queryByRole('button', { name: /Move up|Di chuyển lên/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /Move down|Di chuyển xuống/i })).toBeNull()
  })

  it('creates categories without sortOrder and automatically sorts legacy + new categories consistently', async () => {
    localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(initialCategories))

    const created = await expenseCategoryService.addExpenseCategory({
      name: 'Parking',
      icon: 'Car',
      type: 'expense',
    })
    expect(created.sortOrder).toBeUndefined()

    const all = await expenseCategoryRepository.findAll()
    // Legacy categories with sortOrder preserve order first, followed by new categories without sortOrder
    expect(all.some((c) => c.id === created.id && c.name === 'Parking')).toBe(true)

    const customSorted = sortExpenseCategories([
      { id: 'c-new-2', name: 'Zebra', createdAt: '2026-11-25T12:00:00Z', updatedAt: '' },
      { id: 'c-legacy', name: 'Legacy', sortOrder: 1, createdAt: '2026-01-01T00:00:00Z', updatedAt: '' },
      { id: 'c-new-1', name: 'Alpha', createdAt: '2026-11-25T10:00:00Z', updatedAt: '' },
    ])
    expect(customSorted.map((c) => c.id)).toEqual(['c-legacy', 'c-new-1', 'c-new-2'])
  })

  it('validates empty name and creates Expense and Income categories independently', async () => {
    localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(initialCategories))

    render(
      <ExpenseCategoryModal
        isOpen={true}
        onClose={mockOnClose}
        categories={initialCategories}
        onCategoriesChanged={mockOnCategoriesChanged}
      />,
    )

    // 1. Create Expense category
    fireEvent.change(screen.getByTestId('category-name-input'), {
      target: { value: 'Transport' },
    })
    fireEvent.click(screen.getByTestId('category-submit-btn'))

    await waitFor(async () => {
      const stored = await expenseCategoryRepository.findAll()
      expect(stored.some((c) => c.name === 'Transport' && c.type === 'expense')).toBe(true)
    })

    // 2. Switch to Income tab and create Income category
    fireEvent.click(screen.getByRole('button', { name: /Income/i }))
    fireEvent.change(screen.getByTestId('category-name-input'), {
      target: { value: 'Freelance' },
    })
    fireEvent.click(screen.getByTestId('category-submit-btn'))

    await waitFor(async () => {
      const stored = await expenseCategoryRepository.findAll()
      expect(stored.some((c) => c.name === 'Freelance' && c.type === 'income')).toBe(true)
    })

    // Validation rejects empty string
    const validation = expenseCategoryService.validateExpenseCategoryInput('   ')
    expect(validation.valid).toBe(false)
  })

  it('edits Name, Icon, and Type while preserving existing budget-specific properties on legacy objects', async () => {
    localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(initialCategories))

    render(
      <ExpenseCategoryModal
        isOpen={true}
        onClose={mockOnClose}
        categories={initialCategories}
        onCategoriesChanged={mockOnCategoriesChanged}
      />,
    )

    // Click Edit on cat-1 (Coffee)
    fireEvent.click(screen.getByTestId('category-edit-cat-1'))

    // Edit dialog must not have budget-specific options
    expect(screen.queryByTestId('edit-exclude-tracking-checkbox')).toBeNull()
    expect(screen.queryByTestId('edit-itemized-records-checkbox')).toBeNull()

    // Change Name and Type (expense -> income)
    fireEvent.change(screen.getByTestId('edit-category-name-input'), {
      target: { value: 'Cashback Bonus' },
    })
    fireEvent.click(screen.getByTestId('edit-category-type-income'))
    fireEvent.click(screen.getByTestId('edit-category-save-btn'))

    await waitFor(async () => {
      const updated = await expenseCategoryRepository.findById('cat-1')
      expect(updated?.name).toBe('Cashback Bonus')
      expect(updated?.type).toBe('income')
      // Legacy budget properties were NOT accidentally wiped out
      expect(updated?.excludeFromExpenseTracking).toBe(true)
      expect(updated?.enableItemizedRecords).toBe(true)
    })
  })

  it('inspects transaction references before deletion and preserves historical records intact', async () => {
    localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(initialCategories))
    const historicalTx: Transaction = {
      id: 'tx-hist-1',
      monthlyPlanId: 'plan-1',
      categoryId: 'cat-1',
      amountVnd: 45000,
      date: '2026-11-20',
      type: 'expense',
      status: 'cleared',
      createdAt: '2026-11-20T10:00:00Z',
      updatedAt: '2026-11-20T10:00:00Z',
    }
    localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify([historicalTx]))

    const confirmSpy = vi.spyOn(window, 'confirm')

    render(
      <ExpenseCategoryModal
        isOpen={true}
        onClose={mockOnClose}
        categories={initialCategories}
        onCategoriesChanged={mockOnCategoriesChanged}
      />,
    )

    fireEvent.click(screen.getByTestId('category-delete-cat-1'))

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('1'))
    })

    await waitFor(async () => {
      const remainingCats = await expenseCategoryRepository.findAll()
      expect(remainingCats.some((c) => c.id === 'cat-1')).toBe(false)
    })

    // Historical transaction remains completely intact
    const remainingTxs = JSON.parse(localStorage.getItem(TRANSACTIONS_STORAGE_KEY) || '[]')
    expect(remainingTxs).toHaveLength(1)
    expect(remainingTxs[0].id).toBe('tx-hist-1')
  })

  it('does NOT affect Budget Categories during any Expense Category operation', async () => {
    await budgetCategoryRepository.create({
      id: 'cat-budget-1',
      name: 'Budget Savings',
      sortOrder: 1,
      createdAt: '',
      updatedAt: '',
    })
    const budgetBefore = localStorage.getItem(BUDGET_CATEGORIES_STORAGE_KEY)

    render(
      <ExpenseCategoryModal
        isOpen={true}
        onClose={mockOnClose}
        categories={initialCategories}
        onCategoriesChanged={mockOnCategoriesChanged}
      />,
    )

    fireEvent.change(screen.getByTestId('category-name-input'), {
      target: { value: 'Snacks' },
    })
    fireEvent.click(screen.getByTestId('category-submit-btn'))

    await waitFor(() => {
      expect(mockOnCategoriesChanged).toHaveBeenCalled()
    })

    expect(localStorage.getItem(BUDGET_CATEGORIES_STORAGE_KEY)).toBe(budgetBefore)
  })
})
