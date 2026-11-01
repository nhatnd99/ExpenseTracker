import React from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Minus } from 'lucide-react'

export interface PercentageInputProps {
  value: number
  onChange?: (newValue: number) => void
  disabled?: boolean
  readOnly?: boolean
  min?: number
  max?: number
  className?: string
  ariaLabel?: string
}

export const PercentageInput: React.FC<PercentageInputProps> = ({
  value,
  onChange,
  disabled = false,
  readOnly = false,
  min = 0,
  max = 100,
  className = '',
  ariaLabel,
}) => {
  const { t } = useTranslation()
  const effectiveAriaLabel = ariaLabel || t('settings.percentageInputLabel', 'Tỷ lệ phần trăm')
  const handleDecrement = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (disabled || readOnly || !onChange) return
    const nextVal = Math.max(min, value - 1)
    onChange(nextVal)
  }

  const handleIncrement = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (disabled || readOnly || !onChange) return
    const nextVal = Math.min(max, value + 1)
    onChange(nextVal)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled || readOnly || !onChange) return
    const raw = e.target.value.replace(/\D/g, '')
    if (raw === '') {
      onChange(0)
      return
    }
    const parsed = parseInt(raw, 10)
    const clamped = Math.min(max, Math.max(min, isNaN(parsed) ? 0 : parsed))
    onChange(clamped)
  }

  if (readOnly) {
    return (
      <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[var(--color-primary-soft)] border border-[var(--color-primary)]/20 ${className}`}>
        <span className="text-xs font-extrabold text-[var(--color-primary)] amount-display">
          {value}%
        </span>
      </div>
    )
  }

  return (
    <div
      className={`inline-flex items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-0.5 shadow-2xs transition-all focus-within:border-[var(--color-border-focused)] focus-within:ring-1 focus-within:ring-[var(--color-border-focused)] ${
        disabled ? 'opacity-40 cursor-not-allowed' : ''
      } ${className}`}
    >
      {/* Decrement Button (-) */}
      <button
        type="button"
        disabled={disabled || value <= min}
        onClick={handleDecrement}
        aria-label={t('settings.decreasePercent', 'Giảm 1%')}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)] active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer transition-all shrink-0"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>

      {/* Numeric Input without native spinners */}
      <div className="relative flex items-center justify-center px-1">
        <input
          type="number"
          min={min}
          max={max}
          value={value === 0 ? '' : value}
          onChange={handleInputChange}
          placeholder="0"
          disabled={disabled}
          aria-label={effectiveAriaLabel}
          className="w-8 text-center text-xs font-bold text-[var(--color-text-primary)] bg-transparent border-none p-0 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <span className="text-xs font-bold text-[var(--color-text-muted)] select-none ml-0.5">
          %
        </span>
      </div>

      {/* Increment Button (+) */}
      <button
        type="button"
        disabled={disabled || value >= max}
        onClick={handleIncrement}
        aria-label={t('settings.increasePercent', 'Tăng 1%')}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)] active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer transition-all shrink-0"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

