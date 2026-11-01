import React from 'react'
import { useTranslation } from 'react-i18next'
import { Delete, Check, RotateCcw } from 'lucide-react'

interface CustomNumpadProps {
  onKeyPress: (key: string) => void
  onDelete: () => void
  onClear: () => void
  onSubmit: () => void
  isSubmitDisabled?: boolean
  submitLabel?: string
  variant?: 'expense' | 'income'
}

export const CustomNumpad: React.FC<CustomNumpadProps> = ({
  onKeyPress,
  onDelete,
  onClear,
  onSubmit,
  isSubmitDisabled = false,
  submitLabel,
  variant = 'expense',
}) => {
  const { t } = useTranslation()
  const effectiveSubmitLabel = submitLabel || t('common.confirm', 'Xác nhận')
  const triggerHaptic = () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(10)
      } catch {
        // Ignore if vibrate is restricted
      }
    }
  }

  const handlePress = (val: string) => {
    triggerHaptic()
    onKeyPress(val)
  }

  const handleDelete = () => {
    triggerHaptic()
    onDelete()
  }

  const handleClear = () => {
    triggerHaptic()
    onClear()
  }

  const keyBaseClass =
    'flex h-12 items-center justify-center rounded-xl sm:rounded-2xl text-xl font-bold transition-transform active:scale-95 select-none cursor-pointer'
  const numKeyClass = `${keyBaseClass} bg-gray-800 text-white border border-gray-700/80 shadow-2xs hover:bg-gray-700 active:bg-gray-600`
  const fnKeyClass = `${keyBaseClass} bg-gray-800/70 text-gray-300 border border-gray-700/60 shadow-2xs hover:bg-gray-700 active:bg-gray-650`

  return (
    <div className="grid grid-cols-4 gap-1.5 sm:gap-2 w-full select-none">
      {/* Row 1 */}
      <button type="button" onClick={() => handlePress('1')} className={numKeyClass}>1</button>
      <button type="button" onClick={() => handlePress('2')} className={numKeyClass}>2</button>
      <button type="button" onClick={() => handlePress('3')} className={numKeyClass}>3</button>
      <button
        type="button"
        onClick={handleDelete}
        aria-label="Delete"
        className={`${fnKeyClass} text-rose-400 hover:text-rose-300`}
      >
        <Delete className="h-5 w-5" />
      </button>

      {/* Row 2 */}
      <button type="button" onClick={() => handlePress('4')} className={numKeyClass}>4</button>
      <button type="button" onClick={() => handlePress('5')} className={numKeyClass}>5</button>
      <button type="button" onClick={() => handlePress('6')} className={numKeyClass}>6</button>
      <button type="button" onClick={() => handlePress('00')} className={fnKeyClass}>00</button>

      {/* Row 3 */}
      <button type="button" onClick={() => handlePress('7')} className={numKeyClass}>7</button>
      <button type="button" onClick={() => handlePress('8')} className={numKeyClass}>8</button>
      <button type="button" onClick={() => handlePress('9')} className={numKeyClass}>9</button>
      <button type="button" onClick={() => handlePress('000')} className={fnKeyClass}>000</button>

      {/* Row 4 */}
      <button
        type="button"
        onClick={handleClear}
        aria-label="Clear all"
        title="Clear"
        className={`${fnKeyClass} text-gray-400 hover:text-gray-200`}
      >
        <RotateCcw className="h-4 w-4" />
      </button>
      <button type="button" onClick={() => handlePress('0')} className={numKeyClass}>0</button>
      <button
        type="button"
        onClick={() => {
          triggerHaptic()
          onSubmit()
        }}
        disabled={isSubmitDisabled}
        className={`${keyBaseClass} col-span-2 ${
          variant === 'income'
            ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
            : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]'
        } text-white shadow-md disabled:bg-gray-800 disabled:text-gray-500 disabled:border-gray-700/40 disabled:cursor-not-allowed disabled:scale-100`}
      >
        <span className="text-sm font-bold mr-1.5">{effectiveSubmitLabel}</span>
        <Check className="h-4 w-4 stroke-[2.5]" />
      </button>
    </div>
  )
}

