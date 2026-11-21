import { describe, it, expect, beforeEach } from 'vitest'
import {
  categoryRecordRepository,
  normalizeCategoryRecords,
} from '@/repositories/categoryRecordRepository'
import type { CategoryRecord } from '@/types/models'

describe('categoryRecordRepository', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('normalizes raw stored data with safe fallbacks', () => {
    const raw = [
      {
        id: 'rec-101',
        categoryId: 'cat-fun',
        name: 'Movie',
        amount: '120000',
        date: '2026-11-20',
      },
      {
        // Missing categoryId -> should be filtered out
        name: 'Invalid',
        amount: 50000,
      },
    ]

    const normalized = normalizeCategoryRecords(raw)
    expect(normalized).toHaveLength(1)
    expect(normalized[0].name).toBe('Movie')
    expect(normalized[0].amount).toBe(120000)
    expect(normalized[0].categoryId).toBe('cat-fun')
  })

  it('creates, updates, and deletes records', async () => {
    const record: CategoryRecord = {
      id: 'rec-1',
      categoryId: 'cat-events',
      name: 'Birthday Gift',
      amount: 500000,
      date: '2026-11-10',
      createdAt: '2026-11-10T10:00:00.000Z',
      updatedAt: '2026-11-10T10:00:00.000Z',
    }

    await categoryRecordRepository.create(record)
    const stored = await categoryRecordRepository.findAll()
    expect(stored).toHaveLength(1)
    expect(stored[0].name).toBe('Birthday Gift')

    // Update
    await categoryRecordRepository.update('rec-1', { amount: 550000, note: 'Wrapped' })
    const updated = await categoryRecordRepository.findByCategoryId('cat-events')
    expect(updated[0].amount).toBe(550000)
    expect(updated[0].note).toBe('Wrapped')

    // Delete
    await categoryRecordRepository.delete('rec-1')
    const remaining = await categoryRecordRepository.findAll()
    expect(remaining).toHaveLength(0)
  })

  it('deletes all records belonging to a category when deleted', async () => {
    const r1: CategoryRecord = {
      id: 'rec-1',
      categoryId: 'cat-trip',
      name: 'Gas',
      amount: 100000,
      date: '2026-11-01',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const r2: CategoryRecord = {
      id: 'rec-2',
      categoryId: 'cat-trip',
      name: 'Hotel',
      amount: 800000,
      date: '2026-11-02',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const r3: CategoryRecord = {
      id: 'rec-3',
      categoryId: 'cat-other',
      name: 'Coffee',
      amount: 30000,
      date: '2026-11-03',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await categoryRecordRepository.create(r1)
    await categoryRecordRepository.create(r2)
    await categoryRecordRepository.create(r3)

    expect(await categoryRecordRepository.findAll()).toHaveLength(3)

    // Delete by category ID
    await categoryRecordRepository.deleteByCategoryId('cat-trip')
    const remaining = await categoryRecordRepository.findAll()
    expect(remaining).toHaveLength(1)
    expect(remaining[0].id).toBe('rec-3')
  })
})
