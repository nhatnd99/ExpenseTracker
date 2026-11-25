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
      id: 'cat-1',
      name: 'Daily Expenses',
      icon: '🛒',
      type: 'expense',
      isFixedBill: false,
      sortOrder: 1,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
    {
      id: 'cat-2',
      name: 'Vacation',
      icon: 'Palmtree',
      type: 'expense',
      isFixedBill: true,
      excludeFromExpenseTracking: true,
      enableItemizedRecords: true,
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

  it('does not render Expense/Income transaction tabs and preserves Name, Icon, and ALL Additional Options', () => {
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

    // Should show Name input, Fixed Bill checkbox, and both Additional Options
    expect(screen.getByTestId('budget-category-name-input')).toBeDefined()
    expect(screen.getByTestId('budget-fixed-bill-checkbox')).toBeDefined()
    expect(screen.getByTestId('budget-exclude-tracking-checkbox')).toBeDefined()
    expect(screen.getByTestId('budget-itemized-records-checkbox')).toBeDefined()
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

    expect(screen.getByTestId('budget-category-manage-records-cat-2')).toBeDefined()
  })

  it('edits Budget Category preserving saved Additional Options and warns before changing tracking behavior when records exist', async () => {
    localStorage.setItem(BUDGET_CATEGORIES_STORAGE_KEY, JSON.stringify(categories))

    await categoryRecordRepository.create({
      id: 'rec-1',
      categoryId: 'cat-2',
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

    fireEvent.click(screen.getByTestId('budget-category-edit-cat-2'))

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
            id: 'cat-2',
            name: 'Holiday Trips',
            excludeFromExpenseTracking: false,
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

    fireEvent.click(screen.getByTestId('budget-category-delete-cat-2'))

    await waitFor(async () => {
      const remaining = await budgetCategoryRepository.findAll()
      expect(remaining.some((c) => c.id === 'cat-2')).toBe(false)
    })

    expect(mockOnCategoriesChanged).toHaveBeenCalledWith({
      type: 'deleted',
      categoryId: 'cat-2',
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
