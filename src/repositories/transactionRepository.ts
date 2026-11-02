/**
 * transactionRepository.ts
 * Data access layer for Transaction records.
 * Provides dual-layer synchronization with localStorage for zero data loss on iOS Safari PWA swipe-up.
 */
import { db } from '@/db/database'
import type { Transaction, DateString } from '@/types/models'
import { TRANSACTIONS_STORAGE_KEY } from '@/context/transaction-context'

function getLocalStorageTransactions(): Transaction[] {
  try {
    if (typeof window === 'undefined') return []
    const raw = window.localStorage.getItem(TRANSACTIONS_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed as Transaction[]
    }
  } catch {
    // ignore
  }
  return []
}

function syncToLocalStorage(tx: Transaction) {
  try {
    if (typeof window === 'undefined') return
    const list = getLocalStorageTransactions()
    const updated = [tx, ...list.filter((t) => t.id !== tx.id)]
    window.localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(updated))
  } catch {
    // ignore
  }
}

function updateInLocalStorage(id: string, changes: Partial<Transaction>) {
  try {
    if (typeof window === 'undefined') return
    const list = getLocalStorageTransactions()
    const updated = list.map((t) =>
      t.id === id ? { ...t, ...changes, updatedAt: new Date().toISOString() } : t,
    )
    window.localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(updated))
  } catch {
    // ignore
  }
}

function deleteFromLocalStorage(id: string) {
  try {
    if (typeof window === 'undefined') return
    const list = getLocalStorageTransactions()
    const updated = list.filter((t) => t.id !== id)
    window.localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(updated))
  } catch {
    // ignore
  }
}

export const transactionRepository = {
  /** Returns all transactions for a given monthly plan, sorted by date descending */
  async findByPlanId(monthlyPlanId: string): Promise<Transaction[]> {
    let txs = await db.transactions
      .where('monthlyPlanId')
      .equals(monthlyPlanId)
      .toArray()

    if (txs.length === 0) {
      const fallback = getLocalStorageTransactions().filter((t) => t.monthlyPlanId === monthlyPlanId)
      if (fallback.length > 0) {
        txs = fallback
        void db.transactions.bulkPut(fallback).catch(() => {})
      }
    }

    return txs.sort((a, b) => b.date.localeCompare(a.date))
  },

  /** Returns transactions for a plan filtered by a specific date */
  async findByDate(monthlyPlanId: string, date: DateString): Promise<Transaction[]> {
    let txs = await db.transactions
      .where(['monthlyPlanId', 'date'])
      .equals([monthlyPlanId, date])
      .toArray()

    if (txs.length === 0) {
      const fallback = getLocalStorageTransactions().filter(
        (t) => t.monthlyPlanId === monthlyPlanId && t.date === date,
      )
      if (fallback.length > 0) {
        txs = fallback
      }
    }

    return txs
  },

  /** Returns transactions for a specific date (across any plan) */
  async findByDateOnly(date: DateString): Promise<Transaction[]> {
    let txs = await db.transactions.where('date').equals(date).toArray()

    if (txs.length === 0) {
      const fallback = getLocalStorageTransactions().filter((t) => t.date === date)
      if (fallback.length > 0) {
        txs = fallback
        void db.transactions.bulkPut(fallback).catch(() => {})
      }
    }

    return txs.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  },

  /** Returns transactions between startDate and endDate inclusive (across any plan) */
  async findByDateRange(startDate: DateString, endDate: DateString): Promise<Transaction[]> {
    let txs = await db.transactions
      .where('date')
      .between(startDate, endDate, true, true)
      .toArray()

    if (txs.length === 0) {
      const fallback = getLocalStorageTransactions().filter(
        (t) => t.date >= startDate && t.date <= endDate,
      )
      if (fallback.length > 0) {
        txs = fallback
        void db.transactions.bulkPut(fallback).catch(() => {})
      }
    }

    return txs.sort((a, b) => a.date.localeCompare(b.date))
  },

  /** Returns all transactions for a category */
  async findByCategoryId(categoryId: string): Promise<Transaction[]> {
    let txs = await db.transactions.where('categoryId').equals(categoryId).toArray()

    if (txs.length === 0) {
      const fallback = getLocalStorageTransactions().filter((t) => t.categoryId === categoryId)
      if (fallback.length > 0) {
        txs = fallback
      }
    }

    return txs
  },

  /** Inserts a new transaction */
  async create(transaction: Transaction): Promise<void> {
    syncToLocalStorage(transaction)
    await db.transactions.add(transaction)
  },

  /** Updates a transaction */
  async update(
    id: string,
    changes: Partial<Omit<Transaction, 'id' | 'createdAt'>>,
  ): Promise<void> {
    updateInLocalStorage(id, changes)
    await db.transactions.update(id, { ...changes, updatedAt: new Date().toISOString() })
  },

  /** Deletes a transaction */
  async delete(id: string): Promise<void> {
    deleteFromLocalStorage(id)
    await db.transactions.delete(id)
  },

  /** Sums all transaction amounts for a plan */
  async sumByPlanId(monthlyPlanId: string): Promise<number> {
    const txs = await this.findByPlanId(monthlyPlanId)
    return txs.reduce((sum, tx) => sum + tx.amountVnd, 0)
  },
}
