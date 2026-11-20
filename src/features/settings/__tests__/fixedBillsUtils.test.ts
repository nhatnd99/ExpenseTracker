import { describe, it, expect } from 'vitest'
import {
  normalizeFixedBill,
  normalizeFixedBills,
  getBillPaymentStatus,
  getBillPaidAt,
  toggleBillPaymentStatus,
  calculateFixedBillsSummary,
  filterFixedBills,
  shiftMonthId,
  formatBillingMonth,
  mergeBills,
} from '../utils/fixedBillsUtils'
import type { FixedBillItem } from '../types'

describe('fixedBillsUtils', () => {
  describe('normalizeFixedBill & normalizeFixedBills', () => {
    it('returns null for non-object inputs', () => {
      expect(normalizeFixedBill(null)).toBeNull()
      expect(normalizeFixedBill(undefined)).toBeNull()
      expect(normalizeFixedBill('invalid')).toBeNull()
      expect(normalizeFixedBill(123)).toBeNull()
    })

    it('normalizes legacy bill without paymentHistory', () => {
      const legacy = { id: 'fb-1', name: 'Tiền nhà', amountVnd: 1500000 }
      const normalized = normalizeFixedBill(legacy)
      expect(normalized).toEqual({
        id: 'fb-1',
        name: 'Tiền nhà',
        amountVnd: 1500000,
        paymentHistory: {},
      })
    })

    it('handles alternative amount field and string amounts', () => {
      const legacyWithAmount = { id: 'fb-2', name: 'Wifi', amount: '250.000' }
      const normalized = normalizeFixedBill(legacyWithAmount)
      expect(normalized?.amountVnd).toBe(250000)
    })

    it('cleans up invalid or corrupted payment history', () => {
      const corrupted = {
        id: 'fb-3',
        name: 'Điện',
        amountVnd: 500000,
        paymentHistory: {
          'invalid-month': { status: 'PAID' },
          '2026-11': { status: 'PAID', paidAt: '2026-11-05T10:00:00.000Z' },
          '2026-10': { status: 'UNKNOWN' },
        },
      }
      const normalized = normalizeFixedBill(corrupted)
      expect(normalized?.paymentHistory).toEqual({
        '2026-11': { status: 'PAID', paidAt: '2026-11-05T10:00:00.000Z' },
        '2026-10': { status: 'UNPAID', paidAt: null },
      })
    })

    it('normalizes an array of bills and filters out invalid items', () => {
      const input = [
        { id: 'fb-1', name: 'Bill 1', amountVnd: 100000 },
        null,
        'string',
        { id: 'fb-2', name: 'Bill 2', amountVnd: 200000 },
      ]
      const result = normalizeFixedBills(input)
      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('fb-1')
      expect(result[1].id).toBe('fb-2')
    })
  })

  describe('getBillPaymentStatus & getBillPaidAt', () => {
    const bill: FixedBillItem = {
      id: 'fb-1',
      name: 'Rent',
      amountVnd: 1500000,
      paymentHistory: {
        '2026-10': { status: 'PAID', paidAt: '2026-10-05T10:00:00.000Z' },
        '2026-11': { status: 'UNPAID', paidAt: null },
      },
    }

    it('returns correct status for month with record', () => {
      expect(getBillPaymentStatus(bill, '2026-10')).toBe('PAID')
      expect(getBillPaidAt(bill, '2026-10')).toBe('2026-10-05T10:00:00.000Z')

      expect(getBillPaymentStatus(bill, '2026-11')).toBe('UNPAID')
      expect(getBillPaidAt(bill, '2026-11')).toBeNull()
    })

    it('defaults to UNPAID for month without record (never copies previous month)', () => {
      expect(getBillPaymentStatus(bill, '2026-12')).toBe('UNPAID')
      expect(getBillPaidAt(bill, '2026-12')).toBeNull()
    })
  })

  describe('toggleBillPaymentStatus', () => {
    const bills: FixedBillItem[] = [
      {
        id: 'fb-1',
        name: 'Rent',
        amountVnd: 1500000,
        paymentHistory: {
          '2026-10': { status: 'PAID', paidAt: '2026-10-01T00:00:00.000Z' },
        },
      },
      {
        id: 'fb-2',
        name: 'Internet',
        amountVnd: 300000,
        paymentHistory: {},
      },
    ]

    it('toggles UNPAID to PAID for specified month with timestamp', () => {
      const fixedTime = '2026-11-20T12:00:00.000Z'
      const updated = toggleBillPaymentStatus(bills, 'fb-2', '2026-11', fixedTime)
      expect(getBillPaymentStatus(updated[1], '2026-11')).toBe('PAID')
      expect(getBillPaidAt(updated[1], '2026-11')).toBe(fixedTime)
      // Historical or other months unaffected
      expect(getBillPaymentStatus(updated[1], '2026-10')).toBe('UNPAID')
      // Other bills unaffected
      expect(updated[0]).toEqual(bills[0])
    })

    it('toggles PAID to UNPAID and sets paidAt to null', () => {
      const updated = toggleBillPaymentStatus(bills, 'fb-1', '2026-10')
      expect(getBillPaymentStatus(updated[0], '2026-10')).toBe('UNPAID')
      expect(getBillPaidAt(updated[0], '2026-10')).toBeNull()
    })
  })

  describe('calculateFixedBillsSummary', () => {
    it('handles empty bills list safely', () => {
      const summary = calculateFixedBillsSummary([], '2026-11', 10000000)
      expect(summary).toEqual({
        totalAmount: 0,
        paidAmount: 0,
        unpaidAmount: 0,
        paidCount: 0,
        totalCount: 0,
        completionPercentage: 0,
        calculatedPercent: 0,
      })
    })

    it('calculates totals, paid, unpaid, and percentages accurately', () => {
      const bills: FixedBillItem[] = [
        {
          id: 'fb-1',
          name: 'Rent',
          amountVnd: 1500000,
          paymentHistory: {
            '2026-11': { status: 'PAID', paidAt: '2026-11-05T00:00:00.000Z' },
          },
        },
        {
          id: 'fb-2',
          name: 'Internet',
          amountVnd: 1111111,
          paymentHistory: {
            '2026-11': { status: 'UNPAID', paidAt: null },
          },
        },
      ]

      const summary = calculateFixedBillsSummary(bills, '2026-11', 10000000)
      expect(summary.totalAmount).toBe(2611111)
      expect(summary.paidAmount).toBe(1500000)
      expect(summary.unpaidAmount).toBe(1111111)
      expect(summary.paidCount).toBe(1)
      expect(summary.totalCount).toBe(2)
      expect(summary.completionPercentage).toBe(50)
      // RATE preserved: 2,611,111 / 10,000,000 * 100 = 26%
      expect(summary.calculatedPercent).toBe(26)
    })

    it('handles zero monthly income safely without crashing', () => {
      const bills: FixedBillItem[] = [
        { id: 'fb-1', name: 'Rent', amountVnd: 1000000 },
      ]
      const summary = calculateFixedBillsSummary(bills, '2026-11', 0)
      expect(summary.calculatedPercent).toBe(0)
    })
  })

  describe('filterFixedBills', () => {
    const bills: FixedBillItem[] = [
      {
        id: 'fb-1',
        name: 'Paid bill',
        amountVnd: 500000,
        paymentHistory: { '2026-11': { status: 'PAID' } },
      },
      {
        id: 'fb-2',
        name: 'Unpaid bill',
        amountVnd: 300000,
        paymentHistory: { '2026-11': { status: 'UNPAID' } },
      },
    ]

    it('filters correctly by ALL, UNPAID, and PAID', () => {
      expect(filterFixedBills(bills, '2026-11', 'ALL')).toHaveLength(2)
      expect(filterFixedBills(bills, '2026-11', 'PAID')).toEqual([bills[0]])
      expect(filterFixedBills(bills, '2026-11', 'UNPAID')).toEqual([bills[1]])
    })
  })

  describe('shiftMonthId & formatBillingMonth', () => {
    it('shifts months correctly across year boundaries', () => {
      expect(shiftMonthId('2026-11', -1)).toBe('2026-10')
      expect(shiftMonthId('2026-11', 1)).toBe('2026-12')
      expect(shiftMonthId('2026-01', -1)).toBe('2025-12')
      expect(shiftMonthId('2026-12', 1)).toBe('2027-01')
      expect(shiftMonthId('2026-12', 12)).toBe('2027-12')
    })

    it('formats month for Vietnamese and English', () => {
      expect(formatBillingMonth('2026-11', 'vi')).toBe('Tháng 11, 2026')
      expect(formatBillingMonth('2026-11', 'en')).toBe('November 2026')
    })
  })

  describe('mergeBills', () => {
    it('merges bills while preserving payment histories from both', () => {
      const base: FixedBillItem[] = [
        {
          id: 'fb-1',
          name: 'Rent',
          amountVnd: 1500000,
          paymentHistory: { '2026-10': { status: 'PAID' } },
        },
      ]
      const incoming: FixedBillItem[] = [
        {
          id: 'fb-1',
          name: 'Rent',
          amountVnd: 1500000,
          paymentHistory: { '2026-11': { status: 'PAID' } },
        },
        {
          id: 'fb-2',
          name: 'Wifi',
          amountVnd: 250000,
          paymentHistory: { '2026-11': { status: 'UNPAID' } },
        },
      ]

      const merged = mergeBills(base, incoming)
      expect(merged).toHaveLength(2)
      expect(merged[0].paymentHistory).toEqual({
        '2026-10': { status: 'PAID' },
        '2026-11': { status: 'PAID' },
      })
      expect(merged[1].id).toBe('fb-2')
    })
  })
})
