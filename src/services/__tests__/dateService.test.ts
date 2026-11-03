import { describe, it, expect } from 'vitest'
import {
  formatDate,
  formatMonth,
  getTodayString,
  getCurrentMonthId,
  parseDateString,
  shiftDate,
  dateToMonthId,
  formatVnd,
  formatVndCompact,
  combineDateWithCurrentTime,
  formatTime,
  compareTransactionsDesc,
} from '../dateService'

describe('dateService', () => {
  it('formats dates and months accurately', () => {
    const d = new Date(2026, 10, 3) // Month 10 is November (0-indexed)
    expect(formatDate(d)).toBe('2026-11-03')
    expect(formatMonth(d)).toBe('2026-11')
    expect(getTodayString()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(getCurrentMonthId()).toMatch(/^\d{4}-\d{2}$/)
    expect(dateToMonthId('2026-11-03')).toBe('2026-11')
  })

  it('parses and shifts dates correctly', () => {
    const parsed = parseDateString('2026-11-03')
    expect(parsed.getFullYear()).toBe(2026)
    expect(parsed.getMonth()).toBe(10)
    expect(parsed.getDate()).toBe(3)

    expect(shiftDate('2026-11-03', 1)).toBe('2026-11-04')
    expect(shiftDate('2026-11-03', -1)).toBe('2026-11-02')
  })

  it('formats VND currency correctly', () => {
    expect(formatVnd(100000)).toContain('100.000')
    expect(formatVndCompact(1500000)).toBe('1.5M ₫')
    expect(formatVndCompact(50000)).toBe('50K ₫')
    expect(formatVndCompact(500)).toBe('500 ₫')
  })

  describe('combineDateWithCurrentTime', () => {
    it('combines a selected date string with reference time', () => {
      // 21:38:15 local time
      const ref = new Date(2026, 10, 3, 21, 38, 15, 500)
      const combinedIso = combineDateWithCurrentTime('2026-11-01', ref)

      const d = new Date(combinedIso)
      expect(d.getFullYear()).toBe(2026)
      expect(d.getMonth()).toBe(10)
      expect(d.getDate()).toBe(1)
      expect(d.getHours()).toBe(21)
      expect(d.getMinutes()).toBe(38)
      expect(d.getSeconds()).toBe(15)
    })

    it('returns ISO string fallback on missing dateStr', () => {
      const result = combineDateWithCurrentTime('')
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })
  })

  describe('formatTime', () => {
    it('formats valid ISO string as HH:mm', () => {
      const d = new Date(2026, 10, 3, 14, 30, 0)
      expect(formatTime(d.toISOString())).toBe('14:30')
    })

    it('returns empty string for invalid or missing timestamp', () => {
      expect(formatTime(undefined)).toBe('')
      expect(formatTime('')).toBe('')
      expect(formatTime('invalid-date')).toBe('')
    })
  })

  describe('compareTransactionsDesc', () => {
    it('sorts different dates in descending order (newer date first)', () => {
      const tx1 = { date: '2026-11-02', createdAt: '2026-11-02T10:00:00Z' }
      const tx2 = { date: '2026-11-03', createdAt: '2026-11-03T10:00:00Z' }

      const sorted = [tx1, tx2].sort(compareTransactionsDesc)
      expect(sorted[0].date).toBe('2026-11-03')
      expect(sorted[1].date).toBe('2026-11-02')
    })

    it('sorts transactions on the SAME day with log bù (newest createdAt first)', () => {
      // User creates a transaction on Nov 3 for Nov 1 (log bù)
      const backfilledTx = {
        date: '2026-11-01',
        transactionDate: '2026-11-01T21:38:00.000Z',
        createdAt: '2026-11-03T14:38:00.000Z', // Created today
      }

      // Existing transaction logged on Nov 1
      const originalTx = {
        date: '2026-11-01',
        transactionDate: '2026-11-01T08:00:00.000Z',
        createdAt: '2026-11-01T01:00:00.000Z', // Created Nov 1
      }

      const list = [originalTx, backfilledTx].sort(compareTransactionsDesc)
      // Backfilled record MUST be at the top of Nov 1 group
      expect(list[0]).toBe(backfilledTx)
      expect(list[1]).toBe(originalTx)
    })

    it('falls back to transactionDate timestamp if createdAt matches or is absent', () => {
      const txMorning = {
        date: '2026-11-02',
        transactionDate: '2026-11-02T08:00:00.000Z',
        createdAt: '2026-11-02T08:00:00.000Z',
      }
      const txEvening = {
        date: '2026-11-02',
        transactionDate: '2026-11-02T20:00:00.000Z',
        createdAt: '2026-11-02T08:00:00.000Z',
      }

      const list = [txMorning, txEvening].sort(compareTransactionsDesc)
      expect(list[0]).toBe(txEvening)
      expect(list[1]).toBe(txMorning)
    })
  })
})

