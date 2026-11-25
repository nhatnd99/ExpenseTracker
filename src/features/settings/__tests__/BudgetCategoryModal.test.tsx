import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@/i18n/config'
import { BudgetCategoryModal } from '../components/BudgetCategoryModal'
import * as budgetCategoryService from '@/features/categories/budget/budgetCategoryService'
import {
  budgetCategoryRepository,
  BUDGET_CATEGORIES_STORAGE_KEY,
} from '@/repositories/budgetCategoryRepository'
import { categoryRecordRepository } from '@/repositories/categoryRecordRepository'
import { CATEGORIES_STORAGE_KEY } from '@/context/transaction-context'
import type { BudgetCategory } from '@/types/models'

describe('BudgetCategoryModal - Dedicated Monthly Budget Plan Category Management (Step 3)', () => {
  const mockOnClose = vi.fn()
  const mockOnCategoriesChanged = vi.fn()

  const categories: BudgetCategory[] = [
    {
      id: 'cat-expenses',
      name: 'Daily Expenses',
      icon: '🛒',
      type: 'expense',
      isFixedBill: false,
      sortOrder: 1,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
    {
      id: 'cat-fixed',
      name: 'Fixed Bills',
      icon: '🏠',
      type: 'expense',
      isFixedBill: true,
      sortOrder: 2,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
    {
      id: 'cat-savings',
      name: 'Savings',
      icon: '🏦',
      type: 'expense',
      isFixedBill: false,
      sortOrder: 3,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
    {
      id: 'cat-custom-1',
      name: 'Vacation',
      icon: 'Palmtree',
      type: 'expense',
      isFixedBill: true,
      excludeFromExpenseTracking: true,
      enableItemizedRecords: true,
      sortOrder: 4,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
    {
      id: 'cat-custom-2',
      name: 'Education',
      icon: 'GraduationCap',
      type: 'expense',
      isFixedBill: false,
      sortOrder: 5,
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

  it('locks System Base Categories at 1-3, exposes Custom ordering at 4+, and preserves Name, Icon, and Additional Options', () => {
    render(
      <BudgetCategoryModal
        isOpen={true}
        onClose={mockOnClose}
        categories={categories}
        onCategoriesChanged={mockOnCategoriesChanged}
      />,
    )

    expect(screen.getByTestId('budget-category-modal')).toBeDefined()
    // Should NOT show Income category tab
    expect(screen.queryByRole('button', { name: /Income/i })).toBeNull()

    // Should show Name input, Fixed Bill checkbox, both Additional Options, AND Display Order sections
    expect(screen.getByTestId('budget-category-name-input')).toBeDefined()
    expect(screen.getByTestId('budget-fixed-bill-checkbox')).toBeDefined()
    expect(screen.getByTestId('budget-exclude-tracking-checkbox')).toBeDefined()
    expect(screen.getByTestId('budget-itemized-records-checkbox')).toBeDefined()
    expect(screen.getByTestId('system-budget-categories-list')).toBeDefined()
    expect(screen.getByTestId('custom-budget-categories-list')).toBeDefined()
    expect(screen.getByTestId('category-position-cat-expenses').textContent).toBe('1')
    expect(screen.getByTestId('category-position-cat-fixed').textContent).toBe('2')
    expect(screen.getByTestId('category-position-cat-savings').textContent).toBe('3')
    expect(screen.getByTestId('category-position-cat-custom-1').textContent).toBe('4')
    expect(screen.getByTestId('category-position-cat-custom-2').textContent).toBe('5')

    // Base categories must NOT have edit, delete, or move buttons
    expect(screen.queryByTestId('budget-category-edit-cat-expenses')).toBeNull()
    expect(screen.queryByTestId('budget-category-delete-cat-fixed')).toBeNull()
    expect(screen.queryByTestId('budget-category-move-up-cat-savings')).toBeNull()

    // Custom categories start at 4 and can only move within positions 4+
    const firstMoveUp = screen.getByTestId('budget-category-move-up-cat-custom-1') as HTMLButtonElement
    const lastMoveDown = screen.getByTestId('budget-category-move-down-cat-custom-2') as HTMLButtonElement
    expect(firstMoveUp.disabled).toBe(true)
    expect(lastMoveDown.disabled).toBe(true)
    expect((screen.getByTestId('budget-category-move-up-cat-custom-2') as HTMLButtonElement).disabled).toBe(false)
  })

  it('reorders custom categories within positions 4+ without affecting System Categories 1-3', async () => {
    localStorage.setItem(BUDGET_CATEGORIES_STORAGE_KEY, JSON.stringify(categories))

    render(
      <BudgetCategoryModal
        isOpen={true}
        onClose={mockOnClose}
        categories={categories}
        onCategoriesChanged={mockOnCategoriesChanged}
      />,
    )

    fireEvent.click(screen.getByTestId('budget-category-move-up-cat-custom-2'))

    await waitFor(async () => {
      const stored = await budgetCategoryRepository.findAll()
      expect(stored.map((c) => ({ id: c.id, sortOrder: c.sortOrder }))).toEqual([
        { id: 'cat-expenses', sortOrder: 1 },
        { id: 'cat-fixed', sortOrder: 2 },
        { id: 'cat-savings', sortOrder: 3 },
        { id: 'cat-custom-2', sortOrder: 4 },
        { id: 'cat-custom-1', sortOrder: 5 },
      ])
    })

    expect(mockOnCategoriesChanged).toHaveBeenCalledWith({ type: 'reordered' })
  })

  it('creates a Budget Category with Additional Options and notifies parent with created category', async () => {
    localStorage.setItem(BUDGET_CATEGORIES_STORAGE_KEY, JSON.stringify(categories))

    render(
      <BudgetCategoryModal
        isOpen={true}
        onClose={mockOnClose}
        categories={categories}
        onCategoriesChanged={mockOnCategoriesChanged}
      />,
    )

    fireEvent.change(screen.getByTestId('budget-category-name-input'), {
      target: { value: 'Fitness & Gym' },
    })
    fireEvent.click(screen.getByTestId('budget-fixed-bill-checkbox'))
    fireEvent.click(screen.getByTestId('budget-exclude-tracking-checkbox'))
    fireEvent.click(screen.getByTestId('budget-itemized-records-checkbox'))
    fireEvent.click(screen.getByTestId('budget-category-submit-btn'))

    await waitFor(async () => {
      const stored = await budgetCategoryRepository.findAll()
      const created = stored.find((c) => c.name === 'Fitness & Gym')
      expect(created).toBeDefined()
      expect(created?.isFixedBill).toBe(true)
      expect(created?.excludeFromExpenseTracking).toBe(true)
      expect(created?.enableItemizedRecords).toBe(true)
    })

    expect(mockOnCategoriesChanged).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'created',
        category: expect.objectContaining({ name: 'Fitness & Gym' }),
      }),
    )
  })

  it('displays Manage Records button on categories with itemized records enabled', () => {
    render(
      <BudgetCategoryModal
        isOpen={true}
        onClose={mockOnClose}
        categories={categories}
        onCategoriesChanged={mockOnCategoriesChanged}
      />,
    )

    expect(screen.getByTestId('budget-category-manage-records-cat-custom-1')).toBeDefined()
  })

  it('edits Budget Category preserving saved Additional Options and warns before changing tracking behavior when records exist', async () => {
    localStorage.setItem(BUDGET_CATEGORIES_STORAGE_KEY, JSON.stringify(categories))

    await categoryRecordRepository.create({
      id: 'rec-1',
      categoryId: 'cat-custom-1',
      name: 'Flight ticket',
      amount: 1200000,
      date: '2026-11-10',
      createdAt: '',
      updatedAt: '',
    })

    const confirmSpy = vi.spyOn(window, 'confirm')

    render(
      <BudgetCategoryModal
        isOpen={true}
        onClose={mockOnClose}
        categories={categories}
        onCategoriesChanged={mockOnCategoriesChanged}
      />,
    )

    fireEvent.click(screen.getByTestId('budget-category-edit-cat-custom-1'))

    // Verify saved options are preserved in edit form
    expect(
      (screen.getByTestId('budget-edit-fixed-bill-checkbox') as HTMLInputElement).checked,
    ).toBe(true)
    expect(
      (screen.getByTestId('budget-edit-exclude-tracking-checkbox') as HTMLInputElement).checked,
    ).toBe(true)
    expect(
      (screen.getByTestId('budget-edit-itemized-records-checkbox') as HTMLInputElement).checked,
    ).toBe(true)

    fireEvent.change(screen.getByTestId('budget-edit-category-name-input'), {
      target: { value: 'Holiday Trips' },
    })
    fireEvent.click(screen.getByTestId('budget-edit-exclude-tracking-checkbox'))
    fireEvent.click(screen.getByTestId('budget-edit-category-save-btn'))

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalled()
      expect(mockOnCategoriesChanged).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'updated',
          category: expect.objectContaining({
            id: 'cat-custom-1',
            name: 'Holiday Trips',
            excludeFromExpenseTracking: false,
            sortOrder: 4,
          }),
        }),
      )
    })
  })

  it('deletes a Budget Category and notifies parent', async () => {
    localStorage.setItem(BUDGET_CATEGORIES_STORAGE_KEY, JSON.stringify(categories))

    render(
      <BudgetCategoryModal
        isOpen={true}
        onClose={mockOnClose}
        categories={categories}
        onCategoriesChanged={mockOnCategoriesChanged}
      />,
    )

    fireEvent.click(screen.getByTestId('budget-category-delete-cat-custom-1'))

    await waitFor(async () => {
      const remaining = await budgetCategoryRepository.findAll()
      expect(remaining.some((c) => c.id === 'cat-custom-1')).toBe(false)
      expect(remaining.find((c) => c.id === 'cat-custom-2')?.sortOrder).toBe(4)
    })

    expect(mockOnCategoriesChanged).toHaveBeenCalledWith({
      type: 'deleted',
      categoryId: 'cat-custom-1',
    })
  })

  it('does NOT modify Expense Categories storage during any Budget Category operation', async () => {
    localStorage.setItem(
      CATEGORIES_STORAGE_KEY,
      JSON.stringify([{ id: 'exp-1', name: 'Coffee', type: 'expense', sortOrder: 1 }]),
    )
    const expenseBefore = localStorage.getItem(CATEGORIES_STORAGE_KEY)

    const addSpy = vi.spyOn(budgetCategoryService, 'addBudgetCategory')

    render(
      <BudgetCategoryModal
        isOpen={true}
        onClose={mockOnClose}
        categories={categories}
        onCategoriesChanged={mockOnCategoriesChanged}
      />,
    )

    fireEvent.change(screen.getByTestId('budget-category-name-input'), {
      target: { value: 'Travel Fund' },
    })
    fireEvent.click(screen.getByTestId('budget-category-submit-btn'))

    await waitFor(() => {
      expect(addSpy).toHaveBeenCalled()
      expect(mockOnCategoriesChanged).toHaveBeenCalled()
    })

    expect(localStorage.getItem(CATEGORIES_STORAGE_KEY)).toBe(expenseBefore)
  })
})
