import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Wallet,
  WalletCards,
  PlusCircle,
  SlidersHorizontal,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Receipt,
  Sparkles,
} from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { useSettings } from '@/context/useSettings'
import { getDashboardData, type DashboardData } from './dashboardService'
import { formatVnd, getTodayString } from '@/services/dateService'
import { getCycleMonthForDate } from '@/features/reports/paydayCycle'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useDynamicBudget } from './hooks/useDynamicBudget'

export function DashboardPage() {
  const { t } = useTranslation()
  const { payDay } = useSettings()
  const todayStr = useMemo(() => getTodayString(), [])
  const currentCycleMonth = useMemo(() => getCycleMonthForDate(todayStr, payDay), [todayStr, payDay])
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  const dynamicBudget = useDynamicBudget({
    cycle: data?.cycle,
    baseBudget: data?.summary.totalExpenseBudgetVnd,
    transactions: data?.transactions,
    todayStr,
  })

  useEffect(() => {
    let active = true

    getDashboardData(currentCycleMonth, payDay, todayStr)
      .then((res) => {
        if (active) setData(res)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [currentCycleMonth, payDay, todayStr])

  if (loading) {
    return (
      <PageContainer title={t('app.dashboard')}>
        <div className="py-20 flex justify-center">
          <LoadingSpinner label={t('common.loading')} />
        </div>
      </PageContainer>
    )
  }

  // When no plan has been set up yet
  if (!data) {
    return (
      <PageContainer title={t('app.dashboard')}>
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-6 text-white shadow-xl border border-[var(--color-border)]">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 text-white shadow-lg shadow-blue-500/30 ring-2 ring-white/10 mb-4">
              <WalletCards className="h-7 w-7 stroke-[2.25]" />
            </div>
            <h2 className="text-xl font-bold tracking-tight">{t('dashboard.welcomeTitle')}</h2>
            <p className="mt-2 text-sm text-slate-300 leading-relaxed">
              {t('dashboard.welcomeDesc')}
            </p>
            <Link
              to="/settings"
              className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-[var(--color-primary)] px-5 py-3.5 text-sm font-bold text-white shadow-md transition-transform hover:bg-[var(--color-primary-hover)] active:scale-[0.98] cursor-pointer"
            >
              <span>{t('dashboard.setupPlanBtn')}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="rounded-3xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg-surface)] p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)]">
              <Calendar className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm font-semibold text-[var(--color-text-primary)]">
              {t('dashboard.noActivePlan')}
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)] max-w-xs mx-auto">
              {t('dashboard.noActivePlanDesc')}
            </p>
          </div>
        </div>
      </PageContainer>
    )
  }

  const { summary, todayStatus } = data
  const percentSpent = summary.totalExpenseBudgetVnd > 0
    ? Math.min(100, Math.round((summary.totalSpentVnd / summary.totalExpenseBudgetVnd) * 100))
    : 0

  return (
    <PageContainer title={t('app.dashboard')}>
      <div className="space-y-4">
        {/* Monthly Budget Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-850 to-blue-950 p-6 text-white shadow-xl border border-slate-800/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-blue-400">
                <Wallet className="h-4 w-4" />
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 block">
                  {t('dashboard.monthlyBudget')}
                </span>
                <span className="text-[11px] text-blue-300/90 font-medium font-mono">
                  {data.cycle
                    ? `${data.cycle.startDate.slice(8)}/${data.cycle.startDate.slice(5, 7)} – ${data.cycle.endDate.slice(8)}/${data.cycle.endDate.slice(5, 7)}`
                    : summary.month}
                </span>
              </div>
            </div>
            <Link
              to="/settings"
              className="text-xs font-medium text-blue-400 transition-colors hover:text-blue-300"
            >
              {t('dashboard.editPlan')} →
            </Link>
          </div>

          <div className="mt-4 flex items-baseline justify-between">
            <div>
              <p className="text-xs text-slate-400">{t('dashboard.totalExpenseBudget')}</p>
              <p className="text-2xl font-bold amount-display text-white">
                {formatVnd(summary.totalExpenseBudgetVnd)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">{t('dashboard.remaining')}</p>
              <p
                className={`text-xl font-bold amount-display ${
                  summary.isOverBudget ? 'text-[var(--color-expense)]' : 'text-[var(--color-income)]'
                }`}
              >
                {formatVnd(summary.remainingVnd)}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex justify-between text-[11px] text-slate-400 mb-1.5 font-medium">
              <span>{t('dashboard.spent')}: {formatVnd(summary.totalSpentVnd)}</span>
              <span>{percentSpent}%</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800/80 p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  summary.isOverBudget ? 'bg-[var(--color-expense)]' : 'bg-gradient-to-r from-blue-500 to-emerald-400'
                }`}
                style={{ width: `${percentSpent}%` }}
              />
            </div>
          </div>

          {/* Excluded Bills (Smart Categories - Large fixed bills outside daily limit) */}
          <div className="mt-3.5 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-300">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Receipt className="h-3.5 w-3.5 text-blue-400 shrink-0" />
              <span>{t('dashboard.totalExcludedBills', 'Tổng hóa đơn đã đóng')}:</span>
            </span>
            <span className="font-bold text-white amount-display">
              {formatVnd(data.totalExcludedBills)}
            </span>
          </div>
        </div>

        {/* Dynamic Safe-to-Spend Dashboard Card (Cohesive 3-Column Layout matching Expenses Daily Budget) */}
        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-4 sm:p-5 shadow-2xs transition-colors space-y-3.5">
          {/* Card Top: Title & Status Indicator */}
          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[var(--color-text-muted)] text-[11px] min-w-0">
              <Sparkles className="h-4 w-4 text-[var(--color-primary)] shrink-0" />
              <span className="leading-tight">{t('dashboard.safeToSpendToday', 'Hôm nay bạn có thể tiêu')}</span>
            </div>

            {/* Status Badge */}
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold shrink-0 ${
                dynamicBudget.isOnTrack
                  ? 'bg-[var(--color-income-soft)] text-[var(--color-income)] border border-[var(--color-income-border)]'
                  : 'bg-[var(--color-expense-soft)] text-[var(--color-expense)] border border-[var(--color-expense-border)]'
              }`}
            >
              {dynamicBudget.isOnTrack ? (
                <>
                  <CheckCircle2 className="h-3 w-3 shrink-0" />
                  <span>{t('dashboard.onTrack', 'Đúng Kế Hoạch')}</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  <span>{t('dashboard.overBudget', 'Vượt Hạn Mức')}</span>
                </>
              )}
            </span>
          </div>

          {/* Hero Safe-to-Spend Amount */}
          <div>
            <p className="text-3xl sm:text-4xl font-extrabold text-[var(--color-text-primary)] amount-display tracking-tight leading-none">
              {formatVnd(dynamicBudget.todayLimit)}
            </p>
          </div>

          {/* Pace / Rollover Banner */}
          <div
            className={`flex items-center gap-2.5 rounded-2xl p-2.5 sm:p-3 text-xs font-semibold border leading-snug whitespace-normal ${
              dynamicBudget.paceBalance > 0
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                : dynamicBudget.paceBalance < 0
                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                  : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
            }`}
          >
            {dynamicBudget.paceBalance > 0 ? (
              <>
                <TrendingUp className="h-4 w-4 shrink-0" />
                <span className="whitespace-normal leading-tight">
                  {t(
                    'dashboard.paceAhead',
                    'Tuyệt vời! Bạn đang tiết kiệm được {{amount}} so với tiến độ',
                    { amount: formatVnd(dynamicBudget.paceBalance) },
                  )}
                </span>
              </>
            ) : dynamicBudget.paceBalance < 0 ? (
              <>
                <TrendingDown className="h-4 w-4 shrink-0" />
                <span className="whitespace-normal leading-tight">
                  {t(
                    'dashboard.paceBehind',
                    'Chú ý! Bạn đang tiêu lố {{amount}}, hãy thắt chặt chi tiêu',
                    { amount: formatVnd(Math.abs(dynamicBudget.paceBalance)) },
                  )}
                </span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span className="whitespace-normal leading-tight">{t('dashboard.paceOnTrack', 'Tuyệt vời! Bạn đang chi tiêu đúng tiến độ kế hoạch')}</span>
              </>
            )}
          </div>

          {/* 3 Columns: Today's Spent | Remaining Monthly Budget | Remaining Days */}
          <div className="grid grid-cols-3 gap-1 divide-x divide-[var(--color-border)] pt-3 border-t border-[var(--color-border)]">
            {/* Col 1: Today's Spent */}
            <div className="text-center px-1 min-w-0">
              <span className="block text-[10px] sm:text-xs font-bold uppercase tracking-tighter text-[var(--color-text-muted)] leading-tight whitespace-normal text-center">
                {t('dashboard.todaySpent', 'Hôm Nay Đã Tiêu')}
              </span>
              <p className="mt-1 text-xs sm:text-base font-extrabold amount-display text-[var(--color-expense)] leading-tight whitespace-normal break-all sm:break-normal text-center">
                {formatVnd(todayStatus?.spentVnd ?? 0)}
              </p>
            </div>

            {/* Col 2: Remaining Monthly Budget */}
            <div className="text-center px-1 min-w-0">
              <span className="block text-[10px] sm:text-xs font-bold uppercase tracking-tighter text-[var(--color-text-muted)] leading-tight whitespace-normal text-center">
                {t('dashboard.remainingMonthBudget', 'Quỹ Tháng Còn Lại')}
              </span>
              <p
                className={`mt-1 text-xs sm:text-base font-extrabold amount-display leading-tight whitespace-normal break-all sm:break-normal text-center ${
                  dynamicBudget.remainingBudget <= 0
                    ? 'text-[var(--color-expense)]'
                    : 'text-[var(--color-income)]'
                }`}
              >
                {formatVnd(Math.max(0, dynamicBudget.remainingBudget))}
              </p>
            </div>

            {/* Col 3: Remaining Days */}
            <div className="text-center px-1 min-w-0">
              <span className="block text-[10px] sm:text-xs font-bold uppercase tracking-tighter text-[var(--color-text-muted)] leading-tight whitespace-normal text-center">
                {t('dashboard.remainingDays', 'Số Ngày Còn Lại')}
              </span>
              <p className="mt-1 text-xs sm:text-base font-extrabold text-[var(--color-text-primary)] font-mono leading-tight whitespace-normal text-center">
                <span className="text-[var(--color-primary)] font-black">{dynamicBudget.remainingDays}</span> {t('common.days', 'ngày')}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/transactions"
            className="flex items-center justify-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-4 font-bold text-[var(--color-text-primary)] shadow-2xs transition-all hover:bg-[var(--color-bg-subtle)] active:scale-[0.98] touch-target"
          >
            <PlusCircle className="h-4 w-4 text-[var(--color-primary)]" />
            <span className="text-sm">{t('dashboard.addExpense')}</span>
          </Link>
          <Link
            to="/settings"
            className="flex items-center justify-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-4 font-bold text-[var(--color-text-primary)] shadow-2xs transition-all hover:bg-[var(--color-bg-subtle)] active:scale-[0.98] touch-target"
          >
            <SlidersHorizontal className="h-4 w-4 text-[var(--color-text-secondary)]" />
            <span className="text-sm">{t('dashboard.manageBudget')}</span>
          </Link>
        </div>
      </div>
    </PageContainer>
  )
}
