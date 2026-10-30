/**
 * monthlyPlanRepository.ts
 * Data access layer for MonthlyPlan records.
 *
 * All IndexedDB operations are isolated here.
 * Services and React components must not use `db` directly.
 */
import { db } from '@/db/database'
import type { MonthlyPlan, MonthId } from '@/types/models'

export const monthlyPlanRepository = {
  /** Find a plan by its month identifier (e.g. "2024-01") */
  async findByMonth(month: MonthId): Promise<MonthlyPlan | undefined> {
    return db.monthlyPlans.where('month').equals(month).first()
  },

  /** Find a plan by its primary key */
  async findById(id: string): Promise<MonthlyPlan | undefined> {
    return db.monthlyPlans.get(id)
  },

  /** Returns all plans, most recent first */
  async findAll(): Promise<MonthlyPlan[]> {
    const plans = await db.monthlyPlans.toArray()
    return plans.sort((a, b) => b.month.localeCompare(a.month))
  },

  /** Inserts a new plan */
  async create(plan: MonthlyPlan): Promise<void> {
    await db.monthlyPlans.add(plan)
  },

  /** Updates an existing plan */
  async update(id: string, changes: Partial<Omit<MonthlyPlan, 'id' | 'createdAt'>>): Promise<void> {
    await db.monthlyPlans.update(id, { ...changes, updatedAt: new Date().toISOString() })
  },

  /** Deletes a plan and its associated allocations and transactions */
  async delete(id: string): Promise<void> {
    await db.transaction('rw', [db.monthlyPlans, db.allocations, db.transactions], async () => {
      await db.allocations.where('monthlyPlanId').equals(id).delete()
      await db.transactions.where('monthlyPlanId').equals(id).delete()
      await db.monthlyPlans.delete(id)
    })
  },
}

