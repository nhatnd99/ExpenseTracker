import React from 'react'
import { useTranslation } from 'react-i18next'
import { Sparkles } from 'lucide-react'
import { useSmartNotes } from '../hooks/useSmartNotes'

interface SmartNoteInputProps {
  value: string
  onChange: (val: string) => void
  categoryId?: string
  placeholder?: string
}

export const SmartNoteInput: React.FC<SmartNoteInputProps> = ({
  value,
  onChange,
  categoryId,
  placeholder,
}) => {
  const { t } = useTranslation()
  const { topNotes } = useSmartNotes(categoryId)
  const resolvedPlaceholder = placeholder || t('transactions.notePlaceholder', 'Ghi chú')

  return (
    <div className="space-y-1.5">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={resolvedPlaceholder}
        className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3.5 py-2.5 text-xs text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:bg-[var(--color-bg-surface)] focus:border-[var(--color-border-focused)] focus:outline-none transition-colors"
      />

      {/* Smart Suggestion Chips */}
      {topNotes.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <Sparkles className="h-3 w-3 text-[var(--color-warning)] shrink-0" />
          {topNotes.map((note) => {
            const isSelected = value === note
            return (
              <button
                key={note}
                type="button"
                onClick={() => onChange(note)}
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-all active:scale-95 cursor-pointer ${
                  isSelected
                    ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)] border border-[var(--color-primary)] font-bold'
                    : 'bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-border)]'
                }`}
              >
                {note}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

