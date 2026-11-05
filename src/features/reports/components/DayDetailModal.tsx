import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Receipt, Edit3, X, Coins } from 'lucide-react'
import { formatVnd, formatTime, parseDateString, compareTransactionsDesc } from '@/services/dateService'
import { CategoryIconRenderer } from '@/components/ui/CategoryIconRenderer'
import type { EnrichedTransaction } from '@/features/transactions/transactionService'
import type { CalendarDayData } from '../types'

export interface DayDetailModalProps {
  dayData: CalendarDayData | null
  transactions: EnrichedTransaction[]
  budgetVnd: number
  onClose: () => void
  onEditTransaction: (tx: EnrichedTransaction) => void
}

/**
 * DayDetailModal - Dumb Component
 * Purely renders the limit, spent, and balance calculated by the Parent (Calendar Grid).
 * Contains ZERO internal recalculation of daily limits to guarantee a single source of truth.
 */
export const DayDetailModal: React.FC<DayDetailModalProps> = ({
  dayData,
  transactions,
  budgetVnd,
  onClose,
  onEditTransaction,
}) => {
  const { t, i18n } = useTranslation()

  const formattedDate = useMemo(() => {
    if (!dayData) return ''
    const localeCode = i18n.language === 'vi' ? 'vi-VN' : 'en-US'
    return new Intl.DateTimeFormat(localeCode, {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(parseDateString(dayData.date))
  }, [dayData, i18n.language])

  // Filter transactions strictly belonging to this day
  const dayTransactions = useMemo(() => {
    if (!dayData) return []
    return transactions
      .filter((tx) => tx.date === dayData.date)
      .sort(compareTransactionsDesc)
  }, [dayData, transactions])

  // Fixed bills for this day
  const excludedBills = useMemo(() => {
    return dayTransactions
      .filter((tx) => tx.type !== 'income' && Boolean(tx.isExcludedFromDaily))
      .reduce((sum, tx) => sum + tx.amountVnd, 0)
  }, [dayTransactions])

  // Extra income for this day
  const dayIncome = useMemo(() => {
    return dayTransactions
      .filter((tx) => tx.type === 'income')
      .reduce((sum, tx) => sum + tx.amountVnd, 0)
  }, [dayTransactions])

  if (!dayData) return null

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end bg-black/60 backdrop-blur-xs overflow-hidden">
      <div className="w-full max-w-lg mx-auto rounded-t-3xl border-t border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-2xl flex flex-col max-h-[85dvh] h-auto overflow-hidden animate-in fade-in-0 slide-in-from-bottom duration-200">
        {/* Header - Fixed */}
        <div className="shrink-0 flex items-center justify-between px-5 pt-4 pb-3 border-b border-[var(--color-border)]">
          <div className="min-w-0 flex-1 pr-2">
            <h3 className="text-sm font-bold text-[var(--color-text-primary)] truncate">
              {t('reports.dayDetailsTitle', 'Chi Tiêu Ngày')} {formattedDate}
            </h3>

            {/* Single Source of Truth Display: Renders direct props passed from Calendar */}
            {budgetVnd > 0 ? (
              <div className="grid grid-cols-3 gap-1.5 py-1.5 px-2.5 rounded-xl bg-[var(--color-bg-subtle)] my-2 border border-[var(--color-border)]">
                <div className="text-center min-w-0">
                  <span className="block text-[9px] text-[var(--color-text-muted)] font-bold uppercase truncate">
                    {t('reports.dailyLimit', 'Hạn mức')}
                  </span>
                  <span className="text-xs font-bold text-[var(--color-text-primary)] amount-display truncate">
                    {formatVnd(dayData.limit)}
                  </span>
                </div>
                <div className="text-center min-w-0">
                  <span className="block text-[9px] text-[var(--color-text-muted)] font-bold uppercase truncate">
                    {t('reports.spent', 'Đã chi')}
                  </span>
                  <span className="text-xs font-bold text-[var(--color-expense)] amount-display truncate">
                    {formatVnd(dayData.spent)}
                  </span>
                </div>
                <div className="text-center min-w-0">
                  <span className="block text-[9px] text-[var(--color-text-muted)] font-bold uppercase truncate">
                    {dayData.isFuture ? t('reports.projection', 'Dự báo') : t('reports.balance', 'Còn lại')}
                  </span>
                  <span
                    className={`text-xs font-bold amount-display truncate ${
                      dayData.balance >= 0
                        ? 'text-[var(--color-income)]'
                        : 'text-[var(--color-expense)]'
                    }`}
                  >
                    {dayData.balance >= 0
                      ? `+${formatVnd(dayData.balance)}`
                      : `-${formatVnd(Math.abs(dayData.balance))}`}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                {t('reports.dayTotalSpent', 'Tổng chi trong ngày')}:{' '}
                <span className="font-extrabold text-[var(--color-expense)] amount-display">
                  {formatVnd(dayData.spent)}
                </span>
              </p>
            )}

            {excludedBills > 0 && (
              <p className="text-[11px] text-[var(--color-primary)] mt-1 font-medium flex items-center gap-1">
                <Receipt className="h-3 w-3 shrink-0" />
                <span>{t('transactions.billsToday', 'Hóa đơn lớn')}: {formatVnd(excludedBills)}</span>
              </p>
            )}
            {dayIncome > 0 && (
              <p className="text-[11px] text-[var(--color-income)] mt-0.5 font-medium flex items-center gap-1">
                <Coins className="h-3 w-3 shrink-0" />
                <span>{t('transactions.incomeToday', 'Thu nhập thêm')}: +{formatVnd(dayIncome)}</span>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)] cursor-pointer"
            aria-label={t('common.cancel', 'Đóng')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content List of Transactions on Selected Day */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-2 overscroll-y-contain">
          {dayTransactions.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)]">
                <Receipt className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                {t('transactions.noTransactionsForDay', 'Chưa có khoản chi nào trong ngày này')}
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--color-text-muted)] px-1">
                <span>
                  {t('transactions.expensesListTitle', {
                    count: dayTransactions.length,
                    defaultValue: `Khoản chi (${dayTransactions.length})`,
                  })}
                </span>
                <span>{t('transactions.tapToEdit', 'Chạm để xem & sửa')}</span>
              </div>

              {dayTransactions.map((tx) => (
                <div
                  key={tx.id}
                  onClick={() => onEditTransaction(tx)}
                  className="flex items-center justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-3 hover:border-[var(--color-primary)] active:scale-[0.99] cursor-pointer transition-all shadow-2xs"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      onEditTransaction(tx)
                    }
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-bg-subtle)] text-[var(--color-primary)] border border-[var(--color-border)] shadow-2xs">
                      <CategoryIconRenderer icon={tx.categoryIcon} size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[var(--color-text-primary)] truncate">
                        {tx.categoryName}
                      </p>
                      <p className="text-[11px] text-[var(--color-text-muted)] truncate flex items-center gap-1">
                        {formatTime(tx.transactionDate || tx.createdAt) && (
                          <span className="font-mono text-[10px] text-[var(--color-text-muted)] shrink-0">
                            {formatTime(tx.transactionDate || tx.createdAt)} •
                          </span>
                        )}
                        <span className="truncate">
                          {tx.description || `${t('transactions.dateLabel', 'Ngày')}: ${tx.date}`}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pl-2">
                    <span
                      className={`text-xs font-bold amount-display ${
                        tx.type === 'income'
                          ? 'text-[var(--color-income)]'
                          : 'text-[var(--color-expense)]'
                      }`}
                    >
                      {tx.type === 'income' ? '+' : '-'}
                      {formatVnd(tx.amountVnd)}
                    </span>
                    <Edit3 className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Bottom Sheet Footer */}
        <div className="shrink-0 p-3 border-t border-[var(--color-border)] pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl bg-[var(--color-bg-subtle)] border border-[var(--color-border)] py-2.5 text-xs font-bold text-[var(--color-text-primary)] hover:bg-[var(--color-border)] cursor-pointer"
          >
            {t('common.cancel', 'Đóng')}
          </button>
        </div>
      </div>
    </div>
  )
}

