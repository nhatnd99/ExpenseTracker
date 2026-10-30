import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react'
import type { BudgetCategory } from '@/types/models'
import { addCategory, deleteCategory, reorderCategories } from '@/features/categories/categoryService'

interface CategoryManagerModalProps {
  isOpen: boolean
  onClose: () => void
  categories: BudgetCategory[]
  onCategoriesChanged: () => void
}

const COMMON_ICONS = ['🍔', '☕', '🛒', '🚗', '💊', '🏠', '🎮', '👕', '📚', '✈️', '🎁', '⚡', '🐾', '📱']

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
  categories,
  onCategoriesChanged,
}) => {
  const { t } = useTranslation()
  const [newName, setNewName] = useState('')
  const [selectedIcon, setSelectedIcon] = useState('🍔')
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
        name: newName,
        icon: selectedIcon,
      })
      setNewName('')
      onCategoriesChanged()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t('common.error', 'Lỗi'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(t('transactions.deleteCategoryConfirm', { name, defaultValue: `Bạn có chắc chắn muốn xóa danh mục "${name}"?` }))) return
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

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-5 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] sm:pb-5 shadow-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
          <h2 className="text-base font-bold text-[var(--color-text-primary)]">
            {t('transactions.categoryManagerTitle', 'Quản Lý Danh Mục')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)] cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content scroll area */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {/* Add form */}
          <form onSubmit={handleAdd} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-3.5 space-y-3">
            <span className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">
              {t('transactions.newCategoryName', 'Thêm danh mục mới')}
            </span>

            <div className="flex gap-2">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border)] text-xl">
                {selectedIcon}
              </div>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t('transactions.categoryNamePlaceholder', 'Ví dụ: Cà phê, Xăng xe…')}
                className="flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-3 text-base sm:text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-border-focused)]"
              />
              <button
                type="submit"
                disabled={submitting || !newName.trim()}
                className="flex h-11 items-center justify-center gap-1 rounded-xl bg-[var(--color-primary)] px-3 text-xs font-bold text-white disabled:opacity-40 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>{t('transactions.addCategoryBtn', 'Thêm')}</span>
              </button>
            </div>

            {/* Quick icon picker */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {COMMON_ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setSelectedIcon(icon)}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm transition-transform active:scale-90 cursor-pointer ${
                    selectedIcon === icon
                      ? 'bg-[var(--color-primary-soft)] border-2 border-[var(--color-primary)] scale-110'
                      : 'bg-[var(--color-bg-surface)] border border-[var(--color-border)]'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>

            {errorMsg && (
              <p className="text-xs text-[var(--color-expense)] font-medium">⚠️ {errorMsg}</p>
            )}
          </form>

          {/* List of categories with reorder & delete */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider px-1">
              {t('transactions.categoryOrder', 'Thứ tự hiển thị')} ({categories.length})
            </span>

            {categories.length === 0 ? (
              <p className="text-xs text-[var(--color-text-muted)]">{t('transactions.categoryEmpty', 'Chưa có danh mục nào.')}</p>
            ) : (
              <div className="divide-y divide-[var(--color-border)] rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] overflow-hidden">
                {categories.map((cat, idx) => (
                  <div key={cat.id} className="flex items-center justify-between p-3 transition-colors hover:bg-[var(--color-bg-subtle)]">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-bg-subtle)] text-lg">
                        {cat.icon}
                      </span>
                      <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                        {cat.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Move up */}
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => void handleMove(idx, 'up')}
                        aria-label="Di chuyển lên"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] disabled:opacity-20 cursor-pointer"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      {/* Move down */}
                      <button
                        type="button"
                        disabled={idx === categories.length - 1}
                        onClick={() => void handleMove(idx, 'down')}
                        aria-label="Di chuyển xuống"
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

        {/* Footer */}
        <div className="pt-2">
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
