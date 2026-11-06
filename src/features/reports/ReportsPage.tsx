import { useEffect, useState, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { isBefore, isSameDay, isAfter } from 'date-fns'
import {
  Calendar,
  Wallet,
  CheckCircle2,
  AlertTriangle,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { getTodayString, parseDateString, formatVnd } from '@/services/dateService'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useSettings } from '@/context/useSettings'
import { useDynamicBudget } from '@/features/dashboard/hooks/useDynamicBudget'
import {
  getCategories,
  updateTransaction,
  deleteTransaction,
  type EnrichedTransaction,
} from '@/features/transactions/transactionService'
import { CreateExpenseModal } from '@/features/transactions/components/CreateExpenseModal'
import type { BudgetCategory, DateString } from '@/types/models'
import { getCycleReportData, type CycleReportData } from './reportService'
import { getDailyLimitSnapshots } from './snapshotService'
import {
  formatCompactVnd,
  getDayOfWeekOffset,
  getCycleMonthForDate,
  shiftMonthId,
} from './paydayCycle'
import type { CalendarDayData } from './types'
import { DayDetailModal } from './components/DayDetailModal'

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
  // 1. Selected date for day details modal
  const [selectedDate, setSelectedDate] = useState<DateString | null>(null)
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

  // Dynamic Safe-to-Spend hook calculating reactive safeToSpend
  const dynamicBudget = useDynamicBudget({
    cycle: data?.cycle,
    baseBudget: data?.progress.budgetVnd,
    transactions: data?.transactions,
    todayStr,
  })
  const safeToSpend = dynamicBudget.todayLimit
  const baseDailyLimit = data?.baseDailyLimit ?? (data?.cycle.totalDays ? Math.round(data.progress.budgetVnd / data.cycle.totalDays) : 0)
  const benchmarkLimit = data?.averageActiveLimit ?? baseDailyLimit
  // Average daily spend warning: safe if within benchmark or if no active spending days in past (Edge Case)
  const isAverageSafe = Boolean(
    data && (data.activeSpendingDays === 0 || data.averageDailySpend <= benchmarkLimit)
  )

  // 3-State Time Logic Calendar Grid with Daily Limit Snapshots:
  // - Bước 1: Kiểm tra xem ngày đó đã có Hạn mức Snapshot được lưu chưa.
  // - Bước 2: Nếu ĐÃ CÓ snapshot, sử dụng giá trị snapshot đó làm Hạn mức (Limit) cho ngày đó.
  // - Bước 3: Nếu CHƯA CÓ snapshot (ngày hôm nay chưa kết thúc, hoặc ngày tương lai), tính bằng Flex Budget (safeToSpend).
  const calendarDays: CalendarDayData[] = useMemo(() => {
    if (!data) return []
    const todayDateObj = parseDateString(todayStr)
    const snapshots = data.dailyLimitSnapshots ?? getDailyLimitSnapshots()

    return data.cycle.days.map((date) => {
      const dayNumber = parseInt(date.slice(8), 10)
      const cellDateObj = parseDateString(date)

      // Group spent strictly excluding fixed bills (isExcludedFromDaily) and income
      const spent = data.dailySpentMap[date] || 0

      const isPast = isBefore(cellDateObj, todayDateObj)
      const isToday = isSameDay(cellDateObj, todayDateObj)
      const isFuture = isAfter(cellDateObj, todayDateObj)

      // Bước 1: Kiểm tra xem ngày đó đã có Hạn mức Snapshot được lưu chưa
      const snapshotLimit = snapshots[date]

      let limit: number
      let balance: number

      if (snapshotLimit !== undefined) {
        // Bước 2: Nếu ĐÃ CÓ snapshot, sử dụng giá trị snapshot đó làm Hạn mức cho ngày đó
        limit = snapshotLimit
        balance = limit - spent
      } else {
        // Bước 3: Nếu CHƯA CÓ snapshot (ví dụ: ngày hôm nay chưa kết thúc, hoặc ngày tương lai), tính theo Flex Budget
        limit = safeToSpend
        balance = isFuture ? limit : limit - spent
      }

      return {
        date,
        dayNumber,
        limit,
        spent,
        balance,
        isToday,
        isPast,
        isFuture,
      }
    })
  }, [data, todayStr, safeToSpend])

  // Single Source of Truth: derive selected day's calculated data directly from calendarDays
  const selectedDayData = useMemo(() => {
    if (!selectedDate) return null
    return calendarDays.find((d) => d.date === selectedDate) ?? null
  }, [calendarDays, selectedDate])

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
              aria-label={t('reports.prevCycle', 'Chu kỳ trước')}
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
              aria-label={t('reports.nextCycle', 'Chu kỳ sau')}
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
              <div className="grid grid-cols-3 gap-1 divide-x divide-[var(--color-border)] pt-1">
                {/* Column 1: Budget */}
                <div className="text-center px-1 min-w-0">
                  <span className="block text-[10px] sm:text-xs font-bold uppercase tracking-tighter text-[var(--color-text-muted)] leading-tight whitespace-normal">
                    {t('reports.budget', 'Hạn Mức')}
                  </span>
                  <p className="mt-1 text-xs sm:text-base font-extrabold amount-display text-[var(--color-text-primary)] leading-tight whitespace-normal break-all sm:break-normal">
                    {formatVnd(data.progress.budgetVnd)}
                  </p>
                </div>

                {/* Column 2: Total Spent */}
                <div className="text-center px-1 min-w-0">
                  <span className="block text-[10px] sm:text-xs font-bold uppercase tracking-tighter text-[var(--color-text-muted)] leading-tight whitespace-normal">
                    {t('reports.totalSpent', 'Đã Chi')}
                  </span>
                  <p className="mt-1 text-xs sm:text-base font-extrabold amount-display text-[var(--color-expense)] leading-tight whitespace-normal break-all sm:break-normal">
                    {formatVnd(data.progress.totalSpentVnd)}
                  </p>
                </div>

                {/* Column 3: Remaining */}
                <div className="text-center px-1 min-w-0">
                  <span className="block text-[10px] sm:text-xs font-bold uppercase tracking-tighter text-[var(--color-text-muted)] leading-tight whitespace-normal">
                    {t('reports.remaining', 'Còn Lại')}
                  </span>
                  <p
                    className={`mt-1 text-xs sm:text-base font-extrabold amount-display leading-tight whitespace-normal break-all sm:break-normal ${
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
              {/* Average Daily Spend Stat with Dynamic Warning Color */}
              <div className="pt-2 border-t border-[var(--color-border)] flex items-center justify-between text-xs">
                <span className="text-[11px] font-semibold text-[var(--color-text-muted)] flex items-center gap-1.5 min-w-0">
                  {isAverageSafe ? (
                    <TrendingDown className="h-3.5 w-3.5 text-green-500 dark:text-green-400 shrink-0" />
                  ) : (
                    <TrendingUp className="h-3.5 w-3.5 text-red-500 dark:text-red-400 shrink-0" />
                  )}
                  <span className="truncate">{t('reports.averageDailySpend', 'Trung bình chi tiêu ngày')}:</span>
                </span>
                <span
                  className={`text-xs sm:text-sm font-extrabold amount-display shrink-0 pl-2 ${
                    isAverageSafe
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {formatVnd(data.averageDailySpend)}
                  <span className="text-[10px] sm:text-xs font-semibold text-[var(--color-text-muted)] ml-1">
                    {t('reports.perDay', '/ngày')}
                  </span>
                </span>
              </div>
            </div>

            {/* 2. Interactive Calendar Grid View */}
            <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-3 sm:p-4 shadow-2xs space-y-3 transition-colors">
              <div className="flex items-center justify-between px-1">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-[var(--color-primary)] shrink-0" />
                    <span>{t('reports.calendarTitle', 'Lịch Chi Tiêu Chu Kỳ')}</span>
                  </h3>
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
              <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                {/* Empty slots for week alignment */}
                {Array.from({ length: startDayOffset }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="min-h-[62px] sm:min-h-[70px] rounded-2xl bg-[var(--color-bg-subtle)]/30 border border-transparent"
                  />
                ))}

                {/* Daily Item Cells - Interactive with onClick */}
                {calendarDays.map((day) => {
                  const hasSpent = day.spent > 0
                  const isPositiveBalance = day.balance >= 0
                  const isSelected = selectedDate === day.date

                  const cellClasses = isSelected
                    ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)] bg-[var(--color-primary-soft)]'
                    : day.isToday
                      ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/40 bg-[var(--color-primary-soft)]/60 dark:bg-blue-900/25 shadow-2xs'
                      : day.isFuture
                        ? 'border-[var(--color-border)]/70 bg-[var(--color-bg-surface)] hover:border-[var(--color-primary)]'
                        : 'border-[var(--color-border)] bg-[var(--color-bg-surface)] hover:border-[var(--color-primary)] hover:bg-[var(--color-bg-subtle)]'

                  return (
                    <button
                      key={day.date}
                      type="button"
                      onClick={() => setSelectedDate(day.date)}
                      className={`flex flex-col justify-between h-full min-h-[62px] sm:min-h-[70px] p-1 sm:p-1.5 rounded-2xl border transition-all overflow-hidden min-w-0 cursor-pointer active:scale-95 text-left box-border ${cellClasses}`}
                    >
                      {/* Top: Day number (Căn góc trái trên cùng self-start, font bold) */}
                      <div className="flex items-center justify-between w-full self-start leading-none">
                        <span
                          className={`text-[10px] sm:text-xs font-bold leading-none ${
                            day.isToday
                              ? 'text-[var(--color-primary)]'
                              : day.isFuture
                                ? 'text-[var(--color-text-muted)]'
                                : 'text-[var(--color-text-primary)]'
                          }`}
                        >
                          {day.dayNumber}
                        </span>
                        {day.isToday && (
                          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/40 animate-pulse" />
                        )}
                      </div>

                      {/* Middle: Spent amount (Căn giữa ô flex-1 items-center justify-center, font nhỏ vừa phải) */}
                      <div className="flex-1 flex items-center justify-center w-full min-w-0 my-0.5">
                        {hasSpent ? (
                          <span className="block text-[10px] sm:text-xs font-medium amount-display text-[var(--color-expense)] truncate leading-none text-center">
                            -{formatCompactVnd(day.spent)}
                          </span>
                        ) : (
                          <span className="block text-[10px] text-gray-400/50 dark:text-gray-600 font-normal leading-none select-none">
                            -
                          </span>
                        )}
                      </div>

                      {/* Bottom: Daily balance (Căn góc phải dưới cùng self-end, font nhỏ text-[10px]) */}
                      <div className="w-full self-end flex justify-end min-w-0 leading-none">
                        {data.progress.budgetVnd > 0 ? (
                          <span
                            className={`block text-[9px] sm:text-[10px] amount-display truncate leading-none text-right ${
                              day.isFuture
                                ? 'text-[var(--color-income)] opacity-70 font-medium'
                                : isPositiveBalance
                                  ? 'text-[var(--color-income)] font-semibold'
                                  : 'text-[var(--color-expense)] font-bold'
                            }`}
                          >
                            {isPositiveBalance
                              ? `+${formatCompactVnd(day.balance)}`
                              : `-${formatCompactVnd(Math.abs(day.balance))}`}
                          </span>
                        ) : (
                          <span className="block text-[8px] text-[var(--color-text-muted)] truncate leading-none opacity-40">
                            {day.date.slice(5)}
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 pt-2.5 text-[10px] font-medium text-[var(--color-text-muted)] border-t border-[var(--color-border)]">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[var(--color-expense)]" />
                  <span>{t('reports.spent', 'Đã chi')} (-k)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[var(--color-income)]" />
                  <span>{t('reports.balance', 'Số dư')} (+k)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[var(--color-income)] opacity-70" />
                  <span>{t('reports.projection', 'Dự báo')} (+k)</span>
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

      {/* Day Details Bottom Sheet Modal (Single Source of Truth) */}
      <DayDetailModal
        dayData={selectedDayData}
        transactions={data?.transactions ?? []}
        budgetVnd={data?.progress.budgetVnd ?? 0}
        onClose={() => setSelectedDate(null)}
        onEditTransaction={(tx) => setEditingTransaction(tx)}
      />

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
