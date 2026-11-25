import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@/i18n/config'
import { SettingsProvider } from '@/context/SettingsContext'
import { SettingsPage } from '../SettingsPage'
import { CATEGORIES_STORAGE_KEY } from '@/context/transaction-context'
import { BUDGET_CATEGORIES_STORAGE_KEY } from '@/repositories/budgetCategoryRepository'
import * as monthlyPlanService from '@/features/monthly-plans/monthlyPlanService'

describe('SettingsPage Monthly Budget Plan Integration with BudgetCategoryModal (Step 3)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
    vi.spyOn(window, 'confirm').mockImplementation(() => true)
    vi.spyOn(monthlyPlanService, 'getPlanWithAllocations').mockResolvedValue({
      plan: null,
      allocations: [],
      categories: [],
      isFromGlobalTemplate: false,
    })
  })

  it('opens BudgetCategoryModal from both Add Category and Manage Categories buttons without touching Expense Categories', async () => {
    const initialExpenseCats = [
      { id: 'exp-1', name: 'Coffee', icon: 'Coffee', type: 'expense', sortOrder: 1, createdAt: '', updatedAt: '' },
    ]
    localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(initialExpenseCats))

    render(
      <SettingsProvider>
        <SettingsPage />
      </SettingsProvider>,
    )

    // Wait for initial loading spinner to finish
    await waitFor(() => {
      expect(screen.getByTestId('budget-add-category-btn')).toBeDefined()
    })

    // 1. Click Add Category button -> opens BudgetCategoryModal (NOT ExpenseCategoryModal)
    fireEvent.click(screen.getByTestId('budget-add-category-btn'))
    expect(screen.getByTestId('budget-category-modal')).toBeDefined()
    expect(screen.queryByTestId('expense-category-modal')).toBeNull()

    // Create a tracked Budget Category -> immediately updates Monthly Budget Plan customItems
    fireEvent.change(screen.getByTestId('budget-category-name-input'), {
      target: { value: 'Education Fund' },
    })
    fireEvent.click(screen.getByTestId('budget-category-submit-btn'))

    await waitFor(() => {
      const storedBudget = JSON.parse(localStorage.getItem(BUDGET_CATEGORIES_STORAGE_KEY) || '[]')
      expect(storedBudget.some((c: { name: string }) => c.name === 'Education Fund')).toBe(true)
    })

    // Close modal
    const closeBtns = screen.getAllByRole('button', { name: /Cancel|Close|Đóng/i })
    fireEvent.click(closeBtns[closeBtns.length - 1])
    expect(screen.queryByTestId('budget-category-modal')).toBeNull()

    // Verify Education Fund immediately appears in Monthly Budget Plan allocation list
    await waitFor(() => {
      expect(screen.getByDisplayValue('Education Fund')).toBeDefined()
    })

    // Verify Expense Categories remain completely untouched
    expect(localStorage.getItem(CATEGORIES_STORAGE_KEY)).toBe(JSON.stringify(initialExpenseCats))

    // 2. Click Manage Categories button -> opens BudgetCategoryModal as well
    fireEvent.click(screen.getByTestId('budget-manage-categories-btn'))
    expect(screen.getByTestId('budget-category-modal')).toBeDefined()
  })

  it('creates an excluded itemized Budget Category and immediately displays its independent card in Monthly Budget Plan', async () => {
    render(
      <SettingsProvider>
        <SettingsPage />
      </SettingsProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('budget-add-category-btn')).toBeDefined()
    })

    fireEvent.click(screen.getByTestId('budget-add-category-btn'))

    fireEvent.change(screen.getByTestId('budget-category-name-input'), {
      target: { value: 'Weekend Trips' },
    })
    fireEvent.click(screen.getByTestId('budget-exclude-tracking-checkbox'))
    fireEvent.click(screen.getByTestId('budget-itemized-records-checkbox'))
    fireEvent.click(screen.getByTestId('budget-category-submit-btn'))

    await waitFor(() => {
      const storedBudget = JSON.parse(localStorage.getItem(BUDGET_CATEGORIES_STORAGE_KEY) || '[]')
      expect(storedBudget.some((c: { name: string }) => c.name === 'Weekend Trips')).toBe(true)
    })

    const closeBtns = screen.getAllByRole('button', { name: /Cancel|Close|Đóng/i })
    fireEvent.click(closeBtns[closeBtns.length - 1])

    // Independent itemized card appears immediately in Monthly Budget Plan
    await waitFor(() => {
      expect(screen.getByText('Weekend Trips')).toBeDefined()
    })
  })
})
