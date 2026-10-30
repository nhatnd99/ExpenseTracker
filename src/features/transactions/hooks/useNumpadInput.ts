import { useState, useCallback } from 'react'
import { formatCurrencyDisplay, parseCurrencyToNumber } from '@/utils/currency'

export function useNumpadInput(initialRaw: string = '') {
  const [rawAmount, setRawAmount] = useState<string>(initialRaw)

  const handleKeyPress = useCallback((key: string) => {
    setRawAmount((prev) => {
      // Limit to 11 digits (~99 billion VND max)
      if (prev.length >= 11) return prev

      if (key === '00') {
        if (!prev || prev === '0') return '0'
        return prev + '00'
      }

      if (key === '000') {
        if (!prev || prev === '0') return '0'
        return prev + '000'
      }

      if (key === '.') {
        // VND typically has no decimal, but we prevent multiple dots if user types
        if (prev.includes('.')) return prev
        return prev ? prev + '.' : '0.'
      }

      if (prev === '0' || !prev) {
        return key
      }

      return prev + key
    });
  }, [])

  const handleDelete = useCallback(() => {
    setRawAmount((prev) => (prev.length > 1 ? prev.slice(0, -1) : ''))
  }, [])

  const handleClear = useCallback(() => {
    setRawAmount('')
  }, [])

  return {
    rawAmount,
    formattedAmount: formatCurrencyDisplay(rawAmount),
    numericAmount: parseCurrencyToNumber(rawAmount),
    handleKeyPress,
    handleDelete,
    handleClear,
    setRawAmount,
  }
}

