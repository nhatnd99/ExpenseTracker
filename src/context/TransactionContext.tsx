import { useState, useCallback, useEffect, type ReactNode } from 'react'
import {
  TransactionContext,
  TRANSACTIONS_STORAGE_KEY,
  CATEGORIES_STORAGE_KEY,
  DEFAULT_BUDGET_CATEGORIES,
} from './transaction-context'
import type { Transaction, BudgetCategory } from '@/types/models'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { db } from '@/db/database'

export function TransactionProvider({ children }: { children: ReactNode }) {
  // 1. Transactions - Persisted via useLocalStorage
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>(
    TRANSACTIONS_STORAGE_KEY,
    [],
  )

  // 2. Categories - Persisted via useLocalStorage
  const [categories, setCategories] = useLocalStorage<BudgetCategory[]>(
    CATEGORIES_STORAGE_KEY,
    DEFAULT_BUDGET_CATEGORIES,
  )

  const [isRehydrated, setIsRehydrated] = useState(false)

  // Reconcile / Rehydrate with IndexedDB (Dexie) once on mount in the background
  useEffect(() => {
    let active = true

    async function syncStorageAndDb() {
      try {
        if (typeof window === 'undefined') return

        // 1. Transactions sync
        const dbTxs = await db.transactions.toArray()
        if (active) {
          const rawTxs = window.localStorage.getItem(TRANSACTIONS_STORAGE_KEY)
          const storedTxs: Transaction[] = rawTxs ? JSON.parse(rawTxs) : []
          if (storedTxs.length === 0 && dbTxs.length > 0) {
            // Rehydrate localStorage from Dexie
            setTransactions(dbTxs)
          } else if (storedTxs.length > 0 && dbTxs.length === 0) {
            // Rehydrate Dexie from localStorage
            await db.transactions.bulkPut(storedTxs)
          }
        }

        // 2. Categories sync
        const dbCats = await db.categories.toArray()
        if (active) {
          const rawCats = window.localStorage.getItem(CATEGORIES_STORAGE_KEY)
          const storedCats: BudgetCategory[] = rawCats ? JSON.parse(rawCats) : []
          if (storedCats.length === 0 && dbCats.length > 0) {
            // Rehydrate localStorage from Dexie
            setCategories(dbCats)
          } else if (storedCats.length > 0 && dbCats.length === 0) {
            // Rehydrate Dexie from localStorage
            await db.categories.bulkPut(storedCats)
          }
        }
      } catch (err) {
        if (process.env.NODE_ENV !== 'test') {
          console.warn('[TransactionContext] Sync with Dexie failed:', err)
        }
      } finally {
        if (active) {
          setIsRehydrated(true)
        }
      }
    }

    void syncStorageAndDb()

    return () => {
      active = false
    }
  }, [setTransactions, setCategories])

  // CRUD actions updating state (useLocalStorage syncs to localStorage immediately) + Dexie
  const addTransaction = useCallback(
    async (tx: Transaction) => {
      setTransactions((prev) => [tx, ...prev.filter((t) => t.id !== tx.id)])
      try {
        await db.transactions.put(tx)
      } catch (err) {
        if (process.env.NODE_ENV !== 'test') {
          console.warn('[TransactionContext] Dexie put transaction error:', err)
        }
      }
    },
    [setTransactions],
  )

  const updateTransaction = useCallback(
    async (id: string, updates: Partial<Transaction>) => {
      setTransactions((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t)),
      )
      try {
        await db.transactions.update(id, { ...updates, updatedAt: new Date().toISOString() })
      } catch (err) {
        if (process.env.NODE_ENV !== 'test') {
          console.warn('[TransactionContext] Dexie update transaction error:', err)
        }
      }
    },
    [setTransactions],
  )

  const deleteTransaction = useCallback(
    async (id: string) => {
      setTransactions((prev) => prev.filter((t) => t.id !== id))
      try {
        await db.transactions.delete(id)
      } catch (err) {
        if (process.env.NODE_ENV !== 'test') {
          console.warn('[TransactionContext] Dexie delete transaction error:', err)
        }
      }
    },
    [setTransactions],
  )

  const addCategory = useCallback(
    async (cat: BudgetCategory) => {
      setCategories((prev) => [...prev.filter((c) => c.id !== cat.id), cat])
      try {
        await db.categories.put(cat)
      } catch (err) {
        if (process.env.NODE_ENV !== 'test') {
          console.warn('[TransactionContext] Dexie put category error:', err)
        }
      }
    },
    [setCategories],
  )

  const updateCategory = useCallback(
    async (id: string, updates: Partial<BudgetCategory>) => {
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c)),
      )
      try {
        await db.categories.update(id, { ...updates, updatedAt: new Date().toISOString() })
      } catch (err) {
        if (process.env.NODE_ENV !== 'test') {
          console.warn('[TransactionContext] Dexie update category error:', err)
        }
      }
    },
    [setCategories],
  )

  const deleteCategory = useCallback(
    async (id: string) => {
      setCategories((prev) => prev.filter((c) => c.id !== id))
      try {
        await db.categories.delete(id)
      } catch (err) {
        if (process.env.NODE_ENV !== 'test') {
          console.warn('[TransactionContext] Dexie delete category error:', err)
        }
      }
    },
    [setCategories],
  )

  return (
    <TransactionContext.Provider
      value={{
        transactions,
        setTransactions,
        categories,
        setCategories,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        addCategory,
        updateCategory,
        deleteCategory,
        isRehydrated,
      }}
    >
      {children}
    </TransactionContext.Provider>
  )
}
