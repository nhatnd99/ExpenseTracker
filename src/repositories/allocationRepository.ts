/**
 * allocationRepository.ts
 * Data access layer for MonthlyAllocation records.
 */
import { db } from '@/db/database'
import type { MonthlyAllocation } from '@/types/models'

export const allocationRepository = {
  /** Returns all allocations for a given monthly plan */
  async findByPlanId(monthlyPlanId: string): Promise<MonthlyAllocation[]> {
    return db.allocations.where('monthlyPlanId').equals(monthlyPlanId).toArray()
  },

  /** Returns allocations for a given category across all months */
  async findByCategoryId(categoryId: string): Promise<MonthlyAllocation[]> {
    return db.allocations.where('categoryId').equals(categoryId).toArray()
  },

  /** Inserts a new allocation */
  async create(allocation: MonthlyAllocation): Promise<void> {
    await db.allocations.add(allocation)
  },

  /** Replaces all allocations for a plan in a single transaction */
  async replaceForPlan(monthlyPlanId: string, allocations: MonthlyAllocation[]): Promise<void> {
    await db.transaction('rw', db.allocations, async () => {
      await db.allocations.where('monthlyPlanId').equals(monthlyPlanId).delete()
      await db.allocations.bulkAdd(allocations)
    })
  },

  /** Updates an existing allocation */
  async update(
    id: string,
    changes: Partial<Omit<MonthlyAllocation, 'id' | 'createdAt'>>,
  ): Promise<void> {
    await db.allocations.update(id, { ...changes, updatedAt: new Date().toISOString() })
  },

  /** Deletes a single allocation */
  async delete(id: string): Promise<void> {
    await db.allocations.delete(id)
  },
}

