import React, { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  X,
  Trash2,
  ArrowUp,
  ArrowDown,
  Receipt,
  Edit2,
  Check,
  ClipboardList,
  EyeOff,
  Layers,
  Lock,
} from 'lucide-react'
import type { BudgetCategory } from '@/types/models'
import {
  updateBudgetCategory,
  deleteBudgetCategory,
  reorderBudgetCategories,
  validateBudgetCategoryInput,
} from '@/features/categories/budget/budgetCategoryService'
import {
  isBaseBudgetCategory,
  DEFAULT_BUDGET_PLAN_CATEGORIES,
} from '@/repositories/budgetCategoryRepository'
import { categoryRecordRepository } from '@/repositories/categoryRecordRepository'
import { CATEGORY_ICON_GROUPS } from '@/constants/categoryIcons'
import { CategoryIconRenderer } from '@/components/ui/CategoryIconRenderer'
import { ManageCategoryRecordsModal } from '@/features/categories/components/ManageCategoryRecordsModal'

export type BudgetCategoryChangeEvent =
  | { type: 'created'; category: BudgetCategory }
  | { type: 'updated'; category: BudgetCategory }
  | { type: 'deleted'; categoryId: string }
  | { type: 'reordered' }
  | { type: 'recordsChanged' }

export interface BudgetCategoryManagementProps {
  categories: BudgetCategory[]
  onCategoriesChanged: (event?: BudgetCategoryChangeEvent) => void
}

