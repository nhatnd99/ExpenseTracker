/**
 * transactionRepository.ts
 * Data access layer for Transaction records.
 */
import { db } from '@/db/database'
import type { Transaction, DateString } from '@/types/models'

export const transactionRepository = {
  /** Returns all transactions for a given monthly plan, sorted by date descending */
  async findByPlanId(monthlyPlanId: string): Promise<Transaction[]> {
    const txs = await db.transactions
      .where('monthlyPlanId')
      .equals(monthlyPlanId)
      .toArray()
    return txs.sort((a, b) => b.date.localeCompare(a.date))
  },

  /** Returns transactions for a plan filtered by a specific date */
  async findByDate(monthlyPlanId: string, date: DateString): Promise<Transaction[]> {
    return db.transactions
      .where(['monthlyPlanId', 'date'])
      .equals([monthlyPlanId, date])
      .toArray()
  },

  /** Returns all transactions for a category */
  async findByCategoryId(categoryId: string): Promise<Transaction[]> {
    return db.transactions.where('categoryId').equals(categoryId).toArray()
  },

  /** Inserts a new transaction */
  async create(transaction: Transaction): Promise<void> {
    await db.transactions.add(transaction)
  },

  /** Updates a transaction */
  async update(
    id: string,
    changes: Partial<Omit<Transaction, 'id' | 'createdAt'>>,
  ): Promise<void> {
    await db.transactions.update(id, { ...changes, updatedAt: new Date().toISOString() })
  },

  /** Deletes a transaction */
  async delete(id: string): Promise<void> {
    await db.transactions.delete(id)
  },

  /** Sums all transaction amounts for a plan */
  async sumByPlanId(monthlyPlanId: string): Promise<number> {
    const txs = await db.transactions
      .where('monthlyPlanId')
      .equals(monthlyPlanId)
      .toArray()
    return txs.reduce((sum, tx) => sum + tx.amountVnd, 0)
  },
}

