import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Plus, Trash2, ArrowUp, ArrowDown, Receipt } from 'lucide-react'
import type { BudgetCategory } from '@/types/models'
import { addCategory, updateCategory, deleteCategory, reorderCategories } from '@/features/categories/categoryService'
import { CATEGORY_ICON_GROUPS } from '@/constants/categoryIcons'
import { CategoryIconRenderer } from '@/components/ui/CategoryIconRenderer'

interface CategoryManagerModalProps {
  isOpen: boolean
  onClose: () => void
  categories: BudgetCategory[]
  onCategoriesChanged: () => void
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
  categories,
  onCategoriesChanged,
}) => {
  const { t } = useTranslation()
  const [newName, setNewName] = useState('')
  const [selectedIcon, setSelectedIcon] = useState('Utensils')
  const [selectedGroup, setSelectedGroup] = useState<string>('food')
  const [isFixedBill, setIsFixedBill] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  if (!isOpen) return null

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) {
      setErrorMsg(t('transactions.categoryNameRequired', 'Vui lòng nhập tên danh mục.'))
      return
    }

    setSubmitting(true)
    setErrorMsg(null)
    try {
      await addCategory({
        name: newName.trim(),
        icon: selectedIcon,
        isFixedBill,
      })
      setNewName('')
      setIsFixedBill(false)
      onCategoriesChanged()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t('common.error', 'Lỗi'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleFixedBill = async (id: string, current: boolean = false) => {
    try {
      await updateCategory(id, { isFixedBill: !current })
      onCategoriesChanged()
    } catch (err) {
      alert(err instanceof Error ? err.message : t('common.error', 'Lỗi'))
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (
      !confirm(
        t('transactions.deleteCategoryConfirm', {
          name,
          defaultValue: `Bạn có chắc chắn muốn xóa danh mục "${name}"?`,
        }),
      )
    )
      return

    try {
      await deleteCategory(id)
      onCategoriesChanged()
    } catch (err) {
      alert(err instanceof Error ? err.message : t('common.error', 'Lỗi'))
    }
  }

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= categories.length) return

    const reordered = [...categories]
    const [moved] = reordered.splice(index, 1)
    reordered.splice(targetIndex, 0, moved)

    await reorderCategories(reordered)
    onCategoriesChanged()
  }

  const currentGroupIcons =
    CATEGORY_ICON_GROUPS.find((g) => g.groupId === selectedGroup)?.icons ??
    CATEGORY_ICON_GROUPS[0].icons

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 overflow-hidden">
      <div className="w-full sm:w-[92vw] sm:max-w-md max-w-full rounded-t-3xl sm:rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-4 sm:p-5 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] sm:pb-5 shadow-2xl max-h-[88dvh] flex flex-col overflow-hidden box-border mx-auto">
        {/* Header - Fixed */}
        <div className="shrink-0 flex items-center justify-between border-b border-[var(--color-border)] pb-3">
          <h2 className="text-base font-bold text-[var(--color-text-primary)]">
            {t('transactions.categoryManagerTitle', 'Quản Lý Danh Mục')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.cancel', 'Đóng')}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)] cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content scroll area - Vertical Scroll Only, strict max-w-full and overflow-x-hidden */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden w-full max-w-full py-3 space-y-4 overscroll-y-contain box-border">
          {/* Add Category Form */}
          <form
            onSubmit={handleAdd}
            className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-3 space-y-3 w-full max-w-full box-border overflow-hidden"
          >
            <span className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider block">
              {t('transactions.newCategoryName', 'Thêm danh mục mới')}
            </span>

            {/* Input row */}
            <div className="flex items-center gap-2 w-full max-w-full box-border">
              {/* Selected Icon Preview */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border)] text-[var(--color-primary)]">
                <CategoryIconRenderer icon={selectedIcon} size={20} />
              </div>

              {/* Category Name Input (with min-w-0 flex-1 to prevent right edge overflow) */}
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t('transactions.categoryNamePlaceholder', 'Ví dụ: Cà phê, Xăng xe…')}
                className="min-w-0 flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-3 py-2 text-base sm:text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-border-focused)] box-border"
              />

              {/* Add Button */}
              <button
                type="submit"
                disabled={submitting || !newName.trim()}
                className="shrink-0 flex h-10 items-center justify-center gap-1 rounded-xl bg-[var(--color-primary)] px-3 text-xs font-bold text-white disabled:opacity-40 cursor-pointer transition-all active:scale-95"
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

            {/* Standard Icon Grid (Fixed height, guaranteed no layout shift) */}
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

            {/* Checkbox: Là hóa đơn/chi phí lớn (Không trừ vào Hạn mức ăn tiêu hằng ngày) */}
            <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border)] cursor-pointer select-none hover:border-[var(--color-primary)]/50 transition-colors">
              <input
                type="checkbox"
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

            {errorMsg && (
              <p className="text-xs text-[var(--color-expense)] font-medium">⚠️ {errorMsg}</p>
            )}
          </form>

          {/* List of categories with reorder & delete */}
          <div className="space-y-2 w-full max-w-full box-border">
            <span className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider px-1 block">
              {t('transactions.categoryOrder', 'Thứ tự hiển thị')} ({categories.length})
            </span>

            {categories.length === 0 ? (
              <p className="text-xs text-[var(--color-text-muted)]">
                {t('transactions.categoryEmpty', 'Chưa có danh mục nào.')}
              </p>
            ) : (
              <div className="divide-y divide-[var(--color-border)] rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] overflow-hidden w-full max-w-full box-border">
                {categories.map((cat, idx) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between p-2.5 sm:p-3 gap-2 w-full max-w-full box-border hover:bg-[var(--color-bg-subtle)] transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-bg-subtle)] text-lg shrink-0 text-[var(--color-primary)]">
                        <CategoryIconRenderer icon={cat.icon} size={18} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
                            {cat.name}
                          </span>
                          {cat.isFixedBill && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[var(--color-primary-soft)] text-[var(--color-primary)] border border-[var(--color-primary)]/20 shrink-0 inline-flex items-center gap-0.5">
                              <Receipt className="h-3 w-3" />
                              <span>{t('transactions.fixedBillBadge', 'Hóa đơn')}</span>
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleToggleFixedBill(cat.id, cat.isFixedBill)}
                          className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:underline block text-left mt-0.5 cursor-pointer"
                        >
                          {cat.isFixedBill
                            ? t('transactions.markAsDaily', 'Đổi sang chi tiêu ngày')
                            : t('transactions.markAsFixedBill', 'Đổi sang hóa đơn lớn')}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5 shrink-0">
                      {/* Move up */}
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => void handleMove(idx, 'up')}
                        aria-label={t('plan.moveUp', 'Di chuyển lên')}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] disabled:opacity-20 cursor-pointer"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      {/* Move down */}
                      <button
                        type="button"
                        disabled={idx === categories.length - 1}
                        onClick={() => void handleMove(idx, 'down')}
                        aria-label={t('plan.moveDown', 'Di chuyển xuống')}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] disabled:opacity-20 cursor-pointer"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => void handleDelete(cat.id, cat.name)}
                        aria-label={t('common.delete', 'Xóa')}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-expense-soft)] hover:text-[var(--color-expense)] cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer - Fixed */}
        <div className="shrink-0 pt-2 border-t border-[var(--color-border)] mt-1">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl bg-[var(--color-bg-subtle)] border border-[var(--color-border)] py-3 text-xs font-bold text-[var(--color-text-primary)] hover:bg-[var(--color-border)] cursor-pointer"
          >
            {t('common.cancel', 'Đóng')}
          </button>
        </div>
      </div>
    </div>
  )
}
