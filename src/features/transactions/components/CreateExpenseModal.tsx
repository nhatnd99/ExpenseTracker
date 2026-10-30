import React, { useState } from 'react'
import { X, Calendar as CalendarIcon } from 'lucide-react'
import type { BudgetCategory } from '@/types/models'
import { getTodayString } from '@/services/dateService'
import { useNumpadInput } from '../hooks/useNumpadInput'
import { CustomNumpad } from './CustomNumpad'
import { CategorySelector } from './CategorySelector'
import { SmartNoteInput } from './SmartNoteInput'
import { CategoryManagerModal } from './CategoryManagerModal'

interface CreateExpenseModalProps {
  isOpen: boolean
  onClose: () => void
  categories: BudgetCategory[]
  onCategoriesChanged: () => void
  onSubmit: (data: {
    amountVnd: number
    categoryId: string
    date: string
    description?: string
  }) => Promise<void>
}

export const CreateExpenseModal: React.FC<CreateExpenseModalProps> = ({
  isOpen,
  onClose,
  categories,
  onCategoriesChanged,
  onSubmit,
}) => {
  const {
    formattedAmount,
    numericAmount,
    handleKeyPress,
    handleDelete,
    handleClear,
    setRawAmount,
  } = useNumpadInput('')

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')
  const [date, setDate] = useState<string>(getTodayString())
  const [note, setNote] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Determine current active category ID safely without redundant setState effect
  const activeCategoryId =
    selectedCategoryId && categories.some((c) => c.id === selectedCategoryId)
      ? selectedCategoryId
      : categories[0]?.id ?? ''

  if (!isOpen) return null

  const handleQuickDate = (daysAgo: number) => {
    const d = new Date()
    d.setDate(d.getDate() - daysAgo)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    setDate(`${y}-${m}-${day}`)
  }

  const todayStr = getTodayString()

  const handleSubmit = async () => {
    if (numericAmount <= 0) {
      setErrorMessage('Vui lòng nhập số tiền chi tiêu lớn hơn 0.')
      return
    }

    if (!activeCategoryId) {
      setErrorMessage('Vui lòng chọn một danh mục.')
      return
    }

    setSubmitting(true)
    setErrorMessage(null)

    try {
      await onSubmit({
        amountVnd: numericAmount,
        categoryId: activeCategoryId,
        date,
        description: note.trim() || undefined,
      })

      // Reset & Close
      setRawAmount('')
      setNote('')
      setDate(getTodayString())
      onClose()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Lỗi khi lưu khoản chi.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 flex flex-col justify-end bg-black/60 backdrop-blur-xs">
        <div className="w-full max-w-lg mx-auto rounded-t-3xl border-t border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-2xl flex flex-col max-h-[92vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b border-[var(--color-border)]">
            <h2 className="text-sm font-bold text-[var(--color-text-primary)]">
              Ghi Khoản Chi Tiêu Mới
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)] cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body Scrollable Area */}
          <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4">
            {/* Amount Hero Display */}
            <div className="text-center py-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                Số tiền chi
              </span>
              <div className="mt-1 flex items-baseline justify-center gap-1">
                <span className="text-xl font-bold text-[var(--color-expense)]">-</span>
                <span className="text-4xl sm:text-5xl font-extrabold amount-display text-[var(--color-expense)] tracking-tight">
                  {formattedAmount}
                </span>
                <span className="text-2xl font-bold text-[var(--color-expense)]">₫</span>
              </div>
            </div>

            {/* Date Selection */}
            <div className="flex items-center justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-2 text-xs">
              <div className="flex items-center gap-1.5 px-2">
                <CalendarIcon className="h-4 w-4 text-[var(--color-text-muted)]" />
                <span className="font-semibold text-[var(--color-text-secondary)]">Ngày:</span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleQuickDate(0)}
                  className={`rounded-xl px-2.5 py-1 font-semibold transition-all cursor-pointer ${
                    date === todayStr
                      ? 'bg-[var(--color-primary)] text-white shadow-2xs'
                      : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]'
                  }`}
                >
                  Hôm nay
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDate(1)}
                  className={`rounded-xl px-2.5 py-1 font-semibold transition-all cursor-pointer ${
                    date !== todayStr
                      ? 'bg-[var(--color-primary)] text-white shadow-2xs'
                      : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]'
                  }`}
                >
                  Hôm qua
                </button>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-2 py-1 text-xs font-semibold text-[var(--color-text-primary)] focus:outline-none"
                />
              </div>
            </div>

            {/* Category Selector */}
            <CategorySelector
              categories={categories}
              selectedCategoryId={activeCategoryId}
              onSelectCategory={setSelectedCategoryId}
              onOpenManager={() => setIsCategoryManagerOpen(true)}
            />

            {/* Smart Note Input */}
            <SmartNoteInput
              value={note}
              onChange={setNote}
              categoryId={activeCategoryId}
            />

            {errorMessage && (
              <p className="rounded-xl border border-[var(--color-expense-border)] bg-[var(--color-expense-soft)] p-2.5 text-xs text-[var(--color-expense)] font-medium text-center">
                ⚠️ {errorMessage}
              </p>
            )}
          </div>

          {/* Custom Numpad Fixed At Bottom */}
          <CustomNumpad
            onKeyPress={handleKeyPress}
            onDelete={handleDelete}
            onClear={handleClear}
            onSubmit={handleSubmit}
            isSubmitDisabled={submitting || numericAmount <= 0}
            submitLabel={submitting ? 'Đang lưu…' : 'Lưu Chi Tiêu'}
          />
        </div>
      </div>

      {/* Category Manager Modal */}
      <CategoryManagerModal
        isOpen={isCategoryManagerOpen}
        onClose={() => setIsCategoryManagerOpen(false)}
        categories={categories}
        onCategoriesChanged={onCategoriesChanged}
      />
    </>
  )
}
