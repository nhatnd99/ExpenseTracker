import { describe, it, expect } from 'vitest'
import { validateAllocationsSum, sumAllocations, allocationPercentSchema } from '../validation'

describe('validateAllocationsSum', () => {
  it('returns true when allocations sum to 100', () => {
    expect(validateAllocationsSum([70, 30])).toBe(true)
    expect(validateAllocationsSum([97, 1, 1, 1])).toBe(true)
    expect(validateAllocationsSum([100])).toBe(true)
  })

  it('returns false when allocations do not sum to 100', () => {
    expect(validateAllocationsSum([70, 20])).toBe(false)
    expect(validateAllocationsSum([50, 60])).toBe(false)
    expect(validateAllocationsSum([])).toBe(false)
  })
})

describe('sumAllocations', () => {
  it('sums the percentages correctly', () => {
    expect(sumAllocations([70, 30])).toBe(100)
    expect(sumAllocations([25, 25, 25, 25])).toBe(100)
    expect(sumAllocations([])).toBe(0)
  })
})

describe('allocationPercentSchema', () => {
  it('accepts valid percentages', () => {
    expect(() => allocationPercentSchema.parse(0)).not.toThrow()
    expect(() => allocationPercentSchema.parse(50)).not.toThrow()
    expect(() => allocationPercentSchema.parse(100)).not.toThrow()
  })

  it('rejects values outside 0-100', () => {
    expect(() => allocationPercentSchema.parse(-1)).toThrow()
    expect(() => allocationPercentSchema.parse(101)).toThrow()
  })

  it('rejects non-integer values', () => {
    expect(() => allocationPercentSchema.parse(50.5)).toThrow()
  })
})

