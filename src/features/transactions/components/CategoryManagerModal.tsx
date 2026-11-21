import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  X,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Receipt,
  Edit2,
  Check,
  ClipboardList,
  EyeOff,
  Layers,
} from 'lucide-react'
import type { BudgetCategory } from '@/types/models'
import {
  addCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
} from '@/features/categories/categoryService'
import { categoryRecordRepository } from '@/repositories/categoryRecordRepository'
import { CATEGORY_ICON_GROUPS } from '@/constants/categoryIcons'
import { CategoryIconRenderer } from '@/components/ui/CategoryIconRenderer'
import { ManageCategoryRecordsModal } from '@/features/categories/components/ManageCategoryRecordsModal'

interface CategoryManagerModalProps {
  isOpen: boolean
  onClose: () => void
  categories: BudgetCategory[]
  onCategoriesChanged: () => void
  initialType?: 'expense' | 'income'
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
  categories,
  onCategoriesChanged,
  initialType = 'expense',
}) => {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>(initialType)
  const [newName, setNewName] = useState('')
  const [selectedIcon, setSelectedIcon] = useState('Utensils')
  const [selectedGroup, setSelectedGroup] = useState<string>('food')
  const [isFixedBill, setIsFixedBill] = useState(false)
  const [excludeFromExpenseTracking, setExcludeFromExpenseTracking] = useState(false)
  const [enableItemizedRecords, setEnableItemizedRecords] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Edit category state
  const [editingCategory, setEditingCategory] = useState<BudgetCategory | null>(null)
  const [editName, setEditName] = useState('')
  const [editIcon, setEditIcon] = useState('')
  const [editGroup, setEditGroup] = useState('food')
  const [editIsFixedBill, setEditIsFixedBill] = useState(false)
  const [editExcludeFromExpenseTracking, setEditExcludeFromExpenseTracking] = useState(false)
  const [editEnableItemizedRecords, setEditEnableItemizedRecords] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  // Active Category for ManageCategoryRecordsModal
  const [activeRecordModalCategory, setActiveRecordModalCategory] = useState<BudgetCategory | null>(null)

  const [prevInitialType, setPrevInitialType] = useState(initialType)
  if (initialType !== prevInitialType) {
    setPrevInitialType(initialType)
    setActiveTab(initialType)
  }

  if (!isOpen) return null

  // Filter categories matching current active tab
  const filteredCategories = categories.filter((c) =>
    activeTab === 'income' ? c.type === 'income' : c.type !== 'income'
  )

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
        isFixedBill: activeTab === 'income' ? false : isFixedBill,
        type: activeTab,
        excludeFromExpenseTracking,
        enableItemizedRecords,
      })
      setNewName('')
      setIsFixedBill(false)
      setExcludeFromExpenseTracking(false)
      setEnableItemizedRecords(false)
      onCategoriesChanged()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t('common.error', 'Lỗi'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleStartEdit = (cat: BudgetCategory) => {
    setEditingCategory(cat)
    setEditName(cat.name)
    setEditIcon(cat.icon || 'Utensils')
    setEditIsFixedBill(Boolean(cat.isFixedBill))
    setEditExcludeFromExpenseTracking(Boolean(cat.excludeFromExpenseTracking))
    setEditEnableItemizedRecords(Boolean(cat.enableItemizedRecords))
  }

  const handleCancelEdit = () => {
    setEditingCategory(null)
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCategory) return
    if (!editName.trim()) {
      alert(t('transactions.categoryNameRequired', 'Vui lòng nhập tên danh mục.'))
      return
    }

    // Warn if changing tracking behavior while records already exist
    if (editExcludeFromExpenseTracking !== Boolean(editingCategory.excludeFromExpenseTracking)) {
      const records = await categoryRecordRepository.findByCategoryId(editingCategory.id)
      if (records.length > 0) {
        const confirmed = confirm(
          t(
            'transactions.warnChangeTrackingWithRecords',
            'Danh mục này đã có ghi chép. Việc thay đổi cài đặt theo dõi chi tiêu sẽ ảnh hưởng đến báo cáo và hạn mức chi tiêu. Bạn có chắc chắn muốn thay đổi?'
          )
        )
        if (!confirmed) return
      }
    }

    setIsUpdating(true)
    try {
      await updateCategory(editingCategory.id, {
        name: editName.trim(),
        icon: editIcon,
        isFixedBill: activeTab === 'income' ? false : editIsFixedBill,
        excludeFromExpenseTracking: editExcludeFromExpenseTracking,
        enableItemizedRecords: editEnableItemizedRecords,
      })
      setEditingCategory(null)
      onCategoriesChanged()
    } catch (err) {
      alert(err instanceof Error ? err.message : t('common.error', 'Lỗi'))
    } finally {
      setIsUpdating(false)
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
        })
      )
    )
      return

    try {
      await deleteCategory(id)
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

    await reorderCategories(reordered)
    onCategoriesChanged()
  }

  const currentGroupIcons =
    CATEGORY_ICON_GROUPS.find((g) => g.groupId === selectedGroup)?.icons ??
    CATEGORY_ICON_GROUPS[0].icons

  const editGroupIcons =
    CATEGORY_ICON_GROUPS.find((g) => g.groupId === editGroup)?.icons ??
    CATEGORY_ICON_GROUPS[0].icons

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 overflow-hidden">
        <div className="w-full sm:w-[92vw] sm:max-w-lg max-w-full rounded-t-3xl sm:rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-4 sm:p-5 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] sm:pb-5 shadow-2xl max-h-[88dvh] flex flex-col overflow-hidden box-border mx-auto">
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

          {/* Content scroll area */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden w-full max-w-full py-3 space-y-4 overscroll-y-contain box-border">
            {/* Category Group Tabs: Chi (Expense) / Thu (Income) */}
            <div className="grid grid-cols-2 p-1 rounded-2xl bg-[var(--color-bg-subtle)] border border-[var(--color-border)] gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('expense')}
                className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'expense'
                    ? 'bg-[var(--color-bg-surface)] text-[var(--color-expense)] shadow-2xs border border-[var(--color-border)]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-[var(--color-expense)]" />
                <span>{t('transactions.typeExpense', 'Chi tiêu')}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('income')}
                className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'income'
                    ? 'bg-[var(--color-bg-surface)] text-[var(--color-income)] shadow-2xs border border-[var(--color-border)]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-[var(--color-income)]" />
                <span>{t('transactions.typeIncome', 'Thu nhập')}</span>
              </button>
            </div>

            {/* Add Category Form */}
            <form
              onSubmit={handleAdd}
              className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-3 space-y-3 w-full max-w-full box-border overflow-hidden"
            >
              <span className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider block">
                {activeTab === 'income'
                  ? t('transactions.newIncomeCategoryName', 'Thêm danh mục thu nhập mới')
                  : t('transactions.newCategoryName', 'Thêm danh mục chi tiêu mới')}
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

              {/* Checkbox: Là hóa đơn/chi phí lớn (Chỉ hiển thị cho tab Chi tiêu) */}
              {activeTab === 'expense' && (
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
              )}

              {/* Additional Options (Tùy chọn bổ sung) */}
              <div className="space-y-2 pt-2 border-t border-[var(--color-border)]/60">
                <span className="text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider block">
                  {t('transactions.additionalOptions', 'Tùy chọn bổ sung')}
                </span>

                {/* Option 1: Separate from Expense Tracking */}
                <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border)] cursor-pointer select-none hover:border-[var(--color-primary)]/50 transition-colors">
                  <input
                    type="checkbox"
                    data-testid="exclude-tracking-checkbox"
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
                    data-testid="itemized-records-checkbox"
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
                      className="p-2.5 sm:p-3 space-y-2 w-full max-w-full box-border hover:bg-[var(--color-bg-subtle)] transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2 w-full">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-bg-subtle)] text-lg shrink-0 text-[var(--color-primary)]">
                            <CategoryIconRenderer icon={cat.icon} size={18} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
                                {cat.name}
                              </span>
                              {activeTab === 'expense' && cat.isFixedBill && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[var(--color-primary-soft)] text-[var(--color-primary)] border border-[var(--color-primary)]/20 shrink-0 inline-flex items-center gap-0.5">
                                  <Receipt className="h-3 w-3" />
                                  <span>{t('transactions.fixedBillBadge', 'Hóa đơn')}</span>
                                </span>
                              )}
                              {cat.excludeFromExpenseTracking && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 shrink-0 inline-flex items-center gap-0.5">
                                  <EyeOff className="h-3 w-3" />
                                  <span>{t('transactions.excludedBadge', 'Tách riêng')}</span>
                                </span>
                              )}
                              {cat.enableItemizedRecords && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0 inline-flex items-center gap-0.5">
                                  <Layers className="h-3 w-3" />
                                  <span>{t('transactions.itemizedBadge', 'Ghi chép')}</span>
                                </span>
                              )}
                            </div>
                            {activeTab === 'expense' && (
                              <button
                                type="button"
                                onClick={() => void handleToggleFixedBill(cat.id, cat.isFixedBill)}
                                className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:underline block text-left mt-0.5 cursor-pointer"
                              >
                                {cat.isFixedBill
                                  ? t('transactions.markAsDaily', 'Đổi sang chi tiêu ngày')
                                  : t('transactions.markAsFixedBill', 'Đổi sang hóa đơn lớn')}
                              </button>
                            )}
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
                            disabled={idx === filteredCategories.length - 1}
                            onClick={() => void handleMove(idx, 'down')}
                            aria-label={t('plan.moveDown', 'Di chuyển xuống')}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] disabled:opacity-20 cursor-pointer"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </button>
                          {/* Edit Category */}
                          <button
                            type="button"
                            data-testid={`category-edit-${cat.id}`}
                            onClick={() => handleStartEdit(cat)}
                            aria-label={t('common.edit', 'Sửa')}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-bg-subtle)] cursor-pointer"
                          >
                            <Edit2 className="h-4 w-4" />
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

                      {/* Manage Records action button on category item if enabled */}
                      {cat.enableItemizedRecords && (
                        <div className="pt-1 flex items-center justify-end">
                          <button
                            type="button"
                            data-testid={`category-manage-records-${cat.id}`}
                            onClick={() => setActiveRecordModalCategory(cat)}
                            className="text-xs font-bold text-[var(--color-primary)] bg-[var(--color-primary-soft)] hover:bg-[var(--color-primary)] hover:text-white px-2.5 py-1 rounded-xl border border-[var(--color-primary)]/20 transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <ClipboardList className="h-3.5 w-3.5" />
                            <span>{t('transactions.manageRecords', 'Quản lý ghi chép')}</span>
                          </button>
                        </div>
                      )}
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

      {/* Edit Category Dialog / Modal */}
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
              {/* Name & Icon Row */}
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-bg-subtle)] border border-[var(--color-border)] text-[var(--color-primary)]">
                  <CategoryIconRenderer icon={editIcon} size={20} />
                </div>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder={t('transactions.categoryNamePlaceholder', 'Tên danh mục')}
                  className="min-w-0 flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-border-focused)]"
                />
              </div>

              {/* Group selection */}
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

              {/* Fixed Bill (if expense) */}
              {activeTab === 'expense' && (
                <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[var(--color-bg-subtle)] border border-[var(--color-border)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editIsFixedBill}
                    onChange={(e) => setEditIsFixedBill(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-primary)] accent-[var(--color-primary)] shrink-0 cursor-pointer"
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
              )}

              {/* Additional Options */}
              <div className="space-y-2 pt-2 border-t border-[var(--color-border)]">
                <span className="text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider block">
                  {t('transactions.additionalOptions', 'Tùy chọn bổ sung')}
                </span>

                <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[var(--color-bg-subtle)] border border-[var(--color-border)] cursor-pointer">
                  <input
                    type="checkbox"
                    data-testid="edit-exclude-tracking-checkbox"
                    checked={editExcludeFromExpenseTracking}
                    onChange={(e) => setEditExcludeFromExpenseTracking(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-primary)] accent-[var(--color-primary)] shrink-0 cursor-pointer"
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

                <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[var(--color-bg-subtle)] border border-[var(--color-border)] cursor-pointer">
                  <input
                    type="checkbox"
                    data-testid="edit-itemized-records-checkbox"
                    checked={editEnableItemizedRecords}
                    onChange={(e) => setEditEnableItemizedRecords(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-primary)] accent-[var(--color-primary)] shrink-0 cursor-pointer"
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

      {/* Itemized Category Records Modal */}
      {activeRecordModalCategory && (
        <ManageCategoryRecordsModal
          isOpen={Boolean(activeRecordModalCategory)}
          onClose={() => setActiveRecordModalCategory(null)}
          categoryId={activeRecordModalCategory.id}
          categoryName={activeRecordModalCategory.name}
          categoryIcon={activeRecordModalCategory.icon}
          onRecordsChanged={onCategoriesChanged}
        />
      )}
    </>
  )
}
