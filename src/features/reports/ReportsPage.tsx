import { useEffect, useState, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Calendar,
  Wallet,
  CheckCircle2,
  AlertTriangle,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Receipt,
  Edit3,
  X,
} from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { getTodayString, parseDateString, formatVnd } from '@/services/dateService'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useSettings } from '@/context/useSettings'
import {
  getCategories,
  updateTransaction,
  deleteTransaction,
  type EnrichedTransaction,
} from '@/features/transactions/transactionService'
import { CreateExpenseModal } from '@/features/transactions/components/CreateExpenseModal'
import type { BudgetCategory, DateString } from '@/types/models'
import { getCycleReportData, type CycleReportData } from './reportService'
import {
  formatCompactVnd,
  getDayOfWeekOffset,
  getCycleMonthForDate,
  shiftMonthId,
} from './paydayCycle'

export function ReportsPage() {
  const { t, i18n } = useTranslation()
  const todayStr = useMemo(() => getTodayString(), [])
  const { payDay } = useSettings()

  // Default view: automatically determine the cycle month containing today
  const currentCycleMonth = useMemo(() => {
    return getCycleMonthForDate(todayStr, payDay)
  }, [todayStr, payDay])

  const [selectedMonth, setSelectedMonth] = useState<string>(currentCycleMonth)
  const [data, setData] = useState<CycleReportData | null>(null)
  const [categories, setCategories] = useState<BudgetCategory[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  // Interactive selection states:
  // 1. Day details modal (displays records for selected date)
  const [selectedDateForDetails, setSelectedDateForDetails] = useState<DateString | null>(null)
  // 2. Transaction edit modal (editing a specific expense)
  const [editingTransaction, setEditingTransaction] = useState<EnrichedTransaction | null>(null)

  // Reload report data for the selected cycle month
  const reloadCycleData = useCallback(async (month: string, pDay: number) => {
    try {
      const [result, cats] = await Promise.all([
        getCycleReportData(month, pDay, todayStr),
        getCategories(),
      ])
      setData(result)
      setCategories(cats)
    } finally {
      setLoading(false)
    }
  }, [todayStr])

  useEffect(() => {
    let active = true

    async function loadData() {
      try {
        const [result, cats] = await Promise.all([
          getCycleReportData(selectedMonth, payDay, todayStr),
          getCategories(),
        ])
        if (active) {
          setData(result)
          setCategories(cats)
          setLoading(false)
        }
      } catch {
        if (active) setLoading(false)
      }
    }

    void loadData()

    return () => {
      active = false
    }
  }, [selectedMonth, payDay, todayStr])

  // Weekday column headers (Monday to Sunday)
  const weekdayNames = useMemo(() => {
    if (i18n.language === 'vi') {
      return ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
    }
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  }, [i18n.language])

  // Number of empty padding cells before cycle start date
  const startDayOffset = useMemo(() => {
    if (!data) return 0
    return getDayOfWeekOffset(data.cycle.startDate)
  }, [data])

  // Formatted date range label (e.g. "19/10/2026 – 18/11/2026")
  const formattedCycleRange = useMemo(() => {
    if (!data) return ''
    const [sy, sm, sd] = data.cycle.startDate.split('-')
    const [ey, em, ed] = data.cycle.endDate.split('-')
    return `${sd}/${sm}/${sy} – ${ed}/${em}/${ey}`
  }, [data])

  const handlePrevCycle = () => {
    setSelectedMonth((prev) => shiftMonthId(prev, -1))
  }

  const handleNextCycle = () => {
    setSelectedMonth((prev) => shiftMonthId(prev, 1))
  }

  const handleJumpToCurrentCycle = () => {
    setSelectedMonth(currentCycleMonth)
  }

  // Transactions list for the selected day in the details sheet
  const selectedDayTransactions = useMemo(() => {
    if (!data || !selectedDateForDetails) return []
    return data.transactions.filter((tx) => tx.date === selectedDateForDetails)
  }, [data, selectedDateForDetails])

  // Total spent on the selected day
  const selectedDayTotalSpent = useMemo(() => {
    return selectedDayTransactions.reduce((sum, tx) => sum + tx.amountVnd, 0)
  }, [selectedDayTransactions])

  // Formatted label for selected day header (e.g. "31/10/2026")
  const formattedSelectedDay = useMemo(() => {
    if (!selectedDateForDetails) return ''
    const localeCode = i18n.language === 'vi' ? 'vi-VN' : 'en-US'
    return new Intl.DateTimeFormat(localeCode, {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(parseDateString(selectedDateForDetails))
  }, [selectedDateForDetails, i18n.language])

  // Save changes to an existing expense transaction
  const handleUpdateExpense = async (formData: {
    id?: string
    amountVnd: number
    categoryId: string
    date: string
    description?: string
  }) => {
    if (!formData.id) return

    await updateTransaction(formData.id, {
      amountVnd: formData.amountVnd,
      categoryId: formData.categoryId,
      date: formData.date,
      description: formData.description,
    })

    // Immediately reload report data to update grid, summary, and totals
    await reloadCycleData(selectedMonth, payDay)
    setEditingTransaction(null)
  }

  // Delete an existing transaction
  const handleDeleteExpense = async (id: string) => {
    await deleteTransaction(id)
    await reloadCycleData(selectedMonth, payDay)
    setEditingTransaction(null)
  }

  return (
    <PageContainer title={t('reports.title', 'Báo Cáo Chi Tiêu Chu Kỳ')}>
      <div className="space-y-4 pb-6 w-full min-w-0 max-w-full">
        {/* Header: Cycle Switcher & Range Display */}
        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-3.5 sm:p-4 shadow-2xs transition-colors space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            {/* Prev Cycle Button */}
            <button
              type="button"
              onClick={handlePrevCycle}
              aria-label="Chu kỳ trước"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] active:scale-95 transition-all cursor-pointer"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            {/* Center Info: Cycle range & Month picker trigger */}
            <div className="relative flex-1 text-center px-1 min-w-0">
              <label htmlFor="cycle-month-picker" className="cursor-pointer group flex flex-col items-center justify-center">
                <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-[var(--color-primary)] group-hover:underline truncate max-w-full">
                  <CalendarRange className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{formattedCycleRange || selectedMonth}</span>
                </div>
                <span className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                  {payDay === 1
                    ? t('reports.payDaySetting', 'Bắt đầu ngày 01')
                    : `${t('reports.payDaySetting', 'Ngày bắt đầu')}: ${payDay}`}
                  {data ? ` • ${data.cycle.totalDays} ${t('common.days', 'ngày')}` : ''}
                </span>
              </label>
              <input
                id="cycle-month-picker"
                type="month"
                value={selectedMonth}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedMonth(e.target.value)
                  }
                }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full text-base"
                title={t('reports.reportMonth', 'Chọn tháng chu kỳ')}
              />
            </div>

            {/* Next Cycle Button */}
            <button
              type="button"
              onClick={handleNextCycle}
              aria-label="Chu kỳ sau"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] active:scale-95 transition-all cursor-pointer"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Jump to Current Cycle Button if browsing past/future */}
          {selectedMonth !== currentCycleMonth && (
            <div className="pt-2 border-t border-[var(--color-border)] flex justify-center">
              <button
                type="button"
                onClick={handleJumpToCurrentCycle}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--color-primary-soft)] text-[var(--color-primary)] hover:opacity-85 transition-opacity cursor-pointer"
              >
                <span>{t('transactions.today', 'Hôm nay')} • {t('reports.currentCycle', 'Chu kỳ hiện tại')}</span>
              </button>
            </div>
          )}
        </div>

        {loading || !data ? (
          <div className="py-16 flex justify-center">
            <LoadingSpinner label={t('common.loading', 'Đang tải…')} />
          </div>
        ) : (
          <>
            {/* 1. Summary & Progress Status Board */}
            <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-4 sm:p-5 shadow-2xs space-y-3.5 transition-colors">
              {/* Header: Title & Progress Badge */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[var(--color-text-muted)] text-[11px]">
                  <Wallet className="h-4 w-4 text-[var(--color-primary)] shrink-0" />
                  <span>{t('reports.paydayCycle', 'Tổng Quan Chu Kỳ')}</span>
                </div>

                {data.progress.budgetVnd > 0 ? (
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      data.progress.isOnTrack
                        ? 'bg-[var(--color-income-soft)] text-[var(--color-income)] border border-[var(--color-income-border)]'
                        : 'bg-[var(--color-expense-soft)] text-[var(--color-expense)] border border-[var(--color-expense-border)]'
                    }`}
                  >
                    {data.progress.isOnTrack ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                        <span>{t('reports.onTrack', 'Đúng Tiến Độ')}</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        <span>{t('reports.offTrack', 'Vượt Tiến Độ')}</span>
                      </>
                    )}
                  </span>
                ) : (
                  <span className="text-[10px] text-[var(--color-text-muted)] italic">
                    {t('transactions.noBudgetSet', 'Chưa Đặt Ngân Sách')}
                  </span>
                )}
              </div>

              {/* 3-Column Stats: Budget | Total Spent | Remaining */}
              <div className="grid grid-cols-3 gap-1 sm:gap-2 divide-x divide-[var(--color-border)] pt-1">
                {/* Column 1: Budget */}
                <div className="text-center px-1 min-w-0">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] truncate">
                    {t('reports.budget', 'Hạn Mức')}
                  </span>
                  <p className="mt-1 text-sm sm:text-base font-extrabold amount-display text-[var(--color-text-primary)] truncate">
                    {formatVnd(data.progress.budgetVnd)}
                  </p>
                </div>

                {/* Column 2: Total Spent */}
                <div className="text-center px-1 min-w-0">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] truncate">
                    {t('reports.totalSpent', 'Đã Chi')}
                  </span>
                  <p className="mt-1 text-sm sm:text-base font-extrabold amount-display text-[var(--color-expense)] truncate">
                    {formatVnd(data.progress.totalSpentVnd)}
                  </p>
                </div>

                {/* Column 3: Remaining */}
                <div className="text-center px-1 min-w-0">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] truncate">
                    {t('reports.remaining', 'Còn Lại')}
                  </span>
                  <p
                    className={`mt-1 text-sm sm:text-base font-extrabold amount-display truncate ${
                      data.progress.remainingVnd < 0
                        ? 'text-[var(--color-expense)]'
                        : data.progress.remainingVnd > 0
                          ? 'text-[var(--color-income)]'
                          : 'text-[var(--color-text-primary)]'
                    }`}
                  >
                    {data.progress.remainingVnd < 0
                      ? `-${formatVnd(Math.abs(data.progress.remainingVnd))}`
                      : formatVnd(data.progress.remainingVnd)}
                  </p>
                </div>
              </div>

              {/* Progress Bar & Rate Info */}
              {data.progress.budgetVnd > 0 && (
                <div className="space-y-1.5 pt-1.5 border-t border-[var(--color-border)]">
                  <div className="flex items-center justify-between text-[10px] font-semibold text-[var(--color-text-muted)]">
                    <span>
                      {t('reports.elapsedProgress', {
                        elapsed: data.progress.elapsedDays,
                        total: data.progress.totalDays,
                        defaultValue: `Ngày ${data.progress.elapsedDays} / ${data.progress.totalDays}`,
                      })}
                    </span>
                    <span>
                      {t('reports.dailyBudget', 'Hạn mức/ngày')}: {formatVnd(data.progress.dailyBudgetVnd)}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[var(--color-bg-subtle)] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        !data.progress.isOnTrack
                          ? 'bg-[var(--color-expense)]'
                          : data.progress.spentPercent > 80
                            ? 'bg-[var(--color-warning)]'
                            : 'bg-[var(--color-income)]'
                      }`}
                      style={{
                        width: `${Math.min(100, Math.max(0, data.progress.spentPercent))}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 2. Interactive Calendar Grid View */}
            <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-3 sm:p-4 shadow-2xs space-y-3 transition-colors">
              <div className="flex items-center justify-between px-1">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-[var(--color-primary)] shrink-0" />
                    <span>{t('reports.calendarTitle', 'Lịch Chi Tiêu Chu Kỳ')}</span>
                  </h3>
                  <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                    {t('reports.tapDayToView', 'Chạm vào ô ngày để xem & sửa chi tiêu')}
                  </p>
                </div>
                <span className="text-[10px] text-[var(--color-text-muted)] font-medium">
                  {weekdayNames[0]} – {weekdayNames[6]}
                </span>
              </div>

              {/* Weekday Header Labels */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {weekdayNames.map((wd, i) => (
                  <div
                    key={wd}
                    className={`py-1 text-[11px] font-bold rounded-lg ${
                      i >= 5
                        ? 'text-[var(--color-warning)]'
                        : 'text-[var(--color-text-muted)]'
                    }`}
                  >
                    {wd}
                  </div>
                ))}
              </div>

              {/* Day Cells Grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Empty slots for week alignment */}
                {Array.from({ length: startDayOffset }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="min-h-[58px] sm:min-h-[66px] rounded-2xl bg-[var(--color-bg-subtle)]/40 border border-transparent"
                  />
                ))}

                {/* Daily Item Cells - Interactive with onClick */}
                {data.dailyItems.map((day) => {
                  const hasSpent = day.spentVnd > 0
                  const isPositiveBalance = day.balanceVnd >= 0
                  const isSelected = selectedDateForDetails === day.date

                  return (
                    <button
                      key={day.date}
                      type="button"
                      onClick={() => setSelectedDateForDetails(day.date)}
                      className={`flex flex-col justify-between p-1 rounded-2xl border transition-all min-h-[58px] sm:min-h-[66px] overflow-hidden min-w-0 cursor-pointer active:scale-95 text-left ${
                        isSelected
                          ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)] bg-[var(--color-primary-soft)]'
                          : day.isToday
                            ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/30 bg-[var(--color-primary-soft)]/50'
                            : day.isFuture
                              ? 'border-[var(--color-border)] bg-[var(--color-bg-surface)] opacity-55 hover:border-[var(--color-primary)]'
                              : 'border-[var(--color-border)] bg-[var(--color-bg-surface)] hover:border-[var(--color-primary)] hover:bg-[var(--color-bg-subtle)]'
                      }`}
                    >
                      {/* Top: Day number */}
                      <div className="flex items-center justify-between w-full leading-none">
                        <span
                          className={`text-[10px] sm:text-xs font-bold leading-none ${
                            day.isToday
                              ? 'text-[var(--color-primary)]'
                              : 'text-[var(--color-text-primary)]'
                          }`}
                        >
                          {day.dayNumber}
                        </span>
                        {day.isToday && (
                          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
                        )}
                      </div>

                      {/* Middle: Spent amount */}
                      <div className="text-center my-0.5 min-w-0 w-full">
                        {hasSpent ? (
                          <span className="block text-[10px] font-extrabold amount-display text-[var(--color-expense)] truncate leading-none">
                            -{formatCompactVnd(day.spentVnd)}
                          </span>
                        ) : (
                          <span className="block text-[9px] text-[var(--color-text-muted)] leading-none">
                            -
                          </span>
                        )}
                      </div>

                      {/* Bottom: Daily balance */}
                      <div className="text-center min-w-0 w-full">
                        {data.progress.budgetVnd > 0 ? (
                          <span
                            className={`block text-[9px] font-semibold amount-display truncate leading-none ${
                              isPositiveBalance
                                ? 'text-[var(--color-income)]'
                                : 'text-[var(--color-expense)] font-bold'
                            }`}
                          >
                            {isPositiveBalance
                              ? `+${formatCompactVnd(day.balanceVnd)}`
                              : `-${formatCompactVnd(Math.abs(day.balanceVnd))}`}
                          </span>
                        ) : (
                          <span className="block text-[8px] text-[var(--color-text-muted)] truncate leading-none">
                            {day.date.slice(5)}
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-4 pt-2 text-[10px] font-medium text-[var(--color-text-muted)] border-t border-[var(--color-border)]">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[var(--color-expense)]" />
                  <span>{t('reports.spent', 'Đã chi')} (-k)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[var(--color-income)]" />
                  <span>{t('reports.balance', 'Số dư')} (+k)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[var(--color-primary)]" />
                  <span>{t('transactions.today', 'Hôm nay')}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Day Details Bottom Sheet Modal */}
      {selectedDateForDetails && (
        <div className="fixed inset-0 z-40 flex flex-col justify-end bg-black/60 backdrop-blur-xs overflow-hidden">
          <div className="w-full max-w-lg mx-auto rounded-t-3xl border-t border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-2xl flex flex-col max-h-[85dvh] h-auto overflow-hidden animate-in fade-in-0 slide-in-from-bottom duration-200">
            {/* Header - Fixed */}
            <div className="shrink-0 flex items-center justify-between px-5 pt-4 pb-3 border-b border-[var(--color-border)]">
              <div>
                <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                  {t('reports.dayDetailsTitle', 'Chi Tiêu Ngày')} {formattedSelectedDay}
                </h3>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  {t('reports.dayTotalSpent', 'Tổng chi trong ngày')}:{' '}
                  <span className="font-extrabold text-[var(--color-expense)] amount-display">
                    {formatVnd(selectedDayTotalSpent)}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDateForDetails(null)}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)] cursor-pointer"
                aria-label={t('common.cancel', 'Đóng')}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content List of Transactions on Selected Day */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-2 overscroll-y-contain">
              {selectedDayTransactions.length === 0 ? (
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
                        count: selectedDayTransactions.length,
                        defaultValue: `Khoản chi (${selectedDayTransactions.length})`,
                      })}
                    </span>
                    <span>{t('transactions.tapToEdit', 'Chạm để xem & sửa')}</span>
                  </div>

                  {selectedDayTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      onClick={() => setEditingTransaction(tx)}
                      className="flex items-center justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-3 hover:border-[var(--color-primary)] active:scale-[0.99] cursor-pointer transition-all shadow-2xs"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          setEditingTransaction(tx)
                        }
                      }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-bg-subtle)] text-lg shrink-0">
                          {tx.categoryIcon}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[var(--color-text-primary)] truncate">
                            {tx.categoryName}
                          </p>
                          <p className="text-[11px] text-[var(--color-text-muted)] truncate">
                            {tx.description || `${t('transactions.dateLabel', 'Ngày')}: ${tx.date}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 pl-2">
                        <span className="text-xs font-bold text-[var(--color-expense)] amount-display">
                          -{formatVnd(tx.amountVnd)}
                        </span>
                        <Edit3 className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Bottom Sheet Footer */}
            <div className="shrink-0 p-3 border-t border-[var(--color-border)] pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)]">
              <button
                type="button"
                onClick={() => setSelectedDateForDetails(null)}
                className="w-full rounded-2xl bg-[var(--color-bg-subtle)] border border-[var(--color-border)] py-2.5 text-xs font-bold text-[var(--color-text-primary)] hover:bg-[var(--color-border)] cursor-pointer"
              >
                {t('common.cancel', 'Đóng')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expense Edit Modal */}
      {editingTransaction && (
        <CreateExpenseModal
          key={editingTransaction.id}
          isOpen={Boolean(editingTransaction)}
          onClose={() => setEditingTransaction(null)}
          categories={categories}
          onCategoriesChanged={() => void reloadCycleData(selectedMonth, payDay)}
          initialDate={editingTransaction.date}
          initialTransaction={editingTransaction}
          onSubmit={handleUpdateExpense}
          onDelete={handleDeleteExpense}
        />
      )}
    </PageContainer>
  )
}
