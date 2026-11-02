import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  X,
  Save,
  Sparkles,
  ChevronDown,
  Check,
  Plus,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import type { BudgetCategory, QuickTemplate, TransactionType } from '@/types/models'
import { formatCurrencyDisplay, parseCurrencyToNumber } from '@/utils/currency'
import { CategoryIconRenderer } from '@/components/ui/CategoryIconRenderer'
import { useSettings } from '@/context/useSettings'

export interface ManageQuickTemplateModalProps {
  isOpen: boolean
  onClose: () => void
  categories: BudgetCategory[]
}

interface QuickTemplateDialogProps {
  onClose: () => void
  initialTemplate?: QuickTemplate | null
  categories: BudgetCategory[]
  onSave: (data: Omit<QuickTemplate, 'id'>, id?: string) => void
}

const QuickTemplateDialog: React.FC<QuickTemplateDialogProps> = ({
  onClose,
  initialTemplate,
  categories,
  onSave,
}) => {
  const { t } = useTranslation()

  const [type, setType] = useState<TransactionType>(initialTemplate?.type || 'expense')
  const [name, setName] = useState(initialTemplate?.name || '')
  const [rawAmount, setRawAmount] = useState(initialTemplate ? String(initialTemplate.amount) : '')
  const [categoryId, setCategoryId] = useState(() => {
    if (initialTemplate?.categoryId) return initialTemplate.categoryId
    const firstCat = categories.find((c) => c.type !== 'income')
    return firstCat?.id || ''
  })
  const [note, setNote] = useState(initialTemplate?.note || '')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Filter categories matching current template type
  const availableCategories = categories.filter((c) =>
    type === 'income' ? c.type === 'income' : c.type !== 'income'
  )

  const selectedCategory = availableCategories.find((c) => c.id === categoryId)

  // Close dropdown on click outside
  useEffect(() => {
    if (!isDropdownOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isDropdownOpen])

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType)
    setIsDropdownOpen(false)
    const matching = categories.filter((c) =>
      newType === 'income' ? c.type === 'income' : c.type !== 'income'
    )
    if (!matching.some((c) => c.id === categoryId)) {
      setCategoryId(matching[0]?.id || '')
    }
  }

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '')
    setRawAmount(raw)
    setErrorMsg(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = name.trim()
    const numericAmount = parseCurrencyToNumber(rawAmount)

    if (!trimmedName) {
      setErrorMsg(t('settings.templateNameRequired', 'Vui lòng nhập tên biểu mẫu.'))
      return
    }

    if (!numericAmount || numericAmount <= 0) {
      setErrorMsg(t('settings.templateAmountRequired', 'Vui lòng nhập số tiền lớn hơn 0.'))
      return
    }

    if (!categoryId) {
      setErrorMsg(t('settings.templateCategoryRequired', 'Vui lòng chọn danh mục.'))
      return
    }

    onSave(
      {
        name: trimmedName,
        amount: numericAmount,
        categoryId,
        note: note.trim() || undefined,
        type,
      },
      initialTemplate?.id
    )

    onClose()
  }

  const isEditMode = Boolean(initialTemplate)

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-hidden">
      <div className="w-full max-w-md rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 box-border max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Sparkles className="h-4 w-4" />
            </div>
            <h3 className="text-base font-bold text-[var(--color-text-primary)]">
              {isEditMode
                ? t('settings.editTemplateTitle', 'Chỉnh Sửa Biểu Mẫu Nhanh')
                : t('settings.addTemplateTitle', 'Tạo Biểu Mẫu Nhanh Mới')}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)] cursor-pointer"
            aria-label={t('common.cancel', 'Đóng')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-1 pr-0.5">
          {/* Segmented Type Toggle (Chi tiêu / Thu nhập) */}
          <div className="grid grid-cols-2 p-1 rounded-2xl bg-[var(--color-bg-subtle)] border border-[var(--color-border)] gap-1">
            <button
              type="button"
              onClick={() => handleTypeChange('expense')}
              className={`py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                type === 'expense'
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
                type === 'income'
                  ? 'bg-[var(--color-bg-surface)] text-[var(--color-income)] shadow-2xs border border-[var(--color-border)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[var(--color-income)]" />
              <span>{t('transactions.typeIncome', 'Thu nhập')}</span>
            </button>
          </div>

          {/* Template Name */}
          <div className="space-y-1.5">
            <label
              htmlFor="tpl-name"
              className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]"
            >
              {t('settings.templateNameLabel', 'Tên biểu mẫu')} <span className="text-rose-500">*</span>
            </label>
            <input
              id="tpl-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setErrorMsg(null)
              }}
              placeholder={t('settings.templateNamePlaceholder', 'VD: Ăn trưa 35k, Cà phê sáng, Đổ xăng...')}
              maxLength={40}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2.5 text-xs font-semibold text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:bg-[var(--color-bg-surface)] focus:border-[var(--color-border-focused)] focus:outline-none transition-colors"
            />
          </div>

          {/* Amount Input */}
          <div className="space-y-1.5">
            <label
              htmlFor="tpl-amount"
              className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]"
            >
              {t('settings.templateAmountLabel', 'Số tiền mặc định')} <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                id="tpl-amount"
                type="text"
                inputMode="numeric"
                value={rawAmount ? formatCurrencyDisplay(rawAmount) : ''}
                onChange={handleAmountChange}
                placeholder="50,000"
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)] pl-3 pr-12 py-2.5 text-xs font-bold amount-display text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:bg-[var(--color-bg-surface)] focus:border-[var(--color-border-focused)] focus:outline-none transition-colors"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--color-text-muted)]">
                ₫
              </span>
            </div>
          </div>

          {/* Category Dropdown with Visual Icons */}
          <div ref={dropdownRef} className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
              {t('settings.templateCategoryLabel', 'Danh mục')} <span className="text-rose-500">*</span>
            </label>

            {/* Selected Value Trigger */}
            <button
              type="button"
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              className="w-full flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2 text-xs font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface)] focus:border-[var(--color-border-focused)] focus:outline-none transition-colors cursor-pointer"
            >
              {selectedCategory ? (
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border)] shrink-0">
                    <CategoryIconRenderer icon={selectedCategory.icon} size={15} />
                  </div>
                  <span className="truncate font-bold text-[var(--color-text-primary)]">
                    {selectedCategory.name}
                  </span>
                </div>
              ) : (
                <span className="text-xs text-[var(--color-text-muted)] italic">
                  {t('settings.selectCategoryPlaceholder', 'Chọn danh mục…')}
                </span>
              )}
              <ChevronDown
                className={`h-4 w-4 text-[var(--color-text-muted)] transition-transform duration-200 shrink-0 ml-1.5 ${
                  isDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Dropdown Options List */}
            {isDropdownOpen && (
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-1.5 shadow-lg max-h-48 overflow-y-auto space-y-1 animate-in fade-in zoom-in-95 duration-100">
                {availableCategories.length === 0 ? (
                  <div className="p-3 text-center text-xs text-[var(--color-text-muted)] italic">
                    {t('settings.noCategoriesForType', 'Chưa có danh mục')}
                  </div>
                ) : (
                  availableCategories.map((c) => {
                    const isSelected = c.id === categoryId
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setCategoryId(c.id)
                          setIsDropdownOpen(false)
                          setErrorMsg(null)
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)] font-extrabold shadow-2xs'
                            : 'text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--color-bg-subtle)] border border-[var(--color-border)] shrink-0">
                            <CategoryIconRenderer icon={c.icon} size={16} />
                          </div>
                          <span className="truncate">{c.name}</span>
                        </div>
                        {isSelected && <Check className="h-4 w-4 shrink-0 text-[var(--color-primary)]" />}
                      </button>
                    )
                  })
                )}
              </div>
            )}
          </div>

          {/* Default Note */}
          <div className="space-y-1.5">
            <label
              htmlFor="tpl-note"
              className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]"
            >
              {t('settings.templateNoteLabel', 'Ghi chú mặc định (Tùy chọn)')}
            </label>
            <input
              id="tpl-note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('settings.templateNotePlaceholder', 'VD: Cơm trưa văn phòng...')}
              maxLength={100}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2 text-xs font-normal text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:bg-[var(--color-bg-surface)] focus:border-[var(--color-border-focused)] focus:outline-none transition-colors"
            />
          </div>

          {errorMsg && (
            <p className="rounded-xl border border-[var(--color-expense-border)] bg-[var(--color-expense-soft)] p-2 text-xs text-[var(--color-expense)] font-medium text-center">
              ⚠️ {errorMsg}
            </p>
          )}

          {/* Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--color-border)]">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)] text-xs font-bold text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] cursor-pointer transition-all"
            >
              {t('common.cancel', 'Hủy')}
            </button>
            <button
              type="submit"
              className="py-2.5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] active:scale-95 text-xs font-bold text-white shadow-xs cursor-pointer transition-all flex items-center justify-center gap-1.5"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{isEditMode ? t('common.update', 'Cập nhật') : t('common.save', 'Lưu biểu mẫu')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export const ManageQuickTemplateModal: React.FC<ManageQuickTemplateModalProps> = ({
  isOpen,
  onClose,
  categories,
}) => {
  const { t } = useTranslation()
  const {
    quickTemplates,
    addQuickTemplate,
    updateQuickTemplate,
    deleteQuickTemplate,
    setQuickTemplates,
  } = useSettings()

  const [editingTemplate, setEditingTemplate] = useState<QuickTemplate | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)

  if (!isOpen) return null

  const handleOpenAdd = () => {
    setEditingTemplate(null)
    setIsFormOpen(true)
  }

  const handleOpenEdit = (tpl: QuickTemplate) => {
    setEditingTemplate(tpl)
    setIsFormOpen(true)
  }

  const handleSave = (data: Omit<QuickTemplate, 'id'>, id?: string) => {
    if (id) {
      updateQuickTemplate(id, data)
    } else {
      addQuickTemplate(data)
    }
    setIsFormOpen(false)
    setEditingTemplate(null)
  }

  const handleDelete = (id: string, name: string) => {
    if (
      confirm(
        t('settings.confirmDeleteTemplate', {
          name,
          defaultValue: `Bạn có chắc chắn muốn xóa biểu mẫu "${name}"?`,
        })
      )
    ) {
      deleteQuickTemplate(id)
    }
  }

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= quickTemplates.length) return

    const reordered = [...quickTemplates]
    const temp = reordered[index]
    reordered[index] = reordered[targetIndex]
    reordered[targetIndex] = temp

    setQuickTemplates(reordered)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 overflow-hidden">
      <div className="w-full sm:w-[92vw] sm:max-w-lg max-w-full rounded-t-3xl sm:rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-4 sm:p-5 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] sm:pb-5 shadow-2xl max-h-[88dvh] flex flex-col overflow-hidden box-border mx-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header - Fixed */}
        <div className="shrink-0 flex items-center justify-between border-b border-[var(--color-border)] pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[var(--color-text-primary)] leading-tight truncate">
                  {t('settings.manageTemplatesTitle', 'Quản lý biểu mẫu nhanh')}
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                  {quickTemplates.length}
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] truncate">
                {t('settings.manageTemplatesDesc', 'Cấu hình sẵn các biểu mẫu giao dịch hay dùng để tự động điền khi ghi chép')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.cancel', 'Đóng')}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)] cursor-pointer shrink-0 ml-2"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Top Actions: Add Button */}
        <div className="shrink-0 pt-3 pb-2 flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
            {t('settings.templatesListLabel', 'Danh sách biểu mẫu')}
          </span>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="py-1.5 px-3 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] active:scale-95 text-white text-xs font-bold shadow-xs cursor-pointer transition-all flex items-center gap-1.5 shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{t('settings.addTemplateBtn', 'Thêm biểu mẫu')}</span>
          </button>
        </div>

        {/* Scrollable Templates List (Xem, Sửa, Xóa, Order thứ tự hiển thị) */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden w-full max-w-full space-y-2 py-1 overscroll-y-contain pr-0.5 box-border">
          {quickTemplates.length === 0 ? (
            <div className="text-center py-10 space-y-3 border border-dashed border-[var(--color-border)] rounded-2xl p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mx-auto">
                <Sparkles className="h-6 w-6" />
              </div>
              <p className="text-xs text-[var(--color-text-muted)] max-w-xs mx-auto">
                {t('settings.noTemplates', 'Chưa có biểu mẫu nào. Hãy bấm "Thêm biểu mẫu" để tạo mới.')}
              </p>
              <button
                type="button"
                onClick={handleOpenAdd}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--color-primary)] text-white text-xs font-bold shadow-xs hover:bg-[var(--color-primary-hover)] cursor-pointer transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{t('settings.addTemplateBtn', 'Thêm biểu mẫu đầu tiên')}</span>
              </button>
            </div>
          ) : (
            quickTemplates.map((tpl, idx) => {
              const cat = categories.find((c) => c.id === tpl.categoryId)
              return (
                <div
                  key={tpl.id}
                  className="flex items-center justify-between gap-2 sm:gap-3 p-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)] hover:bg-[var(--color-bg-surface)] transition-all shadow-2xs box-border group"
                >
                  {/* Left: Reorder Arrows & Info */}
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    {/* Order Controls (Move Up / Down) */}
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMove(idx, 'up')}
                        aria-label={t('plan.moveUp', 'Lên')}
                        title={t('plan.moveUp', 'Lên')}
                        className="flex h-6 w-6 items-center justify-center rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-bg-surface)] disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer transition-colors"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === quickTemplates.length - 1}
                        onClick={() => handleMove(idx, 'down')}
                        aria-label={t('plan.moveDown', 'Xuống')}
                        title={t('plan.moveDown', 'Xuống')}
                        className="flex h-6 w-6 items-center justify-center rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-bg-surface)] disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer transition-colors"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Category Icon */}
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${
                        tpl.type === 'income'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      <CategoryIconRenderer icon={cat?.icon} size={18} />
                    </div>

                    {/* Template Details */}
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-[var(--color-text-primary)] truncate">
                          {tpl.name}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            tpl.type === 'income'
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {tpl.type === 'income'
                            ? t('transactions.typeIncome', 'Thu')
                            : t('transactions.typeExpense', 'Chi')}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-muted)] truncate">
                        <span>{cat?.name || t('transactions.categories', 'Danh mục')}</span>
                        {tpl.note && (
                          <>
                            <span>•</span>
                            <span className="truncate italic">"{tpl.note}"</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Amount & Actions (Edit & Delete) */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-xs sm:text-sm font-extrabold amount-display ${
                        tpl.type === 'income'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-[var(--color-text-primary)]'
                      }`}
                    >
                      {tpl.type === 'income' ? '+' : '-'}
                      {formatCurrencyDisplay(String(tpl.amount))} ₫
                    </span>

                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(tpl)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-surface)] hover:text-[var(--color-text-primary)] border border-transparent hover:border-[var(--color-border)] transition-colors cursor-pointer"
                        title={t('common.edit', 'Sửa')}
                        aria-label={t('common.edit', 'Sửa')}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(tpl.id, tpl.name)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 border border-transparent hover:border-rose-500/20 transition-colors cursor-pointer"
                        title={t('common.delete', 'Xóa')}
                        aria-label={t('common.delete', 'Xóa')}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer - Fixed */}
        <div className="shrink-0 pt-3 border-t border-[var(--color-border)] mt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)] text-xs font-bold text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] active:scale-[0.99] cursor-pointer transition-all text-center"
          >
            {t('common.confirm', 'Xác nhận')}
          </button>
        </div>
      </div>

      {/* Submodal: Create / Edit Quick Template Dialog */}
      {isFormOpen && (
        <QuickTemplateDialog
          key={editingTemplate ? editingTemplate.id : 'new'}
          onClose={() => {
            setIsFormOpen(false)
            setEditingTemplate(null)
          }}
          initialTemplate={editingTemplate}
          categories={categories}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
