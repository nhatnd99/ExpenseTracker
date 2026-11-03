/**
 * dateService.ts
 * Utility functions for date and month operations.
 * Uses plain Date objects and string manipulation — no external date library required.
 */
import type { DateString, MonthId } from '@/types/models'

/** Formats a Date object as "YYYY-MM-DD" using local time */
export function formatDate(date: Date): DateString {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Formats a Date object as "YYYY-MM" using local time */
export function formatMonth(date: Date): MonthId {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

/** Returns today's date as a "YYYY-MM-DD" string in local time */
export function getTodayString(): DateString {
  return formatDate(new Date())
}

/** Returns the current month as a "YYYY-MM" string in local time */
export function getCurrentMonthId(): MonthId {
  return formatMonth(new Date())
}

/** Parses a "YYYY-MM-DD" string to a local Date at midnight */
export function parseDateString(dateStr: DateString): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/** Shifts a "YYYY-MM-DD" date string by a given number of days (+1 or -1) */
export function shiftDate(dateStr: DateString, offsetDays: number): DateString {
  const d = parseDateString(dateStr)
  d.setDate(d.getDate() + offsetDays)
  return formatDate(d)
}

/** Returns the month portion of a "YYYY-MM-DD" date string */
export function dateToMonthId(dateStr: DateString): MonthId {
  return dateStr.slice(0, 7)
}

/** Formats an integer VND amount for display (e.g. 1,500,000 → "1.500.000 ₫") */
export function formatVnd(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount)
}

/** Formats a compact VND amount (e.g. 1,500,000 → "1.5M ₫") */
export function formatVndCompact(amount: number): string {
  if (amount >= 1_000_000) {
    const millions = amount / 1_000_000
    return `${millions % 1 === 0 ? millions : millions.toFixed(1)}M ₫`
  }
  if (amount >= 1_000) {
    const thousands = amount / 1_000
    return `${thousands % 1 === 0 ? thousands : thousands.toFixed(1)}K ₫`
  }
  return `${amount} ₫`
}

/**
 * Combines a "YYYY-MM-DD" date string with the system time (hours, minutes, seconds, milliseconds)
 * into an ISO timestamp string.
 * E.g. dateStr = "2026-11-02", current time is 21:38:15 -> "2026-11-02T21:38:15.123+07:00" in UTC ISO format.
 */
export function combineDateWithCurrentTime(dateStr: DateString, referenceDate: Date = new Date()): string {
  if (!dateStr) return new Date().toISOString()
  const [year, month, day] = dateStr.split('-').map(Number)
  if (!year || !month || !day) return new Date().toISOString()

  const combined = new Date(
    year,
    month - 1,
    day,
    referenceDate.getHours(),
    referenceDate.getMinutes(),
    referenceDate.getSeconds(),
    referenceDate.getMilliseconds(),
  )
  return combined.toISOString()
}

/**
 * Extracts and formats time from an ISO timestamp string or Date object as "HH:mm".
 * Handles invalid or missing timestamps gracefully by returning an empty string.
 */
export function formatTime(isoString?: string): string {
  if (!isoString) return ''
  try {
    const d = new Date(isoString)
    if (isNaN(d.getTime())) return ''
    const h = String(d.getHours()).padStart(2, '0')
    const m = String(d.getMinutes()).padStart(2, '0')
    return `${h}:${m}`
  } catch {
    return ''
  }
}

/**
 * Transaction sorting comparator (Descending):
 * 1. Primary: Sort descending by date (transactionDate or date portion).
 * 2. Secondary (if same date): Sort descending by createdAt (or transactionDate timestamp).
 * Purpose: Ensures newly backfilled records (log bù) or recently created records
 * for that day always appear at the very top of that day's transaction group.
 */
export function compareTransactionsDesc<
  T extends { date?: string; transactionDate?: string; createdAt?: string }
>(a: T, b: T): number {
  // 1. Group / order by date descending
  const dateA = a.date || a.transactionDate?.slice(0, 10) || ''
  const dateB = b.date || b.transactionDate?.slice(0, 10) || ''

  if (dateA !== dateB) {
    return dateB.localeCompare(dateA)
  }

  // 2. Same day: sort descending by createdAt (most recently logged/created item on top)
  const createdA = a.createdAt || a.transactionDate || ''
  const createdB = b.createdAt || b.transactionDate || ''

  if (createdA !== createdB) {
    return createdB.localeCompare(createdA)
  }

  // 3. Fallback to transactionDate timestamp if createdAt matches or is absent
  const txDateA = a.transactionDate || ''
  const txDateB = b.transactionDate || ''
  return txDateB.localeCompare(txDateA)
}


