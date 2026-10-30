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

