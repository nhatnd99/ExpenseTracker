import { useEffect, useState, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { isToday } from 'date-fns'
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Receipt,
  Wallet,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { getTodayString, shiftDate, parseDateString, formatVnd } from '@/services/dateService'
import {
  getTransactionsForDate,
  getCategories,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getExpenseBudgetMeta,
  type ExpenseBudgetMeta,
  type EnrichedTransaction,
} from './transactionService'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type { BudgetCategory } from '@/types/models'
import { useSettings } from '@/context/useSettings'
import { useDynamicBudget } from '@/features/dashboard/hooks/useDynamicBudget'
import { CreateExpenseModal } from './components/CreateExpenseModal'
import { ExpenseItem } from './components/ExpenseItem'

export function TransactionsPage() {
  const { t, i18n } = useTranslation()
  const { payDay } = useSettings()
  const today = useMemo(() => getTodayString(), [])

  // Daily view focus: default state is Today
  const [selectedDate, setSelectedDate] = useState<string>(today)
  const [transactions, setTransactions] = useState<EnrichedTransaction[]>([])
  const [budgetMeta, setBudgetMeta] = useState<ExpenseBudgetMeta | null>(null)
  const [categories, setCategories] = useState<BudgetCategory[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  // Modal states: null = closed; undefined = create new; EnrichedTransaction = edit
  const [activeTransaction, setActiveTransaction] = useState<EnrichedTransaction | null | undefined>(null)
  const isModalOpen = activeTransaction !== null

  // Reload transactions and daily budget meta for the specified date
  const reloadData = useCallback(async (date: string) => {
    try {
      const [txs, meta] = await Promise.all([
        getTransactionsForDate(date),
        getExpenseBudgetMeta(date, payDay, today),
      ])
      setTransactions(txs)
      setBudgetMeta(meta)
    } finally {
      setLoading(false)
    }
  }, [payDay, today])

  const reloadCategories = useCallback(async () => {
    const cats = await getCategories()
    setCategories(cats)
  }, [])

  useEffect(() => {
    let active = true

    async function loadInitial() {
      const [cats, txs, meta] = await Promise.all([
        getCategories(),
        getTransactionsForDate(selectedDate),
        getExpenseBudgetMeta(selectedDate, payDay, today),
      ])
      if (active) {
        setCategories(cats)
        setTransactions(txs)
        setBudgetMeta(meta)
        setLoading(false)
      }
    }

    void loadInitial()

    return () => {
      active = false
    }
  }, [selectedDate, payDay, today])

  // Branching: Check whether viewing today using isToday from date-fns
  const isDateToday = useMemo(() => {
    try {
      return isToday(parseDateString(selectedDate))
    } catch {
      return selectedDate === today
    }
  }, [selectedDate, today])

  // Hook calculating Dynamic Safe-to-Spend identical to Dashboard
  const dynamicBudget = useDynamicBudget({
    cycle: budgetMeta?.currentCycle,
    baseBudget: budgetMeta?.currentBaseBudget,
    transactions: budgetMeta?.cycleTransactions,
    todayStr: today,
  })

  // Dynamic / Static Branching:
  // If isToday: Limit = safeToSpend (dynamicBudget.todayLimit)
  // If not today: Limit = baseDailyLimit (standard static budget)
  const effectiveDailyLimit = useMemo(() => {
    if (isDateToday) {
      return dynamicBudget.todayLimit
    }
    return budgetMeta?.baseDailyLimit ?? 0
  }, [isDateToday, dynamicBudget.todayLimit, budgetMeta?.baseDailyLimit])

  // 1. Total spent on this selected date (EXCLUDING fixed bills / large expenses and excluding income)
  const totalDailySpent = useMemo(() => {
    return transactions
      .filter((tx) => tx.type !== 'income' && !tx.isExcludedFromDaily)
      .reduce((sum, tx) => sum + tx.amountVnd, 0)
  }, [transactions])

  // Total excluded bills on this selected date
  const totalExcludedBillsToday = useMemo(() => {
    return transactions
      .filter((tx) => tx.type !== 'income' && Boolean(tx.isExcludedFromDaily))
      .reduce((sum, tx) => sum + tx.amountVnd, 0)
  }, [transactions])

  // Total income received on this selected date
  const totalDailyIncome = useMemo(() => {
    return transactions
      .filter((tx) => tx.type === 'income')
      .reduce((sum, tx) => sum + tx.amountVnd, 0)
  }, [transactions])

  // 2. Remaining balance: [Hạn mức ngày] - [Tổng chi tiêu sinh hoạt ngày]
  const remainingBalance = useMemo(() => {
    return effectiveDailyLimit - totalDailySpent
  }, [effectiveDailyLimit, totalDailySpent])

  // 3. Visual warning flag: true if user spent more than the daily limit
  const isOverBudget = useMemo(() => {
    if (effectiveDailyLimit <= 0) {
      return totalDailySpent > 0
    }
    return remainingBalance < 0
  }, [effectiveDailyLimit, remainingBalance, totalDailySpent])

  // 4. Percentage of daily budget consumed
  const rawSpentPercent = useMemo(() => {
    if (effectiveDailyLimit <= 0) {
      return totalDailySpent > 0 ? 100 : 0
    }
    return Math.round((totalDailySpent / effectiveDailyLimit) * 100)
  }, [totalDailySpent, effectiveDailyLimit])

  // Bound progress bar at 100% so it never overflows or breaks the UI
  const progressPercent = useMemo(() => {
    return Math.min(100, Math.max(0, rawSpentPercent))
  }, [rawSpentPercent])

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
    isExcludedFromDaily?: boolean
    type?: 'expense' | 'income'
  }) => {
    if (data.id) {
      // Update existing record
      await updateTransaction(data.id, {
        amountVnd: data.amountVnd,
        categoryId: data.categoryId,
        date: data.date,
        description: data.description,
        isExcludedFromDaily: data.isExcludedFromDaily,
        type: data.type,
      })
    } else {
      // Create new record
      await createTransaction({
        amountVnd: data.amountVnd,
        categoryId: data.categoryId,
        date: data.date,
        description: data.description,
        isExcludedFromDaily: data.isExcludedFromDaily,
        type: data.type,
      })
    }
    // Refresh for the currently selected date
    await reloadData(selectedDate)
  }

  const handleDelete = async (id: string) => {
    await deleteTransaction(id)
    await reloadData(selectedDate)
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
      <div className="space-y-4 pb-6 w-full min-w-0 max-w-full">
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
            <div className="relative flex-1 text-center px-1 min-w-0">
              <label htmlFor="daily-date-picker" className="cursor-pointer group flex flex-col items-center justify-center">
                <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-[var(--color-primary)] group-hover:underline truncate max-w-full">
                  <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
                  <span className="capitalize truncate">{formattedDateTitle}</span>
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

        {/* Daily Budget Summary Card (3-Column Layout with Progress Bar) */}
        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-4 sm:p-5 shadow-2xs transition-colors space-y-3.5">
          {/* Card Top: Title & Status Indicator */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[var(--color-text-muted)] text-[11px]">
              <Wallet className="h-4 w-4 text-[var(--color-primary)] shrink-0" />
              <span>{t('transactions.dailyTotal', 'Ngân Sách Ngày')}</span>
            </div>

            {effectiveDailyLimit > 0 || totalDailySpent > 0 ? (
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  isOverBudget
                    ? 'bg-[var(--color-expense-soft)] text-[var(--color-expense)] border border-[var(--color-expense-border)]'
                    : 'bg-[var(--color-income-soft)] text-[var(--color-income)] border border-[var(--color-income-border)]'
                }`}
              >
                {isOverBudget ? (
                  <>
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    <span>{t('transactions.overBudget', 'Vượt Hạn Mức')}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3 w-3 shrink-0" />
                    <span>{t('transactions.onTrack', 'Đúng Kế Hoạch')}</span>
                  </>
                )}
              </span>
            ) : (
              <span className="text-[10px] text-[var(--color-text-muted)] italic">
                {t('transactions.noBudgetSet', 'Chưa Đặt Ngân Sách')}
              </span>
            )}
          </div>

          {/* 3 Columns: Daily Limit | Total Spent | Remaining Balance */}
          <div className="grid grid-cols-3 gap-1 sm:gap-2 divide-x divide-[var(--color-border)] pt-0.5">
            {/* Col 1: Daily Limit (Hạn mức ngày: Safe-to-Spend nếu là Hôm nay, Standard nếu là ngày khác) */}
            <div className="text-center px-1 min-w-0">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] truncate">
                {isDateToday
                  ? t('transactions.safeToSpend', 'Hôm Nay Có Thể Tiêu')
                  : t('transactions.standardDailyLimit', 'Hạn Mức Tiêu Chuẩn')}
              </span>
              <p className="mt-1 text-sm sm:text-base font-extrabold amount-display text-[var(--color-text-primary)] truncate">
                {formatVnd(effectiveDailyLimit)}
              </p>
            </div>

            {/* Col 2: Total Spent (Tổng chi tiêu sinh hoạt ngày) */}
            <div className="text-center px-1 min-w-0">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] truncate">
                {t('transactions.totalSpent', 'Đã Tiêu')}
              </span>
              <p className="mt-1 text-sm sm:text-base font-extrabold amount-display text-[var(--color-expense)] truncate">
                {formatVnd(totalDailySpent)}
              </p>
            </div>

            {/* Col 3: Remaining Balance (Số tiền còn lại) */}
            <div className="text-center px-1 min-w-0">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] truncate">
                {t('transactions.remainingBalance', 'Còn Lại')}
              </span>
              <p
                className={`mt-1 text-sm sm:text-base font-extrabold amount-display truncate ${
                  isOverBudget
                    ? 'text-[var(--color-expense)]'
                    : remainingBalance > 0
                      ? 'text-[var(--color-income)]'
                      : 'text-[var(--color-text-primary)]'
                }`}
              >
                {remainingBalance < 0
                  ? `-${formatVnd(Math.abs(remainingBalance))}`
                  : formatVnd(remainingBalance)}
              </p>
            </div>
          </div>

          {/* Progress Bar (Visual budget burn rate) */}
          {(effectiveDailyLimit > 0 || totalDailySpent > 0) && (
            <div className="space-y-1.5 pt-1 border-t border-[var(--color-border)]">
              <div className="flex items-center justify-between text-[10px] font-semibold text-[var(--color-text-muted)]">
                <span>
                  {isOverBudget || rawSpentPercent > 100
                    ? `100% (${formatVnd(totalDailySpent)})`
                    : t('transactions.spentPercent', {
                        percent: rawSpentPercent,
                        defaultValue: `Đã chi ${rawSpentPercent}%`,
                      })}
                </span>
                <span className={isOverBudget ? 'text-[var(--color-expense)] font-bold' : ''}>
                  {isOverBudget || rawSpentPercent > 100
                    ? t('transactions.overBudget', 'Vượt hạn mức')
                    : `${Math.max(0, 100 - rawSpentPercent)}% ${t('common.remaining', 'còn lại')}`}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-[var(--color-bg-subtle)] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isOverBudget
                      ? 'bg-[var(--color-expense)]'
                      : rawSpentPercent > 85
                        ? 'bg-[var(--color-warning)]'
                        : 'bg-[var(--color-income)]'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Excluded Bills callout if any exist today */}
          {totalExcludedBillsToday > 0 && (
            <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-[var(--color-border)] text-[var(--color-text-muted)]">
              <span className="flex items-center gap-1 font-medium">
                <Receipt className="h-3.5 w-3.5 text-[var(--color-primary)] shrink-0" />
                <span>{t('transactions.billsToday', 'Hóa đơn đã đóng hôm nay')}:</span>
              </span>
              <span className="font-bold text-[var(--color-primary)] amount-display">
                {formatVnd(totalExcludedBillsToday)}
              </span>
            </div>
          )}

          {/* Extra Income callout if any received today */}
          {totalDailyIncome > 0 && (
            <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-[var(--color-border)] text-[var(--color-text-muted)]">
              <span className="flex items-center gap-1 font-medium">
                <Wallet className="h-3.5 w-3.5 text-[var(--color-income)] shrink-0" />
                <span>{t('transactions.incomeToday', 'Thu nhập nhận được hôm nay')}:</span>
              </span>
              <span className="font-bold text-[var(--color-income)] amount-display">
                +{formatVnd(totalDailyIncome)}
              </span>
            </div>
          )}
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
              <ExpenseItem
                key={tx.id}
                expense={tx}
                onClick={setActiveTransaction}
              />
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