export const BudgetCategoryManagement: React.FC<BudgetCategoryManagementProps> = ({
  categories,
  onCategoriesChanged,
}) => {
  const { t } = useTranslation()

  // Edit category state (independent to Budget Categories)
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

  // Split into locked System Categories (1, 2, 3) and reorderable Custom Categories (4+)
  const { systemCategories, customCategories } = useMemo(() => {
    const nonIncome = categories.filter((c) => c.type !== 'income')
    const byId = new Map(nonIncome.map((c) => [c.id, c]))

    const system: BudgetCategory[] = DEFAULT_BUDGET_PLAN_CATEGORIES.map((def, idx) => {
      const existing = byId.get(def.id)
      return existing ? { ...existing, sortOrder: idx + 1 } : { ...def, sortOrder: idx + 1 }
    })

    const custom = nonIncome
      .filter((c) => !isBaseBudgetCategory(c.id))
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((c, idx) => ({
        ...c,
        sortOrder: DEFAULT_BUDGET_PLAN_CATEGORIES.length + idx + 1,
      }))

    return { systemCategories: system, customCategories: custom }
  }, [categories])

  const getSystemDisplayName = (cat: BudgetCategory): string => {
    if (cat.id === 'cat-expenses') return t('plan.cat_expenses', 'Chi Tiêu Hàng Ngày (Daily Expenses)')
    if (cat.id === 'cat-fixed') return t('plan.cat_fixed', 'Hóa Đơn Cố Định (Fixed Bills)')
    if (cat.id === 'cat-savings') return t('plan.cat_savings', 'Tiết Kiệm (Savings)')
    return cat.name
  }

  const handleStartEdit = (cat: BudgetCategory) => {
    if (isBaseBudgetCategory(cat.id)) return
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
    const validation = validateBudgetCategoryInput(editName)
    if (!validation.valid) {
      alert(t('transactions.categoryNameRequired', 'Vui lòng nhập tên danh mục.'))
      return
    }

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
      const updates = {
        name: editName.trim(),
        icon: editIcon,
        isFixedBill: editIsFixedBill,
        excludeFromExpenseTracking: editExcludeFromExpenseTracking,
        enableItemizedRecords: editEnableItemizedRecords,
      }
      await updateBudgetCategory(editingCategory.id, updates)
      const updatedCategory: BudgetCategory = {
        ...editingCategory,
        ...updates,
        updatedAt: new Date().toISOString(),
      }
      setEditingCategory(null)
      onCategoriesChanged({ type: 'updated', category: updatedCategory })
    } catch (err) {
      alert(err instanceof Error ? err.message : t('common.error', 'Lỗi'))
    } finally {
      setIsUpdating(false)
    }
  }

  const handleToggleFixedBill = async (cat: BudgetCategory) => {
    if (isBaseBudgetCategory(cat.id)) return
    const nextFixed = !Boolean(cat.isFixedBill)
    try {
      await updateBudgetCategory(cat.id, { isFixedBill: nextFixed })
      onCategoriesChanged({
        type: 'updated',
        category: { ...cat, isFixedBill: nextFixed, updatedAt: new Date().toISOString() },
      })
    } catch (err) {
      alert(err instanceof Error ? err.message : t('common.error', 'Lỗi'))
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (isBaseBudgetCategory(id)) return
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
      await deleteBudgetCategory(id)
      if (editingCategory?.id === id) {
        setEditingCategory(null)
      }
      onCategoriesChanged({ type: 'deleted', categoryId: id })
    } catch (err) {
      alert(err instanceof Error ? err.message : t('common.error', 'Lỗi'))
    }
  }

  // Reorder ONLY within customCategories (positions 4+)
  const handleMoveCustom = async (customIndex: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? customIndex - 1 : customIndex + 1
    if (targetIndex < 0 || targetIndex >= customCategories.length) return

    const reorderedCustom = [...customCategories]
    const temp = reorderedCustom[customIndex]
    reorderedCustom[customIndex] = reorderedCustom[targetIndex]
    reorderedCustom[targetIndex] = temp

    await reorderBudgetCategories(reorderedCustom)
    onCategoriesChanged({ type: 'reordered' })
  }

  const editGroupIcons =
    CATEGORY_ICON_GROUPS.find((g) => g.groupId === editGroup)?.icons ??
    CATEGORY_ICON_GROUPS[0].icons

  return (
    <>
      <div className="space-y-4 w-full max-w-full box-border">
        {/* Section Header */}
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">
            {t('transactions.categoryOrder', 'Thứ tự hiển thị')} ({systemCategories.length + customCategories.length})
          </span>
        </div>

        {/* 1. System Categories (Locked positions 1, 2, 3) */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider px-1 block">
            {t('plan.systemCategoriesTitle', 'Danh mục hệ thống')} ({systemCategories.length})
          </span>
          <div
            data-testid="system-budget-categories-list"
            className="divide-y divide-[var(--color-border)] rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)]/70 overflow-hidden w-full max-w-full box-border"
          >
            {systemCategories.map((cat) => (
              <div
                key={cat.id}
                data-testid={`system-category-row-${cat.id}`}
                className="p-2.5 sm:px-3.5 flex items-center justify-between gap-2.5 w-full max-w-full box-border"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span
                    data-testid={`category-position-${cat.id}`}
                    className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border)] text-[11px] font-extrabold text-[var(--color-text-muted)] shrink-0"
                  >
                    {cat.sortOrder}
                  </span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--color-bg-surface)] text-base shrink-0 text-[var(--color-primary)]">
                    <CategoryIconRenderer icon={cat.icon} size={16} />
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-[var(--color-text-primary)] truncate">
                    {getSystemDisplayName(cat)}
                  </span>
                </div>

                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border)] text-[10px] font-bold text-[var(--color-text-muted)] shrink-0">
                  <Lock className="h-3 w-3" />
                  <span>{t('plan.systemBadge', 'Hệ thống')}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Custom Categories (Reorderable starting at position 4) */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider px-1 block">
            {t('plan.customCategoriesTitle', 'Danh mục tùy chỉnh')} ({customCategories.length})
          </span>

          {customCategories.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg-subtle)]/40 p-4 text-center">
              <p className="text-xs text-[var(--color-text-muted)]">
                {t(
                  'plan.customCategoriesEmpty',
                  'Chưa có danh mục tùy chỉnh nào. Thêm danh mục mới ở trên (bắt đầu từ vị trí 4).',
                )}
              </p>
            </div>
          ) : (
            <div
              data-testid="custom-budget-categories-list"
              className="divide-y divide-[var(--color-border)] rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] overflow-hidden w-full max-w-full box-border shadow-2xs"
            >
              {customCategories.map((cat, idx) => (
                <div
                  key={cat.id}
                  data-testid={`custom-category-row-${cat.id}`}
                  className="p-2.5 sm:p-3 space-y-2 w-full max-w-full box-border hover:bg-[var(--color-bg-subtle)] transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 w-full">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span
                        data-testid={`category-position-${cat.id}`}
                        className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--color-primary-soft)] border border-[var(--color-primary)]/20 text-[11px] font-extrabold text-[var(--color-primary)] shrink-0"
                      >
                        {cat.sortOrder}
                      </span>
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
                        <button
                          type="button"
                          onClick={() => void handleToggleFixedBill(cat)}
                          className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:underline block text-left mt-0.5 cursor-pointer"
                        >
                          {cat.isFixedBill
                            ? t('transactions.markAsDaily', 'Đổi sang chi tiêu ngày')
                            : t('transactions.markAsFixedBill', 'Đổi sang hóa đơn lớn')}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        data-testid={`budget-category-move-up-${cat.id}`}
                        disabled={idx === 0}
                        onClick={() => void handleMoveCustom(idx, 'up')}
                        aria-label={t('plan.moveUp', 'Di chuyển lên')}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        data-testid={`budget-category-move-down-${cat.id}`}
                        disabled={idx === customCategories.length - 1}
                        onClick={() => void handleMoveCustom(idx, 'down')}
                        aria-label={t('plan.moveDown', 'Di chuyển xuống')}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        data-testid={`budget-category-edit-${cat.id}`}
                        onClick={() => handleStartEdit(cat)}
                        aria-label={t('common.edit', 'Sửa')}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-bg-subtle)] active:scale-95 cursor-pointer"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        data-testid={`budget-category-delete-${cat.id}`}
                        onClick={() => void handleDelete(cat.id, cat.name)}
                        aria-label={t('common.delete', 'Xóa')}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-expense-soft)] hover:text-[var(--color-expense)] active:scale-95 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {cat.enableItemizedRecords && (
                    <div className="pt-1 flex items-center justify-end">
                      <button
                        type="button"
                        data-testid={`budget-category-manage-records-${cat.id}`}
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

      {/* Edit Budget Category Dialog */}
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
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-bg-subtle)] border border-[var(--color-border)] text-[var(--color-primary)]">
                  <CategoryIconRenderer icon={editIcon} size={20} />
                </div>
                <input
                  type="text"
                  data-testid="budget-edit-category-name-input"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder={t('plan.budgetCategoryPlaceholder', 'Tên danh mục')}
                  className="min-w-0 flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-border-focused)]"
                />
              </div>

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

              <div className="h-20 overflow-y-auto overflow-x-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-2">
                <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5">
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

              <div className="space-y-2 pt-2 border-t border-[var(--color-border)]">
                <span className="text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider block">
                  {t('plan.categoryConfigTitle', 'Cấu hình danh mục')}
                </span>
                <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[var(--color-bg-subtle)] border border-[var(--color-border)] cursor-pointer">
                  <input
                    type="checkbox"
                    data-testid="budget-edit-fixed-bill-checkbox"
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
              </div>

              <div className="space-y-2 pt-2 border-t border-[var(--color-border)]">
                <span className="text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider block">
                  {t('transactions.additionalOptions', 'Tùy chọn bổ sung')}
                </span>

                <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[var(--color-bg-subtle)] border border-[var(--color-border)] cursor-pointer">
                  <input
                    type="checkbox"
                    data-testid="budget-edit-exclude-tracking-checkbox"
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
                    data-testid="budget-edit-itemized-records-checkbox"
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
                  data-testid="budget-edit-category-save-btn"
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

      {activeRecordModalCategory && (
        <ManageCategoryRecordsModal
          isOpen={Boolean(activeRecordModalCategory)}
          onClose={() => setActiveRecordModalCategory(null)}
          categoryId={activeRecordModalCategory.id}
          categoryName={activeRecordModalCategory.name}
          categoryIcon={activeRecordModalCategory.icon}
          onRecordsChanged={() => onCategoriesChanged({ type: 'recordsChanged' })}
        />
      )}
    </>
  )
}
