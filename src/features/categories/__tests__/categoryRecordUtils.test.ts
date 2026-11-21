import { describe, it, expect } from 'vitest'
import {
  filterRecordsByMonth,
  calculateRecordsTotal,
  compareRecordsDesc,
  validateRecordInput,
} from '../categoryRecordUtils'
import type { CategoryRecord } from '@/types/models'

describe('categoryRecordUtils', () => {
  const sampleRecords: CategoryRecord[] = [
    {
      id: 'rec-1',
      categoryId: 'cat-test',
      name: 'Item A',
      amount: 150000,
      date: '2026-11-05',
      createdAt: '2026-11-05T08:00:00.000Z',
      updatedAt: '2026-11-05T08:00:00.000Z',
    },
    {
      id: 'rec-2',
      categoryId: 'cat-test',
      name: 'Item B',
      amount: 250000,
      date: '2026-11-15',
      createdAt: '2026-11-15T10:00:00.000Z',
      updatedAt: '2026-11-15T10:00:00.000Z',
    },
    {
      id: 'rec-3',
      categoryId: 'cat-test',
      name: 'Item C',
      amount: 100000,
      date: '2026-10-20',
      createdAt: '2026-10-20T09:00:00.000Z',
      updatedAt: '2026-10-20T09:00:00.000Z',
    },
  ]

  describe('filterRecordsByMonth', () => {
    it('filters records belonging to the selected month', () => {
      const nov = filterRecordsByMonth(sampleRecords, '2026-11')
      expect(nov).toHaveLength(2)
      expect(nov.map((r) => r.id)).toEqual(['rec-1', 'rec-2'])

      const oct = filterRecordsByMonth(sampleRecords, '2026-10')
      expect(oct).toHaveLength(1)
      expect(oct[0].id).toBe('rec-3')
    })

    it('returns empty array when no records match month', () => {
      const dec = filterRecordsByMonth(sampleRecords, '2026-12')
      expect(dec).toHaveLength(0)
    })
  })

  describe('calculateRecordsTotal', () => {
    it('accurately sums the amounts of all records', () => {
      expect(calculateRecordsTotal(sampleRecords)).toBe(500000)
    })

    it('returns 0 for empty list', () => {
      expect(calculateRecordsTotal([])).toBe(0)
    })
  })

  describe('compareRecordsDesc', () => {
    it('sorts records descending by date', () => {
      const sorted = [...sampleRecords].sort(compareRecordsDesc)
      expect(sorted[0].date).toBe('2026-11-15')
      expect(sorted[1].date).toBe('2026-11-05')
      expect(sorted[2].date).toBe('2026-10-20')
    })
  })

  describe('validateRecordInput', () => {
    it('passes for valid input', () => {
      const res = validateRecordInput('Concert Ticket', 300000, '2026-11-20')
      expect(res.valid).toBe(true)
      expect(res.error).toBeUndefined()
    })

    it('rejects empty name', () => {
      const res = validateRecordInput('   ', 300000, '2026-11-20')
      expect(res.valid).toBe(false)
      expect(res.error).toBe('Record name is required')
    })

    it('rejects zero or negative amount', () => {
      expect(validateRecordInput('Book', 0, '2026-11-20').valid).toBe(false)
      expect(validateRecordInput('Book', -50000, '2026-11-20').valid).toBe(false)
    })

    it('rejects invalid date format', () => {
      expect(validateRecordInput('Book', 50000, '20-11-2026').valid).toBe(false)
      expect(validateRecordInput('Book', 50000, 'invalid').valid).toBe(false)
    })
  })
})
