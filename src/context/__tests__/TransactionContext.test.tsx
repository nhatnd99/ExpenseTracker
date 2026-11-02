import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { ReactNode } from 'react'
import { TransactionProvider } from '../TransactionContext'
import { useTransactions } from '../useTransactions'
import {
  TRANSACTIONS_STORAGE_KEY,
  CATEGORIES_STORAGE_KEY,
  DEFAULT_BUDGET_CATEGORIES,
} from '../transaction-context'
import type { Transaction } from '@/types/models'

describe('TransactionContext Persistent Storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  const wrapper = ({ children }: { children: ReactNode }) => (
    <TransactionProvider>{children}</TransactionProvider>
  )

  it('initializes with default categories and empty transactions when localStorage is empty', () => {
    const { result } = renderHook(() => useTransactions(), { wrapper })
    expect(result.current.transactions).toEqual([])
    expect(result.current.categories).toEqual(DEFAULT_BUDGET_CATEGORIES)
  })

  it('rehydrates transactions and categories immediately from localStorage', () => {
    const mockTxs: Transaction[] = [
      {
        id: 'tx-1',
        monthlyPlanId: 'plan-1',
        categoryId: 'cat-expenses',
        amountVnd: 45000,
        date: '2026-11-02',
        type: 'expense',
        status: 'cleared',
        createdAt: '2026-11-02T10:00:00Z',
        updatedAt: '2026-11-02T10:00:00Z',
      },
    ]

    localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(mockTxs))

    const { result } = renderHook(() => useTransactions(), { wrapper })
    expect(result.current.transactions).toEqual(mockTxs)
    expect(result.current.transactions[0].amountVnd).toBe(45000)
  })

  it('adds, updates, and deletes transactions with automatic localStorage synchronization', async () => {
    const { result } = renderHook(() => useTransactions(), { wrapper })

    const newTx: Transaction = {
      id: 'tx-persistent-100',
      monthlyPlanId: 'plan-1',
      categoryId: 'cat-expenses',
      amountVnd: 50000,
      date: '2026-11-02',
      type: 'expense',
      status: 'cleared',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await act(async () => {
      await result.current.addTransaction(newTx)
    })

    expect(result.current.transactions.some((t) => t.id === 'tx-persistent-100')).toBe(true)
    const stored = JSON.parse(localStorage.getItem(TRANSACTIONS_STORAGE_KEY) || '[]')
    expect(stored.some((t: Transaction) => t.id === 'tx-persistent-100')).toBe(true)

    // Update
    await act(async () => {
      await result.current.updateTransaction('tx-persistent-100', { amountVnd: 75000 })
    })

    expect(result.current.transactions.find((t) => t.id === 'tx-persistent-100')?.amountVnd).toBe(75000)
    const storedUpdated = JSON.parse(localStorage.getItem(TRANSACTIONS_STORAGE_KEY) || '[]')
    expect(storedUpdated.find((t: Transaction) => t.id === 'tx-persistent-100')?.amountVnd).toBe(75000)

    // Delete
    await act(async () => {
      await result.current.deleteTransaction('tx-persistent-100')
    })

    expect(result.current.transactions.some((t) => t.id === 'tx-persistent-100')).toBe(false)
    const storedDeleted = JSON.parse(localStorage.getItem(TRANSACTIONS_STORAGE_KEY) || '[]')
    expect(storedDeleted.some((t: Transaction) => t.id === 'tx-persistent-100')).toBe(false)
  })

  it('manages custom categories with persistence in localStorage', async () => {
    const { result } = renderHook(() => useTransactions(), { wrapper })

    const newCat = {
      id: 'cat-custom-pet',
      name: 'Thú cưng',
      icon: 'Dog',
      type: 'expense' as const,
      isFixedBill: false,
      sortOrder: 15,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await act(async () => {
      await result.current.addCategory(newCat)
    })

    expect(result.current.categories.some((c) => c.id === 'cat-custom-pet')).toBe(true)
    const storedCats = JSON.parse(localStorage.getItem(CATEGORIES_STORAGE_KEY) || '[]')
    expect(storedCats.some((c: { id: string }) => c.id === 'cat-custom-pet')).toBe(true)
  })
})

