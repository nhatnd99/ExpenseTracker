import React from 'react'
import { useTranslation } from 'react-i18next'
import { Edit3 } from 'lucide-react'
import { formatVnd } from '@/services/dateService'
import { CategoryIconRenderer } from '@/components/ui/CategoryIconRenderer'
import type { EnrichedTransaction } from '../transactionService'

export interface ExpenseItemProps {
  expense: EnrichedTransaction
  onClick?: (expense: EnrichedTransaction) => void
  showEditIcon?: boolean
  className?: string
}

export const ExpenseItem: React.FC<ExpenseItemProps> = ({
  expense,
  onClick,
  showEditIcon = true,
  className = '',
}) => {
  const { t } = useTranslation()

  return (
    <div
      onClick={() => onClick?.(expense)}
      className={`flex items-center justify-between rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-3.5 sm:p-4 shadow-2xs transition-all hover:border-[var(--color-primary)] active:scale-[0.99] cursor-pointer w-full box-border ${className}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick?.(expense)
        }
      }}
    >
      {/* Left section: Fixed Icon Box + Auto-expanding Text Container */}
      <div className="flex items-center min-w-0 flex-1">
        {/* Fixed Dimension Icon Box: w-10 h-10 flex-shrink-0 flex items-center justify-center */}
        <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-[var(--color-bg-subtle)] text-[var(--color-primary)] border border-[var(--color-border)] shadow-2xs">
          <CategoryIconRenderer icon={expense.categoryIcon} size={20} />
        </div>

        {/* Content Box: flex-1 ml-3 min-w-0 */}
        <div className="flex-1 ml-3 min-w-0">
          <p className="text-sm font-bold text-[var(--color-text-primary)] truncate">
            {expense.categoryName}
          </p>
          <p className="text-xs text-[var(--color-text-muted)] truncate">
            {expense.description
              ? expense.description
              : `${t('transactions.dateLabel', 'Ngày')}: ${expense.date}`}
          </p>
        </div>
      </div>

      {/* Right section: Amount + Edit action */}
      <div className="flex items-center gap-2 flex-shrink-0 pl-2">
        <span className="text-sm font-bold text-[var(--color-expense)] amount-display">
          -{formatVnd(expense.amountVnd)}
        </span>
        {showEditIcon && (
          <div className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-primary)]">
            <Edit3 className="h-3.5 w-3.5" />
          </div>
        )}
      </div>
    </div>
  )
}

