import React from 'react'
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
  placeholder = 'Thêm ghi chú (vd: Cơm trưa, Siêu thị...)',
}) => {
  const { topNotes } = useSmartNotes(categoryId)

  return (
    <div className="space-y-2">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:bg-[var(--color-bg-surface)] focus:border-[var(--color-border-focused)] focus:outline-none transition-colors"
      />

      {/* 5 Smart Suggestion Chips */}
      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
        <span className="flex items-center gap-1 text-[11px] font-semibold text-[var(--color-text-muted)] mr-0.5">
          <Sparkles className="h-3 w-3 text-[var(--color-warning)]" />
          Gợi ý:
        </span>
        {topNotes.map((note) => {
          const isSelected = value === note
          return (
            <button
              key={note}
              type="button"
              onClick={() => onChange(note)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-all active:scale-95 cursor-pointer ${
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
    </div>
  )
}

