import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@/i18n/config'
import { CategoryManagerModal } from '../components/CategoryManagerModal'
import * as categoryService from '@/features/categories/categoryService'
import { categoryRecordRepository } from '@/repositories/categoryRecordRepository'
import type { BudgetCategory } from '@/types/models'

describe('CategoryManagerModal Component', () => {
  const mockOnClose = vi.fn()
  const mockOnCategoriesChanged = vi.fn()

  const categories: BudgetCategory[] = [
    {
      id: 'cat-1',
      name: 'Coffee',
      icon: 'Coffee',
      type: 'expense',
      sortOrder: 1,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
    {
      id: 'cat-2',
      name: 'Vacation',
      icon: 'Palmtree',
      type: 'expense',
      excludeFromExpenseTracking: true,
      enableItemizedRecords: true,
      sortOrder: 2,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    vi.spyOn(categoryService, 'addCategory').mockResolvedValue({
      id: 'cat-new',
      name: 'Test',
      sortOrder: 3,
      createdAt: '',
      updatedAt: '',
    })
    vi.spyOn(categoryService, 'updateCategory').mockResolvedValue()
    vi.spyOn(window, 'confirm').mockImplementation(() => true)
  })

  it('renders modal with Additional Options checkboxes', () => {
    render(
      <CategoryManagerModal
        isOpen={true}
        onClose={mockOnClose}
        categories={categories}
        onCategoriesChanged={mockOnCategoriesChanged}
      />
    )

    // Option 1 & Option 2 checkboxes via data-testid
    expect(screen.getByTestId('exclude-tracking-checkbox')).toBeDefined()
    expect(screen.getByTestId('itemized-records-checkbox')).toBeDefined()
  })

  it('submits new category with configured options', async () => {
    render(
      <CategoryManagerModal
        isOpen={true}
        onClose={mockOnClose}
        categories={categories}
        onCategoriesChanged={mockOnCategoriesChanged}
      />
    )

    const nameInput = screen.getByTestId('category-name-input')
    fireEvent.change(nameInput, { target: { value: 'Fitness & Gym' } })

    // Check both options
    const excludeCheckbox = screen.getByTestId('exclude-tracking-checkbox')
    const itemizedCheckbox = screen.getByTestId('itemized-records-checkbox')

    fireEvent.click(excludeCheckbox)
    fireEvent.click(itemizedCheckbox)

    const addBtn = screen.getByTestId('category-submit-btn')
    fireEvent.click(addBtn)

    await waitFor(() => {
      expect(categoryService.addCategory).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Fitness & Gym',
          excludeFromExpenseTracking: true,
          enableItemizedRecords: true,
        })
      )
    })
  })

  it('displays Manage Records button on categories with itemized records enabled', () => {
    render(
      <CategoryManagerModal
        isOpen={true}
        onClose={mockOnClose}
        categories={categories}
        onCategoriesChanged={mockOnCategoriesChanged}
      />
    )

    // "Vacation" has enableItemizedRecords: true
    const manageRecordsBtn = screen.getByTestId('category-manage-records-cat-2')
    expect(manageRecordsBtn).toBeDefined()
  })

  it('warns user before changing tracking behavior when records exist', async () => {
    // Add existing record for cat-2
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
      <CategoryManagerModal
        isOpen={true}
        onClose={mockOnClose}
        categories={categories}
        onCategoriesChanged={mockOnCategoriesChanged}
      />
    )

    // Click Edit on cat-2 (Vacation)
    const editBtn = screen.getByTestId('category-edit-cat-2')
    fireEvent.click(editBtn)

    // In edit dialog, uncheck excludeFromExpenseTracking
    const editExcludeCheckbox = screen.getByTestId('edit-exclude-tracking-checkbox')
    fireEvent.click(editExcludeCheckbox)

    const saveBtn = screen.getByTestId('edit-category-save-btn')
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalled()
    })
  })
})
