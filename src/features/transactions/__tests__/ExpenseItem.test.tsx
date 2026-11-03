import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ExpenseItem } from '../components/ExpenseItem'
import type { EnrichedTransaction } from '../transactionService'

describe('ExpenseItem component', () => {
  const baseExpense: EnrichedTransaction = {
    id: 'tx-123',
    monthlyPlanId: 'plan-1',
    categoryId: 'cat-1',
    categoryName: 'Ăn uống',
    categoryIcon: 'Utensils',
    amountVnd: 45000,
    date: '2026-11-03',
    transactionDate: '2026-11-03T14:30:00.000Z',
    createdAt: '2026-11-03T14:30:00.000Z',
    status: 'cleared',
    description: 'Bún chả trưa',
    type: 'expense',
    updatedAt: '',
  }

  it('renders category name, amount, note, and formatted time (HH:mm)', () => {
    // Generate ISO with local time 14:30
    const localDate = new Date(2026, 10, 3, 14, 30, 0)
    const expenseWithLocalTime = {
      ...baseExpense,
      transactionDate: localDate.toISOString(),
    }

    render(<ExpenseItem expense={expenseWithLocalTime} />)

    expect(screen.getByText('Ăn uống')).toBeDefined()
    expect(screen.getByText(/45\.000/)).toBeDefined()
    expect(screen.getByText(/Bún chả trưa/)).toBeDefined()
    expect(screen.getByText('14:30')).toBeDefined()
  })

  it('falls back to createdAt when transactionDate is missing', () => {
    const localDate = new Date(2026, 10, 3, 9, 15, 0)
    const expense = {
      ...baseExpense,
      transactionDate: undefined,
      createdAt: localDate.toISOString(),
      description: undefined,
    }

    render(<ExpenseItem expense={expense} />)
    expect(screen.getByText('09:15')).toBeDefined()
  })
})
