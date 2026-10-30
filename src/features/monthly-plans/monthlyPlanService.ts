/**
 * monthlyPlanService.ts
 * Business logic for managing monthly budget plans.
 */
import { crypto } from '@/utils/crypto'
import { monthlyPlanRepository } from '@/repositories/monthlyPlanRepository'
import { allocationRepository } from '@/repositories/allocationRepository'
import { categoryRepository } from '@/repositories/categoryRepository'
import { validateAllocationsSum } from '@/domain/validation'
import type { MonthlyPlan, MonthlyAllocation, MonthId, BudgetCategory } from '@/types/models'

export interface CreatePlanInput {
  month: MonthId
  incomeVnd: number
  /** Allocations must sum to 100 */
  allocations: Array<{ categoryId: string; allocationPercent: number }>
}

export interface PlanWithDetails {
  plan: MonthlyPlan | null
  allocations: MonthlyAllocation[]
  categories: BudgetCategory[]
}

/**
 * Loads a monthly plan with its category allocations and all available categories.
 */
export async function getPlanWithAllocations(month: MonthId): Promise<PlanWithDetails> {
  const categories = await categoryRepository.findAll()
  const plan = await monthlyPlanRepository.findByMonth(month)

  if (!plan) {
    return { plan: null, allocations: [], categories }
  }

  const allocations = await allocationRepository.findByPlanId(plan.id)
  return { plan, allocations, categories }
}

/**
 * Creates a new monthly plan with its budget allocations.
 * Validates that allocations sum to exactly 100%.
 */
export async function createMonthlyPlan(input: CreatePlanInput): Promise<MonthlyPlan> {
  const percents = input.allocations.map((a) => a.allocationPercent)
  if (!validateAllocationsSum(percents)) {
    throw new Error(`Allocations must sum to 100%. Current sum: ${percents.reduce((a, b) => a + b, 0)}%`)
  }

  const existing = await monthlyPlanRepository.findByMonth(input.month)
  if (existing) {
    throw new Error(`A plan for ${input.month} already exists.`)
  }

  const now = new Date().toISOString()
  const plan: MonthlyPlan = {
    id: crypto.randomUUID(),
    month: input.month,
    incomeVnd: input.incomeVnd,
    createdAt: now,
    updatedAt: now,
  }

  const allocations: MonthlyAllocation[] = input.allocations.map((a) => ({
    id: crypto.randomUUID(),
    monthlyPlanId: plan.id,
    categoryId: a.categoryId,
    allocationPercent: a.allocationPercent,
    createdAt: now,
    updatedAt: now,
  }))

  await monthlyPlanRepository.create(plan)
  await allocationRepository.replaceForPlan(plan.id, allocations)

  return plan
}

/**
 * Updates an existing plan's income and reallocates budget percentages.
 * Historical allocation data for prior months is preserved.
 */
export async function updateMonthlyPlan(
  planId: string,
  input: Pick<CreatePlanInput, 'incomeVnd' | 'allocations'>,
): Promise<void> {
  const percents = input.allocations.map((a) => a.allocationPercent)
  if (!validateAllocationsSum(percents)) {
    throw new Error(`Allocations must sum to 100%. Current sum: ${percents.reduce((a, b) => a + b, 0)}%`)
  }

  const now = new Date().toISOString()
  await monthlyPlanRepository.update(planId, { incomeVnd: input.incomeVnd, updatedAt: now })

  const allocations: MonthlyAllocation[] = input.allocations.map((a) => ({
    id: crypto.randomUUID(),
    monthlyPlanId: planId,
    categoryId: a.categoryId,
    allocationPercent: a.allocationPercent,
    createdAt: now,
    updatedAt: now,
  }))

  await allocationRepository.replaceForPlan(planId, allocations)
}

/**
 * Saves a monthly plan (creates new or updates existing).
 */
export async function saveMonthlyPlan(input: CreatePlanInput): Promise<MonthlyPlan> {
  const existing = await monthlyPlanRepository.findByMonth(input.month)
  if (existing) {
    await updateMonthlyPlan(existing.id, {
      incomeVnd: input.incomeVnd,
      allocations: input.allocations,
    })
    return {
      ...existing,
      incomeVnd: input.incomeVnd,
      updatedAt: new Date().toISOString(),
    }
  }

  return createMonthlyPlan(input)
}
