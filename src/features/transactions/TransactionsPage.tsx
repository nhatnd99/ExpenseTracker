import { useEffect, useState, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Receipt, Edit3 } from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { getTodayString, shiftDate, parseDateString, formatVnd } from '@/services/dateService'
import {
  getTransactionsForDate,
  getCategories,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  type EnrichedTransaction,
} from './transactionService'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type { BudgetCategory } from '@/types/models'
import { CreateExpenseModal } from './components/CreateExpenseModal'

export function TransactionsPage() {
  const { t, i18n } = useTranslation()
  const today = useMemo(() => getTodayString(), [])
  
  // Daily view focus: default state is Today
  const [selectedDate, setSelectedDate] = useState<string>(today)
  const [transactions, setTransactions] = useState<EnrichedTransaction[]>([])
  const [categories, setCategories] = useState<BudgetCategory[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  
  // Modal states: null = closed; undefined = create new; EnrichedTransaction = edit
  const [activeTransaction, setActiveTransaction] = useState<EnrichedTransaction | null | undefined>(null)
  const isModalOpen = activeTransaction !== null

  // Reload transactions for the current selectedDate
  const reloadTransactions = useCallback(async (date: string) => {
    try {
      const data = await getTransactionsForDate(date)
      setTransactions(data)
    } finally {
      setLoading(false)
    }
  }, [])

  const reloadCategories = useCallback(async () => {
    const cats = await getCategories()
    setCategories(cats)
  }, [])

  useEffect(() => {
    let active = true

    async function loadData() {
      const [cats, txs] = await Promise.all([
        getCategories(),
        getTransactionsForDate(selectedDate),
      ])
      if (active) {
        setCategories(cats)
        setTransactions(txs)
        setLoading(false)
      }
    }

    void loadData()

    return () => {
      active = false
    }
  }, [selectedDate])

  // Total spent on this selected date
  const dailyTotal = useMemo(() => {
    return transactions.reduce((sum, tx) => sum + tx.amountVnd, 0)
  }, [transactions])

  // Date navigation handlers
  const handlePrevDay = () => {
    setSelectedDate((prev) => shiftDate(prev, -1))
  }

  const handleNextDay = () => {
    setSelectedDate((prev) => shiftDate(prev, 1))
  }

  const handleJumpToToday = () => {
    setSelectedDate(today)
  }

  // Handle Create or Update from the modal
  const handleModalSubmit = async (data: {
    id?: string
    amountVnd: number
    categoryId: string
    date: string
    description?: string
  }) => {
    if (data.id) {
      // Update existing record
      await updateTransaction(data.id, {
        amountVnd: data.amountVnd,
        categoryId: data.categoryId,
        date: data.date,
        description: data.description,
      })
    } else {
      // Create new record
      await createTransaction({
        amountVnd: data.amountVnd,
        categoryId: data.categoryId,
        date: data.date,
        description: data.description,
      })
    }
    // Refresh for the currently selected date or the date that was saved
    await reloadTransactions(selectedDate)
  }

  const handleDelete = async (id: string) => {
    await deleteTransaction(id)
    await reloadTransactions(selectedDate)
  }

  // Formatted date string for human-readable display
  const formattedDateTitle = useMemo(() => {
    const isToday = selectedDate === today
    const yesterday = shiftDate(today, -1)
    const isYesterday = selectedDate === yesterday
    const localeCode = i18n.language === 'vi' ? 'vi-VN' : 'en-US'

    if (isToday) {
      return `${t('transactions.today', 'Hôm nay')} • ${new Intl.DateTimeFormat(localeCode, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(parseDateString(selectedDate))}`
    }

    if (isYesterday) {
      return `${t('transactions.yesterday', 'Hôm qua')} • ${new Intl.DateTimeFormat(localeCode, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(parseDateString(selectedDate))}`
    }

    return new Intl.DateTimeFormat(localeCode, {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(parseDateString(selectedDate))
  }, [selectedDate, today, i18n.language, t])

  return (
    <PageContainer title={t('transactions.dailyExpenses', 'Chi Tiêu Theo Ngày')}>
      <div className="space-y-4 pb-20">
        {/* Date Selector Navigation Bar */}
        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-3.5 shadow-2xs transition-colors">
          <div className="flex items-center justify-between gap-2">
            {/* Prev Day button */}
            <button
              type="button"
              onClick={handlePrevDay}
              aria-label={t('transactions.prevDay', 'Ngày trước')}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] active:scale-95 transition-all cursor-pointer"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            {/* Date Center Info & Native Date Picker Trigger */}
            <div className="relative flex-1 text-center px-1">
              <label htmlFor="daily-date-picker" className="cursor-pointer group flex flex-col items-center justify-center">
                <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-[var(--color-primary)] group-hover:underline">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  <span className="capitalize">{formattedDateTitle}</span>
                </div>
                <span className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                  {selectedDate}
                </span>
              </label>
              <input
                id="daily-date-picker"
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedDate(e.target.value)
                  }
                }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full text-base"
                title={t('transactions.selectDate', 'Chọn ngày')}
              />
            </div>

            {/* Next Day button */}
            <button
              type="button"
              onClick={handleNextDay}
              aria-label={t('transactions.nextDay', 'Ngày sau')}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] active:scale-95 transition-all cursor-pointer"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Jump to Today button (only shown when viewing a past or future date) */}
          {selectedDate !== today && (
            <div className="mt-2.5 pt-2 border-t border-[var(--color-border)] flex justify-center">
              <button
                type="button"
                onClick={handleJumpToToday}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--color-primary-soft)] text-[var(--color-primary)] hover:opacity-85 transition-opacity cursor-pointer"
              >
                <span>{t('transactions.today', 'Hôm nay')} ({today})</span>
              </button>
            </div>
          )}
        </div>

        {/* Daily Summary Card */}
        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
              {t('transactions.dailyTotal', 'Chi tiêu trong ngày')}
            </span>
            <p className="mt-1 text-2xl sm:text-3xl font-extrabold amount-display text-[var(--color-expense)] tracking-tight">
              {formatVnd(dailyTotal)}
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-expense-soft)] text-[var(--color-expense)]">
            <Receipt className="h-6 w-6" />
          </div>
        </div>

        {/* Add Transaction Button */}
        <button
          type="button"
          onClick={() => setActiveTransaction(undefined)}
          className="w-full rounded-2xl bg-[var(--color-primary)] px-5 py-3.5 text-center text-sm font-bold text-white shadow-md transition-all hover:bg-[var(--color-primary-hover)] active:scale-[0.99] touch-target cursor-pointer flex items-center justify-center gap-2"
        >
          <Plus className="h-5 w-5 stroke-[2.5]" />
          <span>{t('transactions.addExpenseBtn', 'Ghi Khoản Chi Mới')}</span>
        </button>

        {/* Transaction List for Selected Date */}
        {loading ? (
          <div className="py-16 flex justify-center">
            <LoadingSpinner label={t('common.loading', 'Đang tải…')} />
          </div>
        ) : transactions.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg-surface)] p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)]">
              <Receipt className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm font-bold text-[var(--color-text-primary)]">
              {t('transactions.noTransactionsForDay', 'Chưa có khoản chi nào trong ngày này')}
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)] max-w-xs mx-auto">
              {t('transactions.noTransactionsForDayDesc', 'Nhấn "Ghi Khoản Chi Mới" để bắt đầu theo dõi chi tiêu cho ngày này.')}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                {t('transactions.expensesListTitle', { count: transactions.length, defaultValue: `Khoản Chi (${transactions.length})` })}
              </p>
              <span className="text-[11px] text-[var(--color-text-muted)]">
                {t('transactions.tapToEdit', 'Chạm để xem & sửa')}
              </span>
            </div>

            {transactions.map((tx) => (
              <div
                key={tx.id}
                onClick={() => setActiveTransaction(tx)}
                className="flex items-center justify-between rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-4 shadow-2xs transition-all hover:border-[var(--color-primary)] active:scale-[0.99] cursor-pointer"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setActiveTransaction(tx)
                  }
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-bg-subtle)] text-xl shadow-2xs">
                    {tx.categoryIcon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[var(--color-text-primary)] truncate">
                      {tx.categoryName}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)] truncate">
                      {tx.description ? tx.description : t('transactions.dateLabel', 'Ngày') + `: ${tx.date}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 pl-2">
                  <span className="text-sm font-bold text-[var(--color-expense)] amount-display">
                    -{formatVnd(tx.amountVnd)}
                  </span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-primary)]">
                    <Edit3 className="h-3.5 w-3.5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mobile-first Create & Update Expense Modal */}
      {isModalOpen && (
        <CreateExpenseModal
          key={activeTransaction ? activeTransaction.id : `create-${selectedDate}`}
          isOpen={isModalOpen}
          onClose={() => setActiveTransaction(null)}
          categories={categories}
          onCategoriesChanged={reloadCategories}
          initialDate={selectedDate}
          initialTransaction={activeTransaction ?? null}
          onSubmit={handleModalSubmit}
          onDelete={handleDelete}
        />
      )}
    </PageContainer>
  )
}
