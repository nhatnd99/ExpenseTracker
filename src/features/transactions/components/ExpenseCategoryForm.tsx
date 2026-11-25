import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import {
  addExpenseCategory,
  validateExpenseCategoryInput,
} from '@/features/categories/expense/expenseCategoryService'
import { CATEGORY_ICON_GROUPS } from '@/constants/categoryIcons'
import { CategoryIconRenderer } from '@/components/ui/CategoryIconRenderer'

export interface ExpenseCategoryFormProps {
  activeTab: 'expense' | 'income'
  onCategoryAdded: () => void
}

export const ExpenseCategoryForm: React.FC<ExpenseCategoryFormProps> = ({
  activeTab,
  onCategoryAdded,
}) => {
  const { t } = useTranslation()
  const [newName, setNewName] = useState('')
  const [selectedIcon, setSelectedIcon] = useState('Utensils')
  const [selectedGroup, setSelectedGroup] = useState<string>('food')
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const validation = validateExpenseCategoryInput(newName)
    if (!validation.valid) {
      setErrorMsg(t('transactions.categoryNameRequired', 'Vui lòng nhập tên danh mục.'))
      return
    }

    setSubmitting(true)
    setErrorMsg(null)
    try {
      await addExpenseCategory({
        name: newName.trim(),
        icon: selectedIcon,
        type: activeTab,
      })
      setNewName('')
      onCategoryAdded()
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
        {activeTab === 'income'
          ? t('transactions.newIncomeCategoryName', 'Thêm danh mục thu nhập mới')
          : t('transactions.newCategoryName', 'Thêm danh mục chi tiêu mới')}
      </span>

      {/* Name & Icon Preview Row */}
      <div className="flex items-center gap-2 w-full max-w-full box-border">
        {/* Selected Icon Preview */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border)] text-[var(--color-primary)]">
          <CategoryIconRenderer icon={selectedIcon} size={20} />
        </div>

        {/* Category Name Input */}
        <input
          type="text"
          data-testid="category-name-input"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={
            activeTab === 'income'
              ? t('transactions.incomeCategoryPlaceholder', 'Ví dụ: Lương, Thưởng, Bán đồ…')
              : t('transactions.categoryNamePlaceholder', 'Ví dụ: Cà phê, Xăng xe…')
          }
          className="min-w-0 flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-3 py-2 text-base sm:text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-border-focused)] box-border"
        />

        {/* Add Button */}
        <button
          type="submit"
          data-testid="category-submit-btn"
          disabled={submitting || !newName.trim()}
          className={`shrink-0 flex h-10 items-center justify-center gap-1 rounded-xl px-3 text-xs font-bold text-white disabled:opacity-40 cursor-pointer transition-all active:scale-95 ${
            activeTab === 'income'
              ? 'bg-emerald-600 hover:bg-emerald-700'
              : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]'
          }`}
        >
          <Plus className="h-4 w-4" />
          <span>{t('transactions.addCategoryBtn', 'Thêm')}</span>
        </button>
      </div>

      {/* Icon Group Tabs */}
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

      {errorMsg && (
        <p className="text-xs text-[var(--color-expense)] font-medium">⚠️ {errorMsg}</p>
      )}
    </form>
  )
}
