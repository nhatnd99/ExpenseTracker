import { useEffect, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Calendar,
  Check,
  AlertCircle,
  Save,
  Coins,
  ShieldAlert,
  PiggyBank,
  TrendingUp,
  ShoppingCart,
  CheckCircle2,
} from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { useCurrentMonth } from '@/hooks/useCurrentMonth'
import {
  getPlanWithAllocations,
  saveMonthlyPlan,
  type PlanWithDetails,
} from './monthlyPlanService'
import {
  calculateDailyBudget,
  calculateAllocationAmount,
  getDaysInMonth,
  parseMonthId,
} from '@/domain/budgetCalculator'
import { formatVnd } from '@/services/dateService'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export function MonthlyPlanPage() {
  const { t } = useTranslation()
  const currentMonth = useCurrentMonth()
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth)
  const [loading, setLoading] = useState<boolean>(true)
  const [saving, setSaving] = useState<boolean>(false)
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [income, setIncome] = useState<number>(0)
  const [allocations, setAllocations] = useState<Record<string, number>>({})
  const [planDetails, setPlanDetails] = useState<PlanWithDetails | null>(null)

  useEffect(() => {
    let active = true

    getPlanWithAllocations(selectedMonth)
      .then((data) => {
        if (!active) return
        setPlanDetails(data)
        if (data.plan) {
          setIncome(data.plan.incomeVnd)
          const map: Record<string, number> = {}
          data.allocations.forEach((a) => {
            map[a.categoryId] = a.allocationPercent
          })
          setAllocations(map)
        } else {
          // Default initial allocations (70% expenses, 20% savings, 10% emergency)
          setIncome(10_000_000)
          const defaultMap: Record<string, number> = {
            'cat-expenses': 70,
            'cat-savings': 20,
            'cat-emergency': 10,
            'cat-investment': 0,
          }
          setAllocations(defaultMap)
        }
      })
      .catch((err) => {
        if (!active) return
        setErrorMsg(err instanceof Error ? err.message : 'Failed to load plan.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [selectedMonth])

  // Calculate days in month and daily budget preview
  const { daysInMonth, dailyBudgetPreview, totalAllocationPercent } = useMemo(() => {
    try {
      const { year, month } = parseMonthId(selectedMonth)
      const days = getDaysInMonth(year, month)
      const expensePercent = allocations['cat-expenses'] ?? 0
      const expenseBudget = calculateAllocationAmount(income, expensePercent)
      const daily = calculateDailyBudget(expenseBudget, days)
      const totalPercent = Object.values(allocations).reduce((sum, p) => sum + (Number(p) || 0), 0)

      return {
        daysInMonth: days,
        dailyBudgetPreview: daily,
        totalAllocationPercent: totalPercent,
      }
    } catch {
      return { daysInMonth: 30, dailyBudgetPreview: 0, totalAllocationPercent: 0 }
    }
  }, [selectedMonth, income, allocations])

  const handleAllocationChange = (categoryId: string, value: number) => {
    setAllocations((prev) => ({
      ...prev,
      [categoryId]: Math.max(0, Math.min(100, isNaN(value) ? 0 : Math.round(value))),
    }))
    setSaveSuccess(false)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (totalAllocationPercent !== 100) {
      setErrorMsg(t('plan.errorSum', { current: totalAllocationPercent }))
      return
    }

    setSaving(true)
    setErrorMsg(null)
    setSaveSuccess(false)

    try {
      const allocationList = Object.entries(allocations).map(([categoryId, allocationPercent]) => ({
        categoryId,
        allocationPercent,
      }))

      await saveMonthlyPlan({
        month: selectedMonth,
        incomeVnd: Math.max(0, Math.round(income)),
        allocations: allocationList,
      })

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error saving budget plan.')
    } finally {
      setSaving(false)
    }
  }

  const getCategoryIcon = (id: string, defaultIcon?: string) => {
    switch (id) {
      case 'cat-expenses':
        return <ShoppingCart className="h-4 w-4 text-cyan-500" />
      case 'cat-savings':
        return <PiggyBank className="h-4 w-4 text-emerald-500" />
      case 'cat-investment':
        return <TrendingUp className="h-4 w-4 text-purple-500" />
      case 'cat-emergency':
        return <ShieldAlert className="h-4 w-4 text-amber-500" />
      default:
        return <span>{defaultIcon ?? '📁'}</span>
    }
  }

  const getCategoryName = (id: string, fallbackName: string) => {
    switch (id) {
      case 'cat-expenses':
        return t('plan.cat_expenses')
      case 'cat-savings':
        return t('plan.cat_savings')
      case 'cat-investment':
        return t('plan.cat_investment')
      case 'cat-emergency':
        return t('plan.cat_emergency')
      default:
        return fallbackName
    }
  }

  return (
    <PageContainer title={t('app.plan')}>
      <form onSubmit={handleSave} className="space-y-4">
        {/* Month selector */}
        <div className="flex items-center justify-between rounded-3xl border border-slate-100 bg-white p-4 shadow-xs transition-colors dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <label htmlFor="month-select" className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                {t('plan.planningMonth')}
              </label>
              <input
                id="month-select"
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="block text-sm font-bold text-slate-900 bg-transparent focus:outline-none dark:text-white"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSelectedMonth(currentMonth)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 active:bg-slate-200 dark:border-slate-750 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-750 cursor-pointer"
          >
            {t('common.currentMonth')}
          </button>
        </div>

        {loading ? (
          <div className="py-16 flex justify-center">
            <LoadingSpinner label={t('common.loading')} />
          </div>
        ) : (
          <>
            {/* Income Input Card */}
            <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-xs transition-colors dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="h-4 w-4 text-emerald-500" />
                  <label htmlFor="income-input" className="text-sm font-bold text-slate-900 dark:text-white">
                    {t('plan.incomeLabel')}
                  </label>
                </div>
                <span className="text-xs text-slate-400">VND</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{t('plan.incomeSubtext')}</p>

              <div className="mt-3 relative">
                <input
                  id="income-input"
                  type="number"
                  min="0"
                  step="500000"
                  value={income || ''}
                  onChange={(e) => {
                    setIncome(Number(e.target.value))
                    setSaveSuccess(false)
                  }}
                  placeholder={t('plan.incomePlaceholder')}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-xl font-bold text-slate-900 focus:bg-white focus:border-slate-800 focus:outline-none dark:border-slate-800 dark:bg-slate-850 dark:text-white dark:focus:bg-slate-800 dark:focus:border-cyan-400"
                />
              </div>
              <p className="mt-2 text-right text-sm font-bold text-emerald-600 amount-display dark:text-emerald-400">
                {formatVnd(income)}
              </p>
            </div>

            {/* Daily Spending Preview Card */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 p-5 text-white shadow-xl dark:border dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  {t('plan.calculatedDaily')}
                </span>
                <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-slate-300 font-medium">
                  {daysInMonth} {t('common.days')}
                </span>
              </div>
              <p className="mt-2 text-3xl font-bold amount-display text-emerald-400">
                {formatVnd(dailyBudgetPreview)}
                <span className="text-sm font-normal text-slate-400"> / {t('common.day')}</span>
              </p>
              <p className="mt-1.5 text-xs text-slate-400">
                {t('plan.dailySubtext', {
                  percent: allocations['cat-expenses'] ?? 0,
                  amount: formatVnd(calculateAllocationAmount(income, allocations['cat-expenses'] ?? 0)),
                })}
              </p>
            </div>

            {/* Budget Allocations Card */}
            <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-xs transition-colors dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {t('plan.allocationTitle')}
                  </h3>
                  <p className="text-xs text-slate-400">{t('plan.allocationSubtext')}</p>
                </div>
                <div
                  className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
                    totalAllocationPercent === 100
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                      : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                  }`}
                >
                  {totalAllocationPercent === 100 ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <AlertCircle className="h-3 w-3" />
                  )}
                  <span>{totalAllocationPercent}% / 100%</span>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {planDetails?.categories.map((cat) => {
                  const percent = allocations[cat.id] ?? 0
                  const amount = calculateAllocationAmount(income, percent)

                  return (
                    <div
                      key={cat.id}
                      className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5 transition-colors focus-within:border-slate-300 dark:border-slate-800/80 dark:bg-slate-850/60 dark:focus-within:border-slate-700"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-2xs dark:bg-slate-800">
                            {getCategoryIcon(cat.id, cat.icon)}
                          </div>
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                            {getCategoryName(cat.id, cat.name)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={percent}
                            onChange={(e) => handleAllocationChange(cat.id, Number(e.target.value))}
                            className="w-16 rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-center text-sm font-bold text-slate-800 focus:border-slate-700 focus:outline-none dark:border-slate-750 dark:bg-slate-800 dark:text-white dark:focus:border-cyan-400"
                          />
                          <span className="text-xs font-semibold text-slate-400">%</span>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>{t('plan.allocatedAmount')}</span>
                        <span className="font-bold text-slate-700 amount-display dark:text-slate-200">
                          {formatVnd(amount)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Error or Success notification */}
            {errorMsg && (
              <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            {saveSuccess && (
              <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-700 font-medium dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{t('plan.saveSuccess')}</span>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={saving || totalAllocationPercent !== 100 || income <= 0}
              className={`w-full rounded-2xl py-4 text-center text-sm font-bold text-white shadow-md transition-all touch-target cursor-pointer flex items-center justify-center gap-2 ${
                saving || totalAllocationPercent !== 100 || income <= 0
                  ? 'bg-slate-300 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed'
                  : 'bg-slate-900 hover:bg-slate-850 active:scale-[0.99] dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400'
              }`}
            >
              <Save className="h-4 w-4" />
              <span>{saving ? t('plan.savingBtn') : t('plan.saveBtn')}</span>
            </button>
          </>
        )}
      </form>
    </PageContainer>
  )
}
