/**
 * currency.ts
 * Formatting and parsing helpers for monetary values.
 */

/**
 * Converts a raw digits string (e.g. "50000") into a formatted string with thousand separators (e.g. "50,000").
 */
export function formatCurrencyDisplay(rawNumberString: string): string {
  if (!rawNumberString || rawNumberString === '0') return '0'

  const cleanNumber = rawNumberString.replace(/\D/g, '')
  if (!cleanNumber) return '0'

  return new Intl.NumberFormat('en-US').format(Number(cleanNumber))
}

/**
 * Converts a raw or formatted string into integer VND amount.
 */
export function parseCurrencyToNumber(rawNumberString: string): number {
  const cleanNumber = String(rawNumberString).replace(/\D/g, '')
  return cleanNumber ? parseInt(cleanNumber, 10) : 0
}

