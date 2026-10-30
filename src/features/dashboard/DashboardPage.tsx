import { useEffect, useState } from 'react'
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
import { useCurrentMonth } from '@/hooks/useCurrentMonth'
import { getDashboardData, type DashboardData } from './dashboardService'
import { formatVnd } from '@/services/dateService'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export function DashboardPage() {
  const { t } = useTranslation()
  const currentMonth = useCurrentMonth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    let active = true

    getDashboardData(currentMonth)
      .then((res) => {
        if (active) setData(res)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [currentMonth])

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
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-950 p-6 text-white shadow-xl dark:border dark:border-slate-800">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md text-cyan-300 mb-4">
              <Sparkles className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold tracking-tight">{t('dashboard.welcomeTitle')}</h2>
            <p className="mt-2 text-sm text-slate-300 leading-relaxed">
              {t('dashboard.welcomeDesc')}
            </p>
            <Link
              to="/plan"
              className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-cyan-400 px-5 py-3.5 text-sm font-bold text-slate-950 shadow-md transition-transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <span>{t('dashboard.setupPlanBtn')}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900/60">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
              <Calendar className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
              {t('dashboard.noActivePlan')}
            </p>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-400 max-w-xs mx-auto">
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
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 to-slate-850 p-6 text-white shadow-xl dark:border dark:border-slate-800/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-cyan-300">
                <Wallet className="h-3.5 w-3.5" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                {t('dashboard.monthlyBudget')} ({summary.month})
              </span>
            </div>
            <Link
              to="/plan"
              className="text-xs font-medium text-cyan-400 transition-colors hover:text-cyan-300"
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
                  summary.isOverBudget ? 'text-rose-400' : 'text-emerald-400'
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
                  summary.isOverBudget ? 'bg-rose-500' : 'bg-gradient-to-r from-cyan-400 to-emerald-400'
                }`}
                style={{ width: `${percentSpent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Today's Spending Allowance */}
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-xs transition-colors dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-slate-400 dark:text-slate-400" />
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {t('dashboard.todayDailyBudget')}
                </p>
              </div>
              <p className="mt-1 text-2xl font-bold text-slate-900 amount-display dark:text-white">
                {formatVnd(summary.dailyBudgetVnd)}
              </p>
            </div>

            {todayStatus && (
              <div
                className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
                  todayStatus.isOverBudget
                    ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60'
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
            <div className="mt-3.5 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
              <div>
                <span className="text-slate-400">{t('dashboard.todaySpent')}:</span>
                <p className="mt-0.5 font-bold text-slate-700 amount-display dark:text-slate-200">
                  {formatVnd(todayStatus.spentVnd)}
                </p>
              </div>
              <div>
                <span className="text-slate-400">{t('dashboard.todayRemaining')}:</span>
                <p
                  className={`mt-0.5 font-bold amount-display ${
                    todayStatus.remainingVnd < 0
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-emerald-600 dark:text-emerald-400'
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
            className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200/80 bg-white p-4 font-bold text-slate-800 shadow-xs transition-all hover:bg-slate-50 active:scale-[0.98] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-850 touch-target"
          >
            <PlusCircle className="h-4 w-4 text-cyan-500" />
            <span className="text-sm">{t('dashboard.addExpense')}</span>
          </Link>
          <Link
            to="/plan"
            className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200/80 bg-white p-4 font-bold text-slate-800 shadow-xs transition-all hover:bg-slate-50 active:scale-[0.98] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-850 touch-target"
          >
            <SlidersHorizontal className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            <span className="text-sm">{t('dashboard.manageBudget')}</span>
          </Link>
        </div>

        {/* Recent Transactions */}
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-xs transition-colors dark:border-slate-800 dark:bg-slate-900 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {t('dashboard.recentExpenses')}
            </h3>
            <Link
              to="/transactions"
              className="text-xs font-semibold text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300"
            >
              {t('dashboard.viewAll')} →
            </Link>
          </div>

          {recentTransactions.length === 0 ? (
            <div className="py-6 text-center">
              <Receipt className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-400" />
              <p className="mt-2 text-xs text-slate-400 dark:text-slate-400">
                {t('dashboard.noExpensesYet')}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">{tx.categoryIcon}</span>
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {tx.categoryName}
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-400">
                        {tx.date} {tx.description && `• ${tx.description}`}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-900 amount-display dark:text-slate-100">
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
