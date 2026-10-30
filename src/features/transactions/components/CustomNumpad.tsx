import React from 'react'
import { Delete, Check, RotateCcw } from 'lucide-react'

interface CustomNumpadProps {
  onKeyPress: (key: string) => void
  onDelete: () => void
  onClear: () => void
  onSubmit: () => void
  isSubmitDisabled?: boolean
  submitLabel?: string
}

export const CustomNumpad: React.FC<CustomNumpadProps> = ({
  onKeyPress,
  onDelete,
  onClear,
  onSubmit,
  isSubmitDisabled = false,
  submitLabel = 'Xác nhận',
}) => {
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
    'flex h-13 items-center justify-center rounded-2xl text-xl font-bold transition-transform active:scale-95 select-none cursor-pointer'
  const numKeyClass = `${keyBaseClass} bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] border border-[var(--color-border)] shadow-2xs hover:bg-[var(--color-bg-subtle)]`
  const fnKeyClass = `${keyBaseClass} bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] border border-[var(--color-border)] shadow-2xs hover:bg-[var(--color-border)]`

  return (
    <div className="grid grid-cols-4 gap-2 px-3 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] bg-[var(--color-bg-surface)] border-t border-[var(--color-border)] rounded-t-3xl shadow-lg">
      {/* Row 1 */}
      <button type="button" onClick={() => handlePress('1')} className={numKeyClass}>1</button>
      <button type="button" onClick={() => handlePress('2')} className={numKeyClass}>2</button>
      <button type="button" onClick={() => handlePress('3')} className={numKeyClass}>3</button>
      <button
        type="button"
        onClick={handleDelete}
        aria-label="Delete"
        className={`${fnKeyClass} text-[var(--color-expense)]`}
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
        className={`${fnKeyClass} text-[var(--color-text-muted)]`}
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
        className={`${keyBaseClass} col-span-2 bg-[var(--color-primary)] text-white shadow-md hover:bg-[var(--color-primary-hover)] disabled:bg-[var(--color-bg-subtle)] disabled:text-[var(--color-text-muted)] disabled:cursor-not-allowed disabled:scale-100`}
      >
        <span className="text-sm font-bold mr-1.5">{submitLabel}</span>
        <Check className="h-4 w-4 stroke-[2.5]" />
      </button>
    </div>
  )
}

