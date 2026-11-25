import React from 'react'
import { useTranslation } from 'react-i18next'
import { X, Layers } from 'lucide-react'
import type { BudgetCategory } from '@/types/models'
import { BudgetCategoryForm } from './BudgetCategoryForm'
import {
  BudgetCategoryManagement,
  type BudgetCategoryChangeEvent,
} from './BudgetCategoryManagement'

export interface BudgetCategoryModalProps {
  isOpen: boolean
  onClose: () => void
  categories: BudgetCategory[]
  onCategoriesChanged: (event?: BudgetCategoryChangeEvent) => void
}

export const BudgetCategoryModal: React.FC<BudgetCategoryModalProps> = ({
  isOpen,
  onClose,
  categories,
  onCategoriesChanged,
}) => {
  const { t } = useTranslation()

  if (!isOpen) return null

  return (
    <div
      data-testid="budget-category-modal"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 overflow-hidden"
    >
      <div className="w-full sm:w-[94vw] sm:max-w-xl max-w-full rounded-t-3xl sm:rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-2xl max-h-[90dvh] flex flex-col overflow-hidden box-border mx-auto">
        {/* Sticky Header */}
        <div className="shrink-0 flex items-center justify-between border-b border-[var(--color-border)] px-4 sm:px-5 py-3.5 bg-[var(--color-bg-surface)]">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)] shrink-0">
              <Layers className="h-4 w-4" />
            </span>
            <h2 className="text-base font-bold text-[var(--color-text-primary)] truncate">
              {t('plan.budgetCategoryManagerTitle', 'Quản Lý Danh Mục Ngân Sách')}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.cancel', 'Đóng')}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)] cursor-pointer shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Independent Scrollable Body */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden w-full max-w-full px-4 sm:px-5 py-4 space-y-5 overscroll-y-contain box-border">
          <BudgetCategoryForm
            onCategoryAdded={(category) =>
              onCategoriesChanged({ type: 'created', category })
            }
          />

          <BudgetCategoryManagement
            categories={categories}
            onCategoriesChanged={onCategoriesChanged}
          />
        </div>

        {/* Sticky Footer */}
        <div className="shrink-0 px-4 sm:px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] sm:pb-3 border-t border-[var(--color-border)] bg-[var(--color-bg-surface)]">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl bg-[var(--color-bg-subtle)] border border-[var(--color-border)] py-2.5 text-xs font-bold text-[var(--color-text-primary)] hover:bg-[var(--color-border)] cursor-pointer transition-colors"
          >
            {t('common.cancel', 'Đóng')}
          </button>
        </div>
      </div>
    </div>
  )
}
