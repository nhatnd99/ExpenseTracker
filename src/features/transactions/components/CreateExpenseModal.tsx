import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Calendar as CalendarIcon, Trash2 } from 'lucide-react'
import type { BudgetCategory } from '@/types/models'
import type { EnrichedTransaction } from '../transactionService'
import { getTodayString } from '@/services/dateService'
import { useNumpadInput } from '../hooks/useNumpadInput'
import { CustomNumpad } from './CustomNumpad'
import { CategorySelector } from './CategorySelector'
import { SmartNoteInput } from './SmartNoteInput'
import { CategoryManagerModal } from './CategoryManagerModal'

export interface CreateExpenseModalProps {
  isOpen: boolean
  onClose: () => void
  categories: BudgetCategory[]
  onCategoriesChanged: () => void
  initialDate?: string
  initialTransaction?: EnrichedTransaction | null
  onSubmit: (data: {
    id?: string
    amountVnd: number
    categoryId: string
    date: string
    description?: string
    isExcludedFromDaily?: boolean
  }) => Promise<void>
  onDelete?: (id: string) => Promise<void>
}

export const CreateExpenseModal: React.FC<CreateExpenseModalProps> = ({
  isOpen,
  onClose,
  categories,
  onCategoriesChanged,
  initialDate,
  initialTransaction,
  onSubmit,
  onDelete,
}) => {
  const { t } = useTranslation()

  const {
    formattedAmount,
    numericAmount,
    handleKeyPress,
    handleDelete,
    handleClear,
  } = useNumpadInput(initialTransaction ? String(initialTransaction.amountVnd) : '')

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    initialTransaction?.categoryId || (categories[0]?.id ?? '')
  )
  const [date, setDate] = useState<string>(
    initialTransaction?.date || initialDate || getTodayString()
  )
  const [note, setNote] = useState<string>(initialTransaction?.description || '')

  // Ensure active category ID is valid
  const activeCategoryId =
    selectedCategoryId && categories.some((c) => c.id === selectedCategoryId)
      ? selectedCategoryId
      : categories[0]?.id ?? ''

  // State for excluding from daily spending limit
  const [isExcludedFromDaily, setIsExcludedFromDaily] = useState<boolean>(() => {
    if (initialTransaction) {
      return Boolean(initialTransaction.isExcludedFromDaily)
    }
    const cat = categories.find((c) => c.id === activeCategoryId)
    return Boolean(cat?.isFixedBill)
  })

  const prevCategoryIdRef = useRef(activeCategoryId)

  // Smart Auto-Toggle: when user selects a category, automatically sync toggle with category.isFixedBill
  useEffect(() => {
    if (prevCategoryIdRef.current !== activeCategoryId) {
      prevCategoryIdRef.current = activeCategoryId
      const cat = categories.find((c) => c.id === activeCategoryId)
      setIsExcludedFromDaily(Boolean(cat?.isFixedBill))
    }
  }, [activeCategoryId, categories])

  const [submitting, setSubmitting] = useState(false)
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

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
      setErrorMessage(t('transactions.amountRequired', 'Vui lòng nhập số tiền chi tiêu lớn hơn 0.'))
      return
    }

    if (!activeCategoryId) {
      setErrorMessage(t('transactions.categoryRequired', 'Vui lòng chọn một danh mục.'))
      return
    }

    setSubmitting(true)
    setErrorMessage(null)

    try {
      await onSubmit({
        id: initialTransaction?.id,
        amountVnd: numericAmount,
        categoryId: activeCategoryId,
        date,
        description: note.trim() || undefined,
        isExcludedFromDaily,
      })

      onClose()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : t('common.error', 'Lỗi khi lưu khoản chi.'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteRecord = async () => {
    if (!initialTransaction || !onDelete) return
    if (!confirm(t('transactions.confirmDelete', 'Bạn có chắc chắn muốn xóa khoản chi này?'))) return

    setSubmitting(true)
    try {
      await onDelete(initialTransaction.id)
      onClose()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : t('common.error', 'Lỗi khi xóa.'))
    } finally {
      setSubmitting(false)
    }
  }

  const isEditMode = Boolean(initialTransaction)

  return (
    <>
      <div className="fixed inset-0 z-40 flex flex-col justify-end bg-black/60 backdrop-blur-xs overflow-hidden">
        <div className="w-full max-w-lg mx-auto rounded-t-3xl border-t border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-2xl flex flex-col max-h-[92dvh] h-auto overflow-hidden">
          {/* Header - Fixed (shrink-0) */}
          <div className="shrink-0 flex items-center justify-between px-5 pt-4 pb-2 border-b border-[var(--color-border)]">
            <h2 className="text-sm font-bold text-[var(--color-text-primary)]">
              {isEditMode
                ? t('transactions.editExpenseTitle', 'Chỉnh Sửa Khoản Chi')
                : t('transactions.recordExpenseTitle', 'Thêm Khoản Chi Tiêu')}
            </h2>

            <div className="flex items-center gap-1">
              {isEditMode && onDelete && (
                <button
                  type="button"
                  onClick={() => void handleDeleteRecord()}
                  disabled={submitting}
                  className="flex h-8 w-8 items-center justify-center rounded-xl text-[var(--color-expense)] hover:bg-[var(--color-expense-soft)] transition-colors cursor-pointer disabled:opacity-40"
                  aria-label={t('common.delete', 'Xóa')}
                  title={t('transactions.deleteExpense', 'Xóa khoản chi')}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)] cursor-pointer"
                aria-label={t('common.cancel', 'Đóng')}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Body Scrollable Area - Vertical Scroll Only, No Horizontal Scroll */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden w-full max-w-full px-5 py-3 space-y-4 overscroll-y-contain">
            {/* Amount Hero Display */}
            <div className="text-center py-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                {t('transactions.amountSpent', 'Số tiền chi')}
              </span>
              <div className="mt-1 flex items-baseline justify-center gap-1">
                <span className="text-xl font-bold text-[var(--color-expense)]">-</span>
                <span className="text-4xl sm:text-5xl font-extrabold amount-display text-[var(--color-expense)] tracking-tight">
                  {formattedAmount}
                </span>
                <span className="text-2xl font-bold text-[var(--color-expense)]">₫</span>
              </div>
            </div>

            {/* Date Selection - Fully responsive, zero horizontal overflow */}
            <div className="space-y-1.5 w-full min-w-0 max-w-full">
              <div className="flex items-center justify-between text-xs px-1">
                <span className="font-bold uppercase tracking-wider text-[var(--color-text-secondary)] flex items-center gap-1.5">
                  <CalendarIcon className="h-3.5 w-3.5 text-[var(--color-text-muted)] shrink-0" />
                  {t('transactions.dateLabel', 'Ngày')}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleQuickDate(0)}
                    className={`rounded-xl px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                      date === todayStr
                        ? 'bg-[var(--color-primary)] text-white shadow-2xs'
                        : 'bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]'
                    }`}
                  >
                    {t('transactions.today', 'Hôm nay')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDate(1)}
                    className={`rounded-xl px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                      date !== todayStr
                        ? 'bg-[var(--color-primary)] text-white shadow-2xs'
                        : 'bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]'
                    }`}
                  >
                    {t('transactions.yesterday', 'Hôm qua')}
                  </button>
                </div>
              </div>

              {/* Full-width responsive Date Input */}
              <div className="w-full min-w-0 max-w-full">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full min-w-0 max-w-full box-border rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3.5 py-2.5 text-base sm:text-sm font-semibold text-[var(--color-text-primary)] focus:bg-[var(--color-bg-surface)] focus:border-[var(--color-border-focused)] focus:outline-none transition-colors"
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

            {/* Toggle Switch: Exclude from Daily Limit (Smart Categories) */}
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-3 flex items-center justify-between gap-3 transition-colors box-border">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-[var(--color-text-primary)]">
                    {t('transactions.excludeFromDailyLabel', 'Không trừ vào Hạn mức ngày')}
                  </span>
                  {isExcludedFromDaily && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[var(--color-income-soft)] text-[var(--color-income)] border border-[var(--color-income-border)] shrink-0">
                      {t('transactions.excludedBadge', 'Đã bảo vệ')}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5 leading-snug">
                  {t(
                    'transactions.excludeFromDailyHelp',
                    'Dành cho hóa đơn lớn (tiền nhà, điện nước...). Không làm âm số tiền được tiêu hôm nay.',
                  )}
                </p>
              </div>

              {/* Toggle Switch Button (Tailwind CSS) */}
              <button
                type="button"
                role="switch"
                aria-checked={isExcludedFromDaily}
                onClick={() => setIsExcludedFromDaily((prev) => !prev)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 ${
                  isExcludedFromDaily ? 'bg-[var(--color-primary)]' : 'bg-zinc-300 dark:bg-zinc-700'
                }`}
              >
                <span className="sr-only">
                  {t('transactions.excludeFromDailyLabel', 'Không trừ vào Hạn mức ngày')}
                </span>
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    isExcludedFromDaily ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {errorMessage && (
              <p className="rounded-xl border border-[var(--color-expense-border)] bg-[var(--color-expense-soft)] p-2.5 text-xs text-[var(--color-expense)] font-medium text-center">
                ⚠️ {errorMessage}
              </p>
            )}
          </div>

          {/* Custom Numpad Fixed At Bottom (shrink-0) with Safe-Area Padding */}
          <div className="shrink-0 w-full">
            <CustomNumpad
              onKeyPress={handleKeyPress}
              onDelete={handleDelete}
              onClear={handleClear}
              onSubmit={() => void handleSubmit()}
              isSubmitDisabled={submitting || numericAmount <= 0}
              submitLabel={
                submitting
                  ? t('transactions.saving', 'Đang lưu…')
                  : isEditMode
                    ? t('transactions.updateExpense', 'Cập Nhật')
                    : t('transactions.saveExpense', 'Lưu Chi Tiêu')
              }
            />
          </div>
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
