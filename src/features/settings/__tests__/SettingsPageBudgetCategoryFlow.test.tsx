import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@/i18n/config'
import { SettingsProvider } from '@/context/SettingsContext'
import { SettingsPage } from '../SettingsPage'
import { CATEGORIES_STORAGE_KEY } from '@/context/transaction-context'
import { BUDGET_CATEGORIES_STORAGE_KEY, budgetCategoryRepository } from '@/repositories/budgetCategoryRepository'
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

  it('exposes only a single Manage Categories button (removing Add Category) and supports creating categories without touching Expense Categories', async () => {
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
      expect(screen.getByTestId('budget-manage-categories-btn')).toBeDefined()
    })

    // Standalone Add Category button must be removed, keeping only Manage Categories
    expect(screen.queryByTestId('budget-add-category-btn')).toBeNull()
    expect(screen.getAllByTestId('budget-manage-categories-btn')).toHaveLength(1)

    // Click Manage Categories button -> opens BudgetCategoryModal (NOT ExpenseCategoryModal)
    fireEvent.click(screen.getByTestId('budget-manage-categories-btn'))
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
  })

  it('creates an excluded itemized Budget Category via Manage Categories and immediately displays its independent card in Monthly Budget Plan', async () => {
    render(
      <SettingsProvider>
        <SettingsPage />
      </SettingsProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('budget-manage-categories-btn')).toBeDefined()
    })

    fireEvent.click(screen.getByTestId('budget-manage-categories-btn'))

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

  it('synchronizes Display Order changes immediately to Monthly Budget Plan and persists across reload', async () => {
    const seededCategories = [
      { id: 'cat-expenses', name: 'Daily Expenses', icon: '🛒', type: 'expense', sortOrder: 1, createdAt: '', updatedAt: '' },
      { id: 'cat-fixed', name: 'Fixed Bills', icon: '🏠', type: 'expense', isFixedBill: true, sortOrder: 2, createdAt: '', updatedAt: '' },
      { id: 'cat-savings', name: 'Savings', icon: '🏦', type: 'expense', sortOrder: 3, createdAt: '', updatedAt: '' },
      { id: 'cat-c1', name: 'Travel Fund', icon: '✈️', type: 'expense', sortOrder: 4, createdAt: '', updatedAt: '' },
      { id: 'cat-c2', name: 'Hobby Fund', icon: '🎨', type: 'expense', sortOrder: 5, createdAt: '', updatedAt: '' },
    ]
    localStorage.setItem(BUDGET_CATEGORIES_STORAGE_KEY, JSON.stringify(seededCategories))

    vi.spyOn(monthlyPlanService, 'getPlanWithAllocations').mockResolvedValue({
      plan: { id: 'plan-1', month: '2026-11', incomeVnd: 10_000_000, createdAt: '', updatedAt: '' },
      allocations: [
        { id: 'a1', monthlyPlanId: 'plan-1', categoryId: 'cat-expenses', allocationPercent: 50, createdAt: '', updatedAt: '' },
        { id: 'a2', monthlyPlanId: 'plan-1', categoryId: 'cat-fixed', allocationPercent: 20, createdAt: '', updatedAt: '' },
        { id: 'a3', monthlyPlanId: 'plan-1', categoryId: 'cat-savings', allocationPercent: 20, createdAt: '', updatedAt: '' },
        // Intentionally out-of-order allocations in DB to verify sortOrder takes precedence
        { id: 'a5', monthlyPlanId: 'plan-1', categoryId: 'cat-c2', allocationPercent: 5, createdAt: '', updatedAt: '' },
        { id: 'a4', monthlyPlanId: 'plan-1', categoryId: 'cat-c1', allocationPercent: 5, createdAt: '', updatedAt: '' },
      ],
      categories: seededCategories as never,
      isFromGlobalTemplate: false,
    })

    const { unmount } = render(
      <SettingsProvider>
        <SettingsPage />
      </SettingsProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('budget-plan-custom-item-cat-c1')).toBeDefined()
    })

    const getCustomOrder = () =>
      screen.getAllByTestId(/^budget-plan-custom-item-/).map((el) => el.getAttribute('data-testid'))

    expect(getCustomOrder()).toEqual([
      'budget-plan-custom-item-cat-c1',
      'budget-plan-custom-item-cat-c2',
    ])

    // Open Manage Categories and move cat-c2 up to position 4
    fireEvent.click(screen.getByTestId('budget-manage-categories-btn'))
    fireEvent.click(screen.getByTestId('budget-category-move-up-cat-c2'))

    await waitFor(() => {
      expect(getCustomOrder()).toEqual([
        'budget-plan-custom-item-cat-c2',
        'budget-plan-custom-item-cat-c1',
      ])
    })

    // Simulate reload by unmounting and remounting with updated categories from repository
    const updatedCategories = await budgetCategoryRepository.findAll()
    vi.spyOn(monthlyPlanService, 'getPlanWithAllocations').mockResolvedValue({
      plan: { id: 'plan-1', month: '2026-11', incomeVnd: 10_000_000, createdAt: '', updatedAt: '' },
      allocations: [
        { id: 'a1', monthlyPlanId: 'plan-1', categoryId: 'cat-expenses', allocationPercent: 50, createdAt: '', updatedAt: '' },
        { id: 'a2', monthlyPlanId: 'plan-1', categoryId: 'cat-fixed', allocationPercent: 20, createdAt: '', updatedAt: '' },
        { id: 'a3', monthlyPlanId: 'plan-1', categoryId: 'cat-savings', allocationPercent: 20, createdAt: '', updatedAt: '' },
        { id: 'a4', monthlyPlanId: 'plan-1', categoryId: 'cat-c1', allocationPercent: 5, createdAt: '', updatedAt: '' },
        { id: 'a5', monthlyPlanId: 'plan-1', categoryId: 'cat-c2', allocationPercent: 5, createdAt: '', updatedAt: '' },
      ],
      categories: updatedCategories,
      isFromGlobalTemplate: false,
    })

    unmount()
    render(
      <SettingsProvider>
        <SettingsPage />
      </SettingsProvider>,
    )

    await waitFor(() => {
      expect(getCustomOrder()).toEqual([
        'budget-plan-custom-item-cat-c2',
        'budget-plan-custom-item-cat-c1',
      ])
    })
  })
})
