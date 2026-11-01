import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Wallet,
  PlusCircle,
  SlidersHorizontal,
  ArrowRight,
  TrendingUp,
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
import { CategoryIconRenderer } from '@/components/ui/CategoryIconRenderer'

export function DashboardPage() {
  const { t } = useTranslation()
  const { payDay } = useSettings()
  const todayStr = useMemo(() => getTodayString(), [])
  const currentCycleMonth = useMemo(() => getCycleMonthForDate(todayStr, payDay), [todayStr, payDay])
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

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
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md text-[var(--color-primary)] mb-4">
              <Sparkles className="h-6 w-6" />
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

  const { summary, todayStatus, recentTransactions } = data
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

        {/* Today's Spending Allowance */}
        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-5 shadow-2xs transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                  {t('dashboard.todayDailyBudget')}
                </p>
              </div>
              <p className="mt-1 text-2xl font-bold text-[var(--color-text-primary)] amount-display">
                {formatVnd(summary.dailyBudgetVnd)}
              </p>
            </div>

            {todayStatus && (
              <div
                className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
                  todayStatus.isOverBudget
                    ? 'bg-[var(--color-expense-soft)] text-[var(--color-expense)] border border-[var(--color-expense-border)]'
                    : 'bg-[var(--color-income-soft)] text-[var(--color-income)] border border-[var(--color-income-border)]'
                }`}
              >
                {todayStatus.isOverBudget ? (
                  <>
                    <AlertCircle className="h-3 w-3" />
                    <span>{t('dashboard.overBudget')}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3 w-3" />
                    <span>{t('dashboard.onTrack')}</span>
                  </>
                )}
              </div>
            )}
          </div>

          {todayStatus && (
            <div className="mt-3.5 grid grid-cols-2 gap-2 border-t border-[var(--color-border)] pt-3 text-xs">
              <div>
                <span className="text-[var(--color-text-muted)]">{t('dashboard.todaySpent')}:</span>
                <p className="mt-0.5 font-bold text-[var(--color-text-primary)] amount-display">
                  {formatVnd(todayStatus.spentVnd)}
                </p>
              </div>
              <div>
                <span className="text-[var(--color-text-muted)]">{t('dashboard.todayRemaining')}:</span>
                <p
                  className={`mt-0.5 font-bold amount-display ${
                    todayStatus.remainingVnd < 0
                      ? 'text-[var(--color-expense)]'
                      : 'text-[var(--color-income)]'
                  }`}
                >
                  {formatVnd(todayStatus.remainingVnd)}
                </p>
              </div>
            </div>
          )}
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

        {/* Recent Transactions */}
        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-5 shadow-2xs transition-colors space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
              {t('dashboard.recentExpenses')}
            </h3>
            <Link
              to="/transactions"
              className="text-xs font-semibold text-[var(--color-primary)] hover:underline"
            >
              {t('dashboard.viewAll')} →
            </Link>
          </div>

          {recentTransactions.length === 0 ? (
            <div className="py-6 text-center">
              <Receipt className="mx-auto h-8 w-8 text-[var(--color-text-muted)]" />
              <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                {t('dashboard.noExpensesYet')}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-bg-subtle)] text-[var(--color-primary)] border border-[var(--color-border)] shadow-2xs">
                      <CategoryIconRenderer icon={tx.categoryIcon} size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-[var(--color-text-primary)] truncate">
                        {tx.categoryName}
                      </p>
                      <p className="text-[11px] text-[var(--color-text-muted)] truncate">
                        {tx.date} {tx.description && `• ${tx.description}`}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[var(--color-expense)] amount-display">
                    -{formatVnd(tx.amountVnd)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  )
}
