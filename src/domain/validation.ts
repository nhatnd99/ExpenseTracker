/**
 * Budget allocation validation rules.
 * Pure functions — no React, no browser APIs, no side effects.
 */
import { z } from 'zod'

/** Validates that a percentage value is an integer between 0 and 100 */
export const allocationPercentSchema = z
  .number()
  .int('Allocation must be a whole number.')
  .min(0, 'Allocation must be at least 0%.')
  .max(100, 'Allocation cannot exceed 100%.')

/** Validates that a set of allocation percentages sums to exactly 100 */
export function validateAllocationsSum(percents: number[]): boolean {
  if (percents.length === 0) return false
  const total = percents.reduce((sum, p) => sum + p, 0)
  return total === 100
}

/** Returns the allocation sum for display or error messaging */
export function sumAllocations(percents: number[]): number {
  return percents.reduce((sum, p) => sum + p, 0)
}

/** Validates an income amount is a positive integer VND */
export const incomeSchema = z
  .number()
  .int('Income must be a whole number (VND has no sub-units).')
  .positive('Income must be greater than zero.')
  .max(10_000_000_000, 'Income value is unexpectedly large. Please check the amount.')

/** MonthId in "YYYY-MM" format */
export const monthIdSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must be in YYYY-MM format.')

/** DateString in "YYYY-MM-DD" format */
export const dateStringSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, 'Date must be in YYYY-MM-DD format.')

/** Transaction amount — positive integer VND */
export const transactionAmountSchema = z
  .number()
  .int('Amount must be a whole number (VND).')
  .min(1, 'Amount must be greater than zero.')
  .max(10_000_000_000, 'Amount seems too large. Please verify.')

