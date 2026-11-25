import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import type { ExpenseCategory } from '@/types/models'
import { ExpenseCategoryForm } from './ExpenseCategoryForm'
import { ExpenseCategoryManagement } from './ExpenseCategoryManagement'

export interface ExpenseCategoryModalProps {
  isOpen: boolean
  onClose: () => void
  categories: ExpenseCategory[]
  onCategoriesChanged: () => void
  initialType?: 'expense' | 'income'
}

export const ExpenseCategoryModal: React.FC<ExpenseCategoryModalProps> = ({
  isOpen,
  onClose,
  categories,
  onCategoriesChanged,
  initialType = 'expense',
}) => {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>(initialType)

  const [prevInitialType, setPrevInitialType] = useState(initialType)
  if (initialType !== prevInitialType) {
    setPrevInitialType(initialType)
    setActiveTab(initialType)
  }

  if (!isOpen) return null

  return (
    <div
      data-testid="expense-category-modal"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 overflow-hidden"
    >
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

          <ExpenseCategoryForm activeTab={activeTab} onCategoryAdded={onCategoriesChanged} />

          <ExpenseCategoryManagement
            activeTab={activeTab}
            categories={categories}
            onCategoriesChanged={onCategoriesChanged}
          />
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
