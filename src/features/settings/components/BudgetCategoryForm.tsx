import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import type { BudgetCategory } from '@/types/models'
import {
  addBudgetCategory,
  validateBudgetCategoryInput,
} from '@/features/categories/budget/budgetCategoryService'
import { CATEGORY_ICON_GROUPS } from '@/constants/categoryIcons'
import { CategoryIconRenderer } from '@/components/ui/CategoryIconRenderer'

export interface BudgetCategoryFormProps {
  onCategoryAdded: (createdCategory: BudgetCategory) => void
}

export const BudgetCategoryForm: React.FC<BudgetCategoryFormProps> = ({
  onCategoryAdded,
}) => {
  const { t } = useTranslation()
  const [newName, setNewName] = useState('')
  const [selectedIcon, setSelectedIcon] = useState('Utensils')
  const [selectedGroup, setSelectedGroup] = useState<string>('food')
  const [isFixedBill, setIsFixedBill] = useState(false)
  const [excludeFromExpenseTracking, setExcludeFromExpenseTracking] = useState(false)
  const [enableItemizedRecords, setEnableItemizedRecords] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const validation = validateBudgetCategoryInput(newName)
    if (!validation.valid) {
      setErrorMsg(t('transactions.categoryNameRequired', 'Vui lòng nhập tên danh mục.'))
      return
    }

    setSubmitting(true)
    setErrorMsg(null)
    try {
      const created = await addBudgetCategory({
        name: newName.trim(),
        icon: selectedIcon,
        isFixedBill,
        type: 'expense',
        excludeFromExpenseTracking,
        enableItemizedRecords,
      })
      setNewName('')
      setIsFixedBill(false)
      setExcludeFromExpenseTracking(false)
      setEnableItemizedRecords(false)
      onCategoryAdded(created)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t('common.error', 'Lỗi'))
    } finally {
      setSubmitting(false)
    }
  }

  const currentGroupIcons =
    CATEGORY_ICON_GROUPS.find((g) => g.groupId === selectedGroup)?.icons ??
    CATEGORY_ICON_GROUPS[0].icons

  return (
    <form
      onSubmit={handleAdd}
      className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-3 space-y-3 w-full max-w-full box-border overflow-hidden"
    >
      <span className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider block">
        {t('plan.newBudgetCategoryTitle', 'Thêm danh mục ngân sách mới')}
      </span>

      {/* Input row */}
      <div className="flex items-center gap-2 w-full max-w-full box-border">
        {/* Selected Icon Preview */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border)] text-[var(--color-primary)]">
          <CategoryIconRenderer icon={selectedIcon} size={20} />
        </div>

        {/* Category Name Input */}
        <input
          type="text"
          data-testid="budget-category-name-input"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={t('plan.budgetCategoryPlaceholder', 'Ví dụ: Du lịch, Giải trí, Học tập…')}
          className="min-w-0 flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-3 py-2 text-base sm:text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-border-focused)] box-border"
        />

        {/* Add Button */}
        <button
          type="submit"
          data-testid="budget-category-submit-btn"
          disabled={submitting || !newName.trim()}
          className="shrink-0 flex h-10 items-center justify-center gap-1 rounded-xl px-3 text-xs font-bold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-40 cursor-pointer transition-all active:scale-95"
        >
          <Plus className="h-4 w-4" />
          <span>{t('transactions.addCategoryBtn', 'Thêm')}</span>
        </button>
      </div>

      {/* Group Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-1 w-full max-w-full box-border">
        {CATEGORY_ICON_GROUPS.map((g) => (
          <button
            key={g.groupId}
            type="button"
            onClick={() => setSelectedGroup(g.groupId)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-colors cursor-pointer ${
              selectedGroup === g.groupId
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-border)]'
            }`}
          >
            {t(g.groupNameKey, g.defaultGroupName)}
          </button>
        ))}
      </div>

      {/* Standard Icon Grid */}
      <div className="h-24 overflow-y-auto overflow-x-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-2 w-full max-w-full box-border">
        <div className="grid grid-cols-6 gap-1.5 w-full">
          {currentGroupIcons.map((item) => {
            const isSelected = selectedIcon === item.lucideName || selectedIcon === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedIcon(item.lucideName)}
                title={t(item.nameKey, item.defaultName)}
                className={`h-9 w-full rounded-lg flex items-center justify-center transition-transform active:scale-90 cursor-pointer ${
                  isSelected
                    ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)] border-2 border-[var(--color-primary)] font-bold'
                    : 'bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-border)]'
                }`}
              >
                <item.iconComponent size={18} />
              </button>
            )
          })}
        </div>
      </div>

      {/* Checkbox: Là hóa đơn/chi phí lớn */}
      <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border)] cursor-pointer select-none hover:border-[var(--color-primary)]/50 transition-colors">
        <input
          type="checkbox"
          data-testid="budget-fixed-bill-checkbox"
          checked={isFixedBill}
          onChange={(e) => setIsFixedBill(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] cursor-pointer accent-[var(--color-primary)] shrink-0"
        />
        <div className="min-w-0 flex-1">
          <span className="text-xs font-bold text-[var(--color-text-primary)] block">
            {t('transactions.isFixedBillLabel', 'Là hóa đơn / chi phí lớn')}
          </span>
          <span className="text-[11px] text-[var(--color-text-muted)] block leading-tight">
            {t('transactions.isFixedBillHelp', 'Không trừ vào Hạn mức ăn tiêu hằng ngày')}
          </span>
        </div>
      </label>

      {/* Additional Options (Tùy chọn bổ sung) */}
      <div className="space-y-2 pt-2 border-t border-[var(--color-border)]/60">
        <span className="text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider block">
          {t('transactions.additionalOptions', 'Tùy chọn bổ sung')}
        </span>

        {/* Option 1: Separate from Expense Tracking */}
        <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border)] cursor-pointer select-none hover:border-[var(--color-primary)]/50 transition-colors">
          <input
            type="checkbox"
            data-testid="budget-exclude-tracking-checkbox"
            checked={excludeFromExpenseTracking}
            onChange={(e) => setExcludeFromExpenseTracking(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] cursor-pointer accent-[var(--color-primary)] shrink-0"
          />
          <div className="min-w-0 flex-1">
            <span className="text-xs font-bold text-[var(--color-text-primary)] block">
              {t('transactions.excludeFromTracking', 'Tách khỏi theo dõi chi tiêu')}
            </span>
            <span className="text-[11px] text-[var(--color-text-muted)] block leading-tight">
              {t(
                'transactions.excludeFromTrackingHelp',
                'Loại trừ danh mục này khỏi theo dõi chi tiêu thường xuyên, báo cáo và tính toán chi tiêu hàng ngày.'
              )}
            </span>
          </div>
        </label>

        {/* Option 2: Enable Itemized Records */}
        <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border)] cursor-pointer select-none hover:border-[var(--color-primary)]/50 transition-colors">
          <input
            type="checkbox"
            data-testid="budget-itemized-records-checkbox"
            checked={enableItemizedRecords}
            onChange={(e) => setEnableItemizedRecords(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] cursor-pointer accent-[var(--color-primary)] shrink-0"
          />
          <div className="min-w-0 flex-1">
            <span className="text-xs font-bold text-[var(--color-text-primary)] block">
              {t('transactions.enableItemizedRecords', 'Bật ghi chép chi tiết')}
            </span>
            <span className="text-[11px] text-[var(--color-text-muted)] block leading-tight">
              {t(
                'transactions.enableItemizedRecordsHelp',
                'Cho phép thêm, sửa, xóa các khoản ghi chép riêng lẻ với tên, số tiền, ngày và ghi chú tùy chọn.'
              )}
            </span>
          </div>
        </label>
      </div>

      {errorMsg && (
        <p className="text-xs text-[var(--color-expense)] font-medium">⚠️ {errorMsg}</p>
      )}
    </form>
  )
}
