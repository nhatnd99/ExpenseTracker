import type {
  FixedBillItem,
  BillPaymentRecord,
  BillPaymentStatus,
  FixedBillsSummary,
  FixedBillsFilter,
} from '../types'

const MONTH_NAMES_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

/**
 * Normalizes an unknown item into a valid FixedBillItem object.
 * Returns null if the input is fundamentally invalid.
 */
export function normalizeFixedBill(raw: unknown): FixedBillItem | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>

  const id =
    typeof obj.id === 'string' && obj.id.trim()
      ? obj.id.trim()
      : `fb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

  const name =
    typeof obj.name === 'string' && obj.name.trim()
      ? obj.name.trim()
      : 'Khoản chi'

  let amountVnd = 0
  if (typeof obj.amountVnd === 'number' && Number.isFinite(obj.amountVnd)) {
    amountVnd = Math.max(0, Math.round(obj.amountVnd))
  } else if (typeof obj.amount === 'number' && Number.isFinite(obj.amount)) {
    amountVnd = Math.max(0, Math.round(obj.amount))
  } else if (typeof obj.amountVnd === 'string') {
    const parsed = parseInt((obj.amountVnd as string).replace(/\D/g, ''), 10)
    amountVnd = isNaN(parsed) ? 0 : Math.max(0, parsed)
  } else if (typeof obj.amount === 'string') {
    const parsed = parseInt((obj.amount as string).replace(/\D/g, ''), 10)
    amountVnd = isNaN(parsed) ? 0 : Math.max(0, parsed)
  }

  // Normalize paymentHistory: map of YYYY-MM -> BillPaymentRecord
  const paymentHistory: Record<string, BillPaymentRecord> = {}
  if (
    obj.paymentHistory &&
    typeof obj.paymentHistory === 'object' &&
    !Array.isArray(obj.paymentHistory)
  ) {
    const hist = obj.paymentHistory as Record<string, unknown>
    for (const [monthKey, rec] of Object.entries(hist)) {
      if (/^\d{4}-\d{2}$/.test(monthKey) && rec && typeof rec === 'object') {
        const recordObj = rec as Record<string, unknown>
        const status: BillPaymentStatus =
          recordObj.status === 'PAID' ? 'PAID' : 'UNPAID'
        const paidAt =
          typeof recordObj.paidAt === 'string'
            ? recordObj.paidAt
            : status === 'PAID'
              ? new Date().toISOString()
              : null
        paymentHistory[monthKey] = { status, paidAt }
      }
    }
  }

  return {
    id,
    name,
    amountVnd,
    paymentHistory,
  }
}

/**
 * Normalizes an array of unknown records into a list of valid FixedBillItem objects.
 */
export function normalizeFixedBills(raw: unknown): FixedBillItem[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => normalizeFixedBill(item))
    .filter((item): item is FixedBillItem => item !== null)
}

/**
 * Gets payment status of a bill for a specific month (defaults to 'UNPAID').
 */
export function getBillPaymentStatus(
  bill: FixedBillItem,
  monthId: string,
): BillPaymentStatus {
  return bill.paymentHistory?.[monthId]?.status === 'PAID' ? 'PAID' : 'UNPAID'
}

/**
 * Gets payment timestamp of a bill for a specific month.
 */
export function getBillPaidAt(
  bill: FixedBillItem,
  monthId: string,
): string | null {
  return bill.paymentHistory?.[monthId]?.paidAt ?? null
}

/**
 * Toggles a bill's payment status for a specific month.
 * Does not mutate historical data of other months or other bills.
 */
export function toggleBillPaymentStatus(
  bills: FixedBillItem[],
  billId: string,
  monthId: string,
  timestamp?: string,
): FixedBillItem[] {
  return bills.map((bill) => {
    if (bill.id !== billId) return bill
    const currentStatus = getBillPaymentStatus(bill, monthId)
    const nextStatus: BillPaymentStatus =
      currentStatus === 'PAID' ? 'UNPAID' : 'PAID'
    const paidAt =
      nextStatus === 'PAID' ? timestamp || new Date().toISOString() : null

    const updatedHistory: Record<string, BillPaymentRecord> = {
      ...(bill.paymentHistory || {}),
      [monthId]: {
        status: nextStatus,
        paidAt,
      },
    }

    return {
      ...bill,
      paymentHistory: updatedHistory,
    }
  })
}

/**
 * Dynamically calculates summary and metrics from fixed bills for the given month.
 * Important: Preserves the existing RATE calculation (ratio against monthly income).
 */
export function calculateFixedBillsSummary(
  bills: FixedBillItem[],
  monthId: string,
  monthlyIncome: number = 0,
): FixedBillsSummary {
  const totalCount = bills.length
  let totalAmount = 0
  let paidAmount = 0
  let paidCount = 0

  for (const bill of bills) {
    const amt = Number(bill.amountVnd) || 0
    totalAmount += amt
    const isPaid = getBillPaymentStatus(bill, monthId) === 'PAID'
    if (isPaid) {
      paidCount += 1
      paidAmount += amt
    }
  }

  const unpaidAmount = Math.max(0, totalAmount - paidAmount)
  const completionPercentage =
    totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 0
  const calculatedPercent =
    monthlyIncome > 0 ? Math.round((totalAmount / monthlyIncome) * 100) : 0

  return {
    totalAmount,
    paidAmount,
    unpaidAmount,
    paidCount,
    totalCount,
    completionPercentage,
    calculatedPercent,
  }
}

/**
 * Filters the displayed list based on the chosen filter tab.
 * Filtering only alters the returned list; summary must be computed over all bills.
 */
export function filterFixedBills(
  bills: FixedBillItem[],
  monthId: string,
  filter: FixedBillsFilter,
): FixedBillItem[] {
  if (filter === 'PAID') {
    return bills.filter((b) => getBillPaymentStatus(b, monthId) === 'PAID')
  }
  if (filter === 'UNPAID') {
    return bills.filter((b) => getBillPaymentStatus(b, monthId) === 'UNPAID')
  }
  return bills
}

/**
 * Shifts a YYYY-MM month identifier by delta months (+1, -1, etc.).
 * Pure integer arithmetic without timezone or DST drift.
 */
export function shiftMonthId(monthId: string, delta: number): string {
  const [yearStr, monthStr] = monthId.split('-')
  let year = parseInt(yearStr, 10)
  let month = parseInt(monthStr, 10) + delta

  if (isNaN(year) || isNaN(month)) {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }

  while (month < 1) {
    month += 12
    year -= 1
  }
  while (month > 12) {
    month -= 12
    year += 1
  }

  return `${year}-${String(month).padStart(2, '0')}`
}

/**
 * Formats a YYYY-MM month string for human display (e.g. "Tháng 11, 2026" or "November 2026").
 */
export function formatBillingMonth(monthId: string, lang: string = 'vi'): string {
  const [yearStr, monthStr] = monthId.split('-')
  const year = parseInt(yearStr, 10)
  const month = parseInt(monthStr, 10)
  if (!year || !month || month < 1 || month > 12) return monthId

  if (lang.startsWith('vi')) {
    return `Tháng ${month}, ${year}`
  }
  return `${MONTH_NAMES_EN[month - 1]} ${year}`
}

/**
 * Merges two lists of fixed bills while safely combining their paymentHistory.
 */
export function mergeBills(
  baseBills: FixedBillItem[],
  incomingBills: FixedBillItem[],
): FixedBillItem[] {
  const map = new Map<string, FixedBillItem>()

  for (const b of baseBills) {
    map.set(b.id, {
      ...b,
      paymentHistory: { ...(b.paymentHistory || {}) },
    })
  }

  for (const b of incomingBills) {
    if (map.has(b.id)) {
      const existing = map.get(b.id)!
      map.set(b.id, {
        ...b,
        paymentHistory: {
          ...(existing.paymentHistory || {}),
          ...(b.paymentHistory || {}),
        },
      })
    } else {
      map.set(b.id, {
        ...b,
        paymentHistory: { ...(b.paymentHistory || {}) },
      })
    }
  }

  return Array.from(map.values())
}
