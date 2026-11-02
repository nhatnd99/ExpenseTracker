import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Trash2 } from 'lucide-react'
import type { BudgetCategory } from '@/types/models'
import type { EnrichedTransaction } from '../transactionService'
import { getTodayString } from '@/services/dateService'
import { useNumpadInput } from '../hooks/useNumpadInput'
import { CustomNumpad } from './CustomNumpad'
import { CategorySelector } from './CategorySelector'
import { SmartNoteInput } from './SmartNoteInput'
import { CategoryManagerModal } from './CategoryManagerModal'
import { CategoryIconRenderer } from '@/components/ui/CategoryIconRenderer'
import { useSettings } from '@/context/useSettings'
import { formatCompactVnd } from '@/utils/currency'
import type { QuickTemplate } from '@/types/models'

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
    type?: 'expense' | 'income'
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
  const { quickTemplates } = useSettings()

  // Transaction type: 'expense' by default, or loaded from existing transaction
  const [transactionType, setTransactionType] = useState<'expense' | 'income'>(
    initialTransaction?.type || 'expense'
  )

  const {
    formattedAmount,
    numericAmount,
    handleKeyPress,
    handleDelete,
    handleClear,
    setRawAmount,
  } = useNumpadInput(initialTransaction ? String(initialTransaction.amountVnd) : '')

  // Filter categories matching current transaction type (legacy/undefined types treated as 'expense')
  const filteredCategories = categories.filter((c) =>
    transactionType === 'income' ? c.type === 'income' : c.type !== 'income'
  )

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    initialTransaction?.categoryId || (filteredCategories[0]?.id ?? '')
  )
  const [date, setDate] = useState<string>(
    initialTransaction?.date || initialDate || getTodayString()
  )
  const [note, setNote] = useState<string>(initialTransaction?.description || '')

  // Ensure active category ID is valid within filtered categories
  const activeCategoryId =
    selectedCategoryId && filteredCategories.some((c) => c.id === selectedCategoryId)
      ? selectedCategoryId
      : filteredCategories[0]?.id ?? ''

  const handleTypeChange = (newType: 'expense' | 'income') => {
    setTransactionType(newType)
    const nextCategories = categories.filter((c) =>
      newType === 'income' ? c.type === 'income' : c.type !== 'income'
    )
    if (!nextCategories.some((c) => c.id === selectedCategoryId)) {
      setSelectedCategoryId(nextCategories[0]?.id ?? '')
    }
  }

  // State for excluding from daily spending limit (only relevant for expenses)
  const [isExcludedFromDaily, setIsExcludedFromDaily] = useState<boolean>(() => {
    if (initialTransaction) {
      return Boolean(initialTransaction.isExcludedFromDaily)
    }
    const cat = filteredCategories.find((c) => c.id === activeCategoryId)
    return Boolean(cat?.isFixedBill)
  })

  const prevCategoryIdRef = useRef(activeCategoryId)

  // Smart Auto-Toggle: when user selects a category, automatically sync toggle with category.isFixedBill
  useEffect(() => {
    if (prevCategoryIdRef.current !== activeCategoryId) {
      prevCategoryIdRef.current = activeCategoryId
      const cat = filteredCategories.find((c) => c.id === activeCategoryId)
      setIsExcludedFromDaily(Boolean(cat?.isFixedBill))
    }
  }, [activeCategoryId, filteredCategories])

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

  const handleSelectTemplate = (tpl: QuickTemplate) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(10)
      } catch {
        // ignore
      }
    }
    // 1. Auto-fill Amount
    setRawAmount(String(tpl.amount))

    // 2. Auto-switch Tab (Thu/Chi) if needed
    if (tpl.type !== transactionType) {
      handleTypeChange(tpl.type)
    }

    // 3. Auto-select Category
    setSelectedCategoryId(tpl.categoryId)

    // 4. Auto-fill Note
    setNote(tpl.note || '')

    // 5. If category is fixed bill, auto-toggle isExcludedFromDaily
    const cat = categories.find((c) => c.id === tpl.categoryId)
    if (tpl.type === 'expense') {
      setIsExcludedFromDaily(Boolean(cat?.isFixedBill))
    }
  }

  const handleSubmit = async () => {
    if (numericAmount <= 0) {
      setErrorMessage(
        transactionType === 'income'
          ? t('transactions.amountIncomeRequired', 'Vui lòng nhập số tiền thu lớn hơn 0.')
          : t('transactions.amountRequired', 'Vui lòng nhập số tiền chi tiêu lớn hơn 0.')
      )
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
        type: transactionType,
        amountVnd: numericAmount,
        categoryId: activeCategoryId,
        date,
        description: note.trim() || undefined,
        isExcludedFromDaily: transactionType === 'income' ? false : isExcludedFromDaily,
      })

      onClose()
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : transactionType === 'income'
            ? t('common.errorSaveIncome', 'Lỗi khi lưu khoản thu.')
            : t('common.error', 'Lỗi khi lưu khoản chi.')
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteRecord = async () => {
    if (!initialTransaction || !onDelete) return
    const confirmText =
      transactionType === 'income'
        ? t('transactions.confirmDeleteIncome', 'Bạn có chắc chắn muốn xóa khoản thu này?')
        : t('transactions.confirmDelete', 'Bạn có chắc chắn muốn xóa khoản chi này?')
    if (!confirm(confirmText)) return

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
        <div className="w-full max-w-lg mx-auto rounded-t-3xl border-t border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-2xl flex flex-col h-[90vh] max-h-[90vh] overflow-hidden">
          {/* 1. Header & Amount Section - Fixed (shrink-0) */}
          <div className="shrink-0 border-b border-[var(--color-border)] bg-[var(--color-bg-surface)] px-4 pt-3.5 pb-2 space-y-2">
            {/* Header Title & Close Button */}
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[var(--color-text-primary)]">
                {isEditMode
                  ? transactionType === 'income'
                    ? t('transactions.editIncomeTitle', 'Chỉnh Sửa Khoản Thu')
                    : t('transactions.editExpenseTitle', 'Chỉnh Sửa Khoản Chi')
                  : transactionType === 'income'
                    ? t('transactions.recordIncomeTitle', 'Thêm Khoản Thu Nhập')
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

            {/* Segmented Tabs: Chi (Expense) / Thu (Income) */}
            <div className="grid grid-cols-2 p-1 rounded-2xl bg-[var(--color-bg-subtle)] border border-[var(--color-border)] gap-1">
              <button
                type="button"
                onClick={() => handleTypeChange('expense')}
                className={`py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  transactionType === 'expense'
                    ? 'bg-[var(--color-bg-surface)] text-[var(--color-expense)] shadow-2xs border border-[var(--color-border)]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-[var(--color-expense)]" />
                <span>{t('transactions.typeExpense', 'Chi tiêu')}</span>
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('income')}
                className={`py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  transactionType === 'income'
                    ? 'bg-[var(--color-bg-surface)] text-[var(--color-income)] shadow-2xs border border-[var(--color-border)]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-[var(--color-income)]" />
                <span>{t('transactions.typeIncome', 'Thu nhập')}</span>
              </button>
            </div>

            {/* Amount Hero Display - Minimized vertical padding */}
            <div className="text-center py-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                {transactionType === 'income'
                  ? t('transactions.amountIncome', 'Số tiền thu')
                  : t('transactions.amountSpent', 'Số tiền chi')}
              </span>
              <div className="mt-0.5 flex items-baseline justify-center gap-1">
                <span
                  className={`text-lg font-bold ${
                    transactionType === 'income'
                      ? 'text-[var(--color-income)]'
                      : 'text-[var(--color-expense)]'
                  }`}
                >
                  {transactionType === 'income' ? '+' : '-'}
                </span>
                <span
                  className={`text-3xl sm:text-4xl font-extrabold amount-display tracking-tight leading-none ${
                    transactionType === 'income'
                      ? 'text-[var(--color-income)]'
                      : 'text-[var(--color-expense)]'
                  }`}
                >
                  {formattedAmount}
                </span>
                <span
                  className={`text-xl font-bold ${
                    transactionType === 'income'
                      ? 'text-[var(--color-income)]'
                      : 'text-[var(--color-expense)]'
                  }`}
                >
                  ₫
                </span>
              </div>
            </div>
          </div>

          {/* 2. Middle Body - Date & Categories (Scrollable Area - flex-1 overflow-y-auto) */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden w-full max-w-full px-4 py-2.5 space-y-2.5 overscroll-y-contain">
            {/* Single-row compact Date Picker */}
            <div className="flex items-center justify-between gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-1.5 px-2 box-border">
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleQuickDate(0)}
                  className={`rounded-xl px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                    date === todayStr
                      ? 'bg-[var(--color-primary)] text-white shadow-2xs'
                      : 'bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-border)]'
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
                      : 'bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-border)]'
                  }`}
                >
                  {t('transactions.yesterday', 'Hôm qua')}
                </button>
              </div>

              <div className="flex-1 min-w-0">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full min-w-0 box-border rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-2.5 py-1 text-xs font-semibold text-[var(--color-text-primary)] focus:border-[var(--color-border-focused)] focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Category Selector (Horizontal Scroll) */}
            <CategorySelector
              categories={filteredCategories}
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

            {/* Toggle Switch: Exclude from Daily Limit (Only for Expenses) */}
            {transactionType === 'expense' && (
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-2.5 flex items-center justify-between gap-3 transition-colors box-border">
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
                </div>

                {/* Toggle Switch Button */}
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
            )}

            {errorMessage && (
              <p className="rounded-xl border border-[var(--color-expense-border)] bg-[var(--color-expense-soft)] p-2 text-xs text-[var(--color-expense)] font-medium text-center">
                ⚠️ {errorMessage}
              </p>
            )}
          </div>

          {/* 3. Bottom Footer - Numpad (Fixed at bottom - shrink-0) with Safe-Area Padding */}
          <div className="shrink-0 w-full bg-gray-900 border-t border-gray-800 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]">
            {/* Quick Transaction Templates Chips */}
            {quickTemplates && quickTemplates.length > 0 && (
              <div className="flex flex-row overflow-x-auto gap-2 py-1 px-0.5 mb-1.5 scrollbar-hide snap-x no-scrollbar items-center">
                {quickTemplates.map((tpl) => {
                  const cat = categories.find((c) => c.id === tpl.categoryId)
                  const isActive =
                    numericAmount === tpl.amount &&
                    activeCategoryId === tpl.categoryId &&
                    transactionType === tpl.type

                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => handleSelectTemplate(tpl)}
                      className={`snap-start shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all active:scale-95 cursor-pointer select-none ${
                        tpl.type === 'income'
                          ? isActive
                            ? 'bg-emerald-600 text-white border border-emerald-400 shadow-md ring-2 ring-emerald-500/40'
                            : 'bg-gray-800 text-emerald-300 border border-emerald-500/30 hover:border-emerald-400 hover:text-white'
                          : isActive
                            ? 'bg-rose-600 text-white border border-rose-400 shadow-md ring-2 ring-rose-500/40'
                            : 'bg-gray-800 text-rose-300 border border-rose-500/30 hover:border-rose-400 hover:text-white'
                      }`}
                      aria-label={`${tpl.name} - ${tpl.amount} VND`}
                      aria-pressed={isActive}
                      title={`${tpl.name}: ${tpl.amount.toLocaleString('vi-VN')} ₫${cat?.name ? ` (${cat.name})` : ''}`}
                    >
                      <CategoryIconRenderer icon={cat?.icon} size={13} className="shrink-0" />
                      <span className="truncate max-w-[110px]">{tpl.name}</span>
                      <span className="font-mono text-[10px] opacity-80 shrink-0">
                        {formatCompactVnd(tpl.amount)}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}

            <CustomNumpad
              onKeyPress={handleKeyPress}
              onDelete={handleDelete}
              onClear={handleClear}
              onSubmit={() => void handleSubmit()}
              isSubmitDisabled={submitting || numericAmount <= 0}
              variant={transactionType}
              submitLabel={
                submitting
                  ? t('transactions.saving', 'Đang lưu…')
                  : isEditMode
                    ? t('transactions.update', 'Cập Nhật')
                    : transactionType === 'income'
                      ? t('transactions.saveIncome', 'Lưu Thu Nhập')
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
        initialType={transactionType}
      />
    </>
  )
}
