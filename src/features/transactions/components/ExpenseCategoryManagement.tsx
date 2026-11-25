import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Trash2, ArrowUp, ArrowDown, Edit2, Check } from 'lucide-react'
import type { CategoryType, ExpenseCategory } from '@/types/models'
import {
  updateExpenseCategory,
  deleteExpenseCategory,
  reorderExpenseCategories,
  validateExpenseCategoryInput,
} from '@/features/categories/expense/expenseCategoryService'
import { transactionRepository } from '@/repositories/transactionRepository'
import { CATEGORY_ICON_GROUPS } from '@/constants/categoryIcons'
import { CategoryIconRenderer } from '@/components/ui/CategoryIconRenderer'

export interface ExpenseCategoryManagementProps {
  activeTab: 'expense' | 'income'
  categories: ExpenseCategory[]
  onCategoriesChanged: () => void
}

export const ExpenseCategoryManagement: React.FC<ExpenseCategoryManagementProps> = ({
  activeTab,
  categories,
  onCategoriesChanged,
}) => {
  const { t } = useTranslation()

  // Edit category state (strictly Name, Icon, Type)
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null)
  const [editName, setEditName] = useState('')
  const [editIcon, setEditIcon] = useState('')
  const [editType, setEditType] = useState<CategoryType>('expense')
  const [editGroup, setEditGroup] = useState('food')
  const [isUpdating, setIsUpdating] = useState(false)

  // Filter categories matching current active tab
  const filteredCategories = categories.filter((c) =>
    activeTab === 'income' ? c.type === 'income' : c.type !== 'income'
  )

  const handleStartEdit = (cat: ExpenseCategory) => {
    setEditingCategory(cat)
    setEditName(cat.name)
    setEditIcon(cat.icon || 'Utensils')
    setEditType(cat.type === 'income' ? 'income' : 'expense')
  }

  const handleCancelEdit = () => {
    setEditingCategory(null)
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCategory) return
    const validation = validateExpenseCategoryInput(editName)
    if (!validation.valid) {
      alert(t('transactions.categoryNameRequired', 'Vui lòng nhập tên danh mục.'))
      return
    }

    setIsUpdating(true)
    try {
      await updateExpenseCategory(editingCategory.id, {
        name: editName.trim(),
        icon: editIcon,
        type: editType,
      })
      setEditingCategory(null)
      onCategoriesChanged()
    } catch (err) {
      alert(err instanceof Error ? err.message : t('common.error', 'Lỗi'))
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    const referencedTransactions = await transactionRepository
      .findByCategoryId(id)
      .catch(() => [])

    const confirmMessage =
      referencedTransactions.length > 0
        ? t('transactions.deleteCategoryWithRecordsConfirm', {
            name,
            count: referencedTransactions.length,
            defaultValue: `Danh mục "${name}" đang được sử dụng trong ${referencedTransactions.length} giao dịch. Các giao dịch cũ vẫn sẽ được giữ nguyên. Bạn có chắc chắn muốn xóa danh mục này?`,
          })
        : t('transactions.deleteCategoryConfirm', {
            name,
            defaultValue: `Bạn có chắc chắn muốn xóa danh mục "${name}"?`,
          })

    if (!confirm(confirmMessage)) return

    try {
      await deleteExpenseCategory(id)
      if (editingCategory?.id === id) {
        setEditingCategory(null)
      }
      onCategoriesChanged()
    } catch (err) {
      alert(err instanceof Error ? err.message : t('common.error', 'Lỗi'))
    }
  }

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= filteredCategories.length) return

    const itemA = filteredCategories[index]
    const itemB = filteredCategories[targetIndex]
    const fullIndexA = categories.findIndex((c) => c.id === itemA.id)
    const fullIndexB = categories.findIndex((c) => c.id === itemB.id)
    if (fullIndexA === -1 || fullIndexB === -1) return

    const reordered = [...categories]
    const temp = reordered[fullIndexA]
    reordered[fullIndexA] = reordered[fullIndexB]
    reordered[fullIndexB] = temp

    await reorderExpenseCategories(reordered)
    onCategoriesChanged()
  }

  const editGroupIcons =
    CATEGORY_ICON_GROUPS.find((g) => g.groupId === editGroup)?.icons ??
    CATEGORY_ICON_GROUPS[0].icons

  return (
    <>
      {/* List of categories with reorder, edit & delete */}
      <div className="space-y-2 w-full max-w-full box-border">
        <span className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider px-1 block">
          {t('transactions.categoryOrder', 'Thứ tự hiển thị')} ({filteredCategories.length})
        </span>

        {filteredCategories.length === 0 ? (
          <p className="text-xs text-[var(--color-text-muted)]">
            {t('transactions.categoryEmpty', 'Chưa có danh mục nào.')}
          </p>
        ) : (
          <div className="divide-y divide-[var(--color-border)] rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] overflow-hidden w-full max-w-full box-border">
            {filteredCategories.map((cat, idx) => (
              <div
                key={cat.id}
                className="p-2.5 sm:p-3 w-full max-w-full box-border hover:bg-[var(--color-bg-subtle)] transition-colors"
              >
                <div className="flex items-center justify-between gap-2 w-full">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-bg-subtle)] text-lg shrink-0 text-[var(--color-primary)]">
                      <CategoryIconRenderer icon={cat.icon} size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-semibold text-[var(--color-text-primary)] truncate block">
                        {cat.name}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => void handleMove(idx, 'up')}
                      aria-label={t('plan.moveUp', 'Di chuyển lên')}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] disabled:opacity-20 cursor-pointer"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === filteredCategories.length - 1}
                      onClick={() => void handleMove(idx, 'down')}
                      aria-label={t('plan.moveDown', 'Di chuyển xuống')}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] disabled:opacity-20 cursor-pointer"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      data-testid={`category-edit-${cat.id}`}
                      onClick={() => handleStartEdit(cat)}
                      aria-label={t('common.edit', 'Sửa')}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-bg-subtle)] cursor-pointer"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      data-testid={`category-delete-${cat.id}`}
                      onClick={() => void handleDelete(cat.id, cat.name)}
                      aria-label={t('common.delete', 'Xóa')}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-expense-soft)] hover:text-[var(--color-expense)] cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Expense Category Dialog (ONLY Name, Icon, Type) */}
      {editingCategory && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-hidden">
          <div className="w-full max-w-md rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-5 shadow-2xl space-y-4 max-h-[90dvh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                {t('transactions.editCategoryTitle', 'Chỉnh sửa danh mục')}
              </h3>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)] cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="flex-1 overflow-y-auto space-y-3.5 pr-1">
              {/* Type Field (Expense / Income) */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider block">
                  {t('transactions.categoryTypeLabel', 'Loại danh mục')}
                </span>
                <div className="grid grid-cols-2 p-1 rounded-2xl bg-[var(--color-bg-subtle)] border border-[var(--color-border)] gap-1">
                  <button
                    type="button"
                    data-testid="edit-category-type-expense"
                    onClick={() => setEditType('expense')}
                    className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      editType === 'expense'
                        ? 'bg-[var(--color-bg-surface)] text-[var(--color-expense)] shadow-2xs border border-[var(--color-border)]'
                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-[var(--color-expense)]" />
                    <span>{t('transactions.typeExpense', 'Chi tiêu')}</span>
                  </button>
                  <button
                    type="button"
                    data-testid="edit-category-type-income"
                    onClick={() => setEditType('income')}
                    className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      editType === 'income'
                        ? 'bg-[var(--color-bg-surface)] text-[var(--color-income)] shadow-2xs border border-[var(--color-border)]'
                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-[var(--color-income)]" />
                    <span>{t('transactions.typeIncome', 'Thu nhập')}</span>
                  </button>
                </div>
              </div>

              {/* Name & Icon Preview */}
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-bg-subtle)] border border-[var(--color-border)] text-[var(--color-primary)]">
                  <CategoryIconRenderer icon={editIcon} size={20} />
                </div>
                <input
                  type="text"
                  data-testid="edit-category-name-input"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder={t('transactions.categoryNamePlaceholder', 'Tên danh mục')}
                  className="min-w-0 flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-border-focused)]"
                />
              </div>

              {/* Icon Group Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-1">
                {CATEGORY_ICON_GROUPS.map((g) => (
                  <button
                    key={g.groupId}
                    type="button"
                    onClick={() => setEditGroup(g.groupId)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold shrink-0 transition-colors cursor-pointer ${
                      editGroup === g.groupId
                        ? 'bg-[var(--color-primary)] text-white'
                        : 'bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] border border-[var(--color-border)]'
                    }`}
                  >
                    {t(g.groupNameKey, g.defaultGroupName)}
                  </button>
                ))}
              </div>

              {/* Icon Grid */}
              <div className="h-24 overflow-y-auto overflow-x-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-2">
                <div className="grid grid-cols-6 gap-1.5">
                  {editGroupIcons.map((item) => {
                    const isSelected = editIcon === item.lucideName || editIcon === item.id
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setEditIcon(item.lucideName)}
                        className={`h-8 w-full rounded-lg flex items-center justify-center cursor-pointer ${
                          isSelected
                            ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)] border-2 border-[var(--color-primary)]'
                            : 'bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] border border-[var(--color-border)]'
                        }`}
                      >
                        <item.iconComponent size={16} />
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="flex-1 py-2.5 rounded-xl bg-[var(--color-bg-subtle)] border border-[var(--color-border)] text-xs font-bold text-[var(--color-text-primary)] hover:bg-[var(--color-border)] cursor-pointer"
                >
                  {t('common.cancel', 'Hủy')}
                </button>
                <button
                  type="submit"
                  data-testid="edit-category-save-btn"
                  disabled={isUpdating || !editName.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-[var(--color-primary)] text-xs font-bold text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Check className="h-4 w-4" />
                  <span>{t('common.save', 'Lưu')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
