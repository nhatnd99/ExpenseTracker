import { useState } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@/i18n/config'
import { SettingsProvider } from '@/context/SettingsContext'
import { CreateExpenseModal } from '../components/CreateExpenseModal'
import { expenseCategoryRepository } from '@/repositories/expenseCategoryRepository'
import { CATEGORIES_STORAGE_KEY } from '@/context/transaction-context'
import type { ExpenseCategory } from '@/types/models'

describe('Record New Expense Integration with Dedicated ExpenseCategoryModal', () => {
  const initialCategories: ExpenseCategory[] = [
    {
      id: 'cat-food',
      name: 'Food',
      icon: 'Utensils',
      type: 'expense',
      sortOrder: 1,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
    {
      id: 'cat-salary',
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
    localStorage.clear()
    localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(initialCategories))
  })

  function Harness() {
    const [categories, setCategories] = useState<ExpenseCategory[]>(initialCategories)

    const handleCategoriesChanged = async () => {
      const fresh = await expenseCategoryRepository.findAll()
      setCategories(fresh)
    }

    return (
      <SettingsProvider>
        <CreateExpenseModal
          isOpen={true}
          onClose={vi.fn()}
          categories={categories}
          onCategoriesChanged={() => void handleCategoriesChanged()}
          initialDate="2026-11-25"
          onSubmit={vi.fn()}
        />
      </SettingsProvider>
    )
  }

  it('opens ExpenseCategoryModal from both Customize and Add Category buttons without resetting form data, and refreshes category list immediately', async () => {
    render(<Harness />)

    // Enter amount and note in Record New Expense
    fireEvent.click(screen.getByRole('button', { name: '5' }))
    fireEvent.click(screen.getByRole('button', { name: '0' }))
    fireEvent.click(screen.getByRole('button', { name: '000' }))

    const noteInput = screen.getByPlaceholderText(/Lunch with team/i)
    fireEvent.change(noteInput, { target: { value: 'Morning espresso' } })

    // 1. Open via Add Category button
    fireEvent.click(screen.getByTestId('add-category-btn'))
    expect(screen.getByTestId('expense-category-modal')).toBeDefined()
    expect(screen.queryByTestId('budget-category-modal')).toBeNull()

    // Create a new Expense Category
    fireEvent.change(screen.getByTestId('category-name-input'), {
      target: { value: 'Specialty Coffee' },
    })
    fireEvent.click(screen.getByTestId('category-submit-btn'))

    // Wait for modal list & CreateExpenseModal category list to refresh
    await waitFor(() => {
      expect(screen.getAllByText('Specialty Coffee').length).toBeGreaterThanOrEqual(1)
    })

    // Close ExpenseCategoryModal
    const closeButtons = screen.getAllByRole('button', { name: /Cancel|Close/i })
    fireEvent.click(closeButtons[closeButtons.length - 1])

    // Verify ExpenseCategoryModal is closed
    expect(screen.queryByTestId('expense-category-modal')).toBeNull()

    // Verify unrelated form data (amount 50,000 and note) was NOT lost!
    expect(screen.getByText('50,000')).toBeDefined()
    expect((screen.getByPlaceholderText(/Lunch with team/i) as HTMLInputElement).value).toBe(
      'Morning espresso',
    )

    // Newly created category is immediately selectable in Record New Expense!
    const newCatBtn = screen.getByRole('button', { name: 'Specialty Coffee' })
    fireEvent.click(newCatBtn)

    // 2. Open via Customize button
    fireEvent.click(screen.getByTestId('customize-categories-btn'))
    expect(screen.getByTestId('expense-category-modal')).toBeDefined()
  })

  it('filters categories by Expense vs Income type accurately in Record New Expense', async () => {
    render(<Harness />)

    // Expense tab shows Food, hides Salary
    expect(screen.getByRole('button', { name: 'Food' })).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Salary' })).toBeNull()

    // Switch Record New Expense to Income tab
    fireEvent.click(screen.getByRole('button', { name: /Income/i }))

    // Income tab shows Salary, hides Food
    expect(screen.getByRole('button', { name: 'Salary' })).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Food' })).toBeNull()
  })
})
