import { useEffect, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Calendar,
  Save,
  Coins,
  ShieldAlert,
  PiggyBank,
  TrendingUp,
  ShoppingCart,
  CheckCircle2,
  Sparkles,
  CalendarRange,
} from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { useCurrentMonth } from '@/hooks/useCurrentMonth'
import { useSettings } from '@/context/useSettings'
import { getTodayString, formatVnd } from '@/services/dateService'
import { getPaydayCycle, getCycleMonthForDate } from '@/features/reports/paydayCycle'
import {
  getPlanWithAllocations,
  saveMonthlyPlan,
  type PlanWithDetails,
} from '@/features/monthly-plans/monthlyPlanService'
import {
  calculateDailyBudget,
  calculateAllocationAmount,
  getDaysInMonth,
  parseMonthId,
} from '@/domain/budgetCalculator'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export function SettingsPage() {
  const { t } = useTranslation()
  const { payDay, setPayDay } = useSettings()
  const todayStr = useMemo(() => getTodayString(), [])
  const currentMonth = useCurrentMonth()

  // Budget plan states
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth)
  const [loading, setLoading] = useState<boolean>(true)
  const [saving, setSaving] = useState<boolean>(false)
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [income, setIncome] = useState<number>(0)
  const [allocations, setAllocations] = useState<Record<string, number>>({})
  const [planDetails, setPlanDetails] = useState<PlanWithDetails | null>(null)

  // Load monthly plan
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

  const isAllocationValid = totalAllocationPercent === 100

  // Preview current cycle calculated from the selected startDay
  const cyclePreview = useMemo(() => {
    const cycleMonth = getCycleMonthForDate(todayStr, payDay)
    const cycle = getPaydayCycle(cycleMonth, payDay)
    const [sy, sm, sd] = cycle.startDate.split('-')
    const [ey, em, ed] = cycle.endDate.split('-')
    return {
      formatted: `${sd}/${sm}/${sy} – ${ed}/${em}/${ey}`,
      days: cycle.totalDays,
    }
  }, [todayStr, payDay])

  const handleAllocationChange = (categoryId: string, value: number) => {
    setAllocations((prev) => ({
      ...prev,
      [categoryId]: Math.max(0, Math.min(100, isNaN(value) ? 0 : value)),
    }))
  }

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isAllocationValid) {
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
        return <ShoppingCart className="h-4 w-4 text-[var(--color-primary)]" />
      case 'cat-savings':
        return <PiggyBank className="h-4 w-4 text-[var(--color-income)]" />
      case 'cat-investment':
        return <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
      case 'cat-emergency':
        return <ShieldAlert className="h-4 w-4 text-[var(--color-warning)]" />
      default:
        return <span>{defaultIcon ?? '📁'}</span>
    }
  }

  const getCategoryName = (id: string, fallbackName: string) => {
    switch (id) {
      case 'cat-expenses':
        return t('plan.cat_expenses', 'Chi Tiêu Hàng Ngày')
      case 'cat-savings':
        return t('plan.cat_savings', 'Tiết Kiệm')
      case 'cat-investment':
        return t('plan.cat_investment', 'Đầu Tư')
      case 'cat-emergency':
        return t('plan.cat_emergency', 'Quỹ Khẩn Cấp')
      default:
        return fallbackName
    }
  }

  return (
    <PageContainer title={t('app.settings', 'Cài Đặt')}>
      <div className="space-y-6 pb-6 w-full min-w-0 max-w-full">
        {/* Section 1: Cycle Start Date (Payday) Setting */}
        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-5 shadow-2xs space-y-4 transition-colors">
          <div className="flex items-center gap-2.5 border-b border-[var(--color-border)] pb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
              <CalendarRange className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--color-text-primary)]">
                {t('reports.payDaySetting', 'Ngày Bắt Đầu Chu Kỳ Tháng')}
              </h2>
              <p className="text-xs text-[var(--color-text-muted)]">
                {t('settings.paydayHelp', 'Ngày lĩnh lương hoặc ngày bắt đầu chu kỳ tính toán (Mặc định: ngày 1 hàng tháng)')}
              </p>
            </div>
          </div>

          {/* Quick preset chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] font-semibold text-[var(--color-text-muted)] mr-1">
              {t('settings.quickSelect', 'Chọn nhanh:')}
            </span>
            {[1, 5, 10, 15, 19, 20, 25].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setPayDay(d)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                  payDay === d
                    ? 'bg-[var(--color-primary)] text-white shadow-2xs'
                    : 'bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-border)]'
                }`}
              >
                {d === 1 ? '1 (Đầu tháng)' : `Ngày ${d}`}
              </button>
            ))}
          </div>

          {/* Grid selector 1 to 28 */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-[var(--color-text-muted)]">
              {t('settings.customDay', 'Hoặc chọn ngày bất kỳ trong tháng (1 - 28):')}
            </span>
            <div className="grid grid-cols-7 gap-1.5 py-1">
              {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setPayDay(d)}
                  className={`h-9 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center justify-center ${
                    payDay === d
                      ? 'bg-[var(--color-primary)] text-white shadow-2xs'
                      : 'border border-[var(--color-border)] bg-[var(--color-bg-subtle)] text-[var(--color-text-primary)] hover:bg-[var(--color-border)]'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Active Cycle Preview Callout */}
          <div className="rounded-2xl bg-[var(--color-bg-subtle)] p-3 text-xs border border-[var(--color-border)] flex items-start gap-2.5">
            <Sparkles className="h-4 w-4 text-[var(--color-primary)] shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-semibold text-[var(--color-text-primary)]">
                {t('settings.cycleActive', 'Chu kỳ đang áp dụng cho hôm nay:')}
              </p>
              <p className="text-[var(--color-primary)] font-bold amount-display">
                {cyclePreview.formatted} ({cyclePreview.days} {t('common.days', 'ngày')})
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Monthly Budget Planning */}
        <form onSubmit={handleSaveBudget} className="space-y-4">
          <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-5 shadow-2xs space-y-4 transition-colors">
            <div className="flex items-center gap-2.5 border-b border-[var(--color-border)] pb-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-income-soft)] text-[var(--color-income)]">
                <Coins className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[var(--color-text-primary)]">
                  {t('plan.title', 'Kế Hoạch Ngân Sách Tháng')}
                </h2>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {t('plan.subtitle', 'Nhập thu nhập hàng tháng và phân bổ tỷ lệ phần trăm theo danh mục.')}
                </p>
              </div>
            </div>

            {/* Month selector */}
            <div className="flex items-center justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-3 text-xs">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[var(--color-text-muted)]" />
                <span className="font-semibold text-[var(--color-text-secondary)]">
                  {t('plan.planningMonth', 'Tháng')}:
                </span>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="font-bold text-[var(--color-text-primary)] bg-transparent focus:outline-none cursor-pointer"
                />
              </div>

              <button
                type="button"
                onClick={() => setSelectedMonth(currentMonth)}
                className="rounded-xl px-2.5 py-1 text-[11px] font-semibold text-[var(--color-primary)] hover:underline cursor-pointer"
              >
                {t('common.currentMonth', 'Tháng này')}
              </button>
            </div>

            {loading ? (
              <div className="py-8 flex justify-center">
                <LoadingSpinner label={t('common.loading', 'Đang tải…')} />
              </div>
            ) : (
              <>
                {/* Income Input */}
                <div className="space-y-1.5">
                  <label htmlFor="income-input" className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                    {t('plan.incomeLabel', 'Thu Nhập Hàng Tháng (VND)')}
                  </label>
                  <div className="relative">
                    <input
                      id="income-input"
                      type="number"
                      min="0"
                      step="100000"
                      value={income === 0 ? '' : income}
                      onChange={(e) => setIncome(Number(e.target.value) || 0)}
                      placeholder="10,000,000"
                      className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-4 py-3.5 text-base sm:text-lg font-bold amount-display text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:bg-[var(--color-bg-surface)] focus:border-[var(--color-border-focused)] focus:outline-none transition-colors"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--color-text-muted)]">
                      VND
                    </span>
                  </div>
                </div>

                {/* Daily Spending Preview Callout */}
                <div className="rounded-2xl border border-[var(--color-income-border)] bg-[var(--color-income-soft)] p-3.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[var(--color-text-primary)]">
                      {t('plan.calculatedDaily', 'Hạn Mức Chi Tiêu Mỗi Ngày')}:
                    </span>
                    <span className="text-base font-extrabold amount-display text-[var(--color-income)]">
                      {formatVnd(dailyBudgetPreview)}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">
                    {t('plan.dailySubtext', {
                      percent: allocations['cat-expenses'] ?? 0,
                      amount: formatVnd(calculateAllocationAmount(income, allocations['cat-expenses'] ?? 0)),
                      defaultValue: `Dựa trên ${allocations['cat-expenses'] ?? 0}% cho Chi Tiêu (${daysInMonth} ngày)`,
                    })}
                  </p>
                </div>

                {/* Category Allocations Slider/Input */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                      {t('plan.allocationTitle', 'Phân Bổ Ngân Sách')}
                    </span>
                    <span
                      className={`font-bold amount-display ${
                        isAllocationValid ? 'text-[var(--color-income)]' : 'text-[var(--color-expense)]'
                      }`}
                    >
                      {totalAllocationPercent}% / 100%
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {planDetails?.categories.map((cat) => {
                      const currentPercent = allocations[cat.id] ?? 0
                      const allocatedAmount = calculateAllocationAmount(income, currentPercent)

                      return (
                        <div
                          key={cat.id}
                          className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-3 space-y-2"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[var(--color-bg-surface)] text-sm shadow-2xs">
                                {getCategoryIcon(cat.id, cat.icon)}
                              </span>
                              <span className="font-bold text-[var(--color-text-primary)]">
                                {getCategoryName(cat.id, cat.name)}
                              </span>
                            </div>
                            <span className="font-semibold text-[var(--color-text-muted)] amount-display">
                              {formatVnd(allocatedAmount)}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <input
                              type="range"
                              min="0"
                              max="100"
                              step="5"
                              value={currentPercent}
                              onChange={(e) => handleAllocationChange(cat.id, Number(e.target.value))}
                              className="flex-1 accent-[var(--color-primary)] cursor-pointer"
                            />
                            <div className="flex items-center gap-1 w-14 shrink-0">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={currentPercent}
                                onChange={(e) => handleAllocationChange(cat.id, Number(e.target.value))}
                                className="w-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-1 py-0.5 text-center text-xs font-bold text-[var(--color-text-primary)] focus:outline-none"
                              />
                              <span className="text-xs text-[var(--color-text-muted)]">%</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {errorMsg && (
                  <p className="rounded-xl border border-[var(--color-expense-border)] bg-[var(--color-expense-soft)] p-3 text-xs text-[var(--color-expense)] font-medium text-center">
                    ⚠️ {errorMsg}
                  </p>
                )}

                {saveSuccess && (
                  <p className="rounded-xl border border-[var(--color-income-border)] bg-[var(--color-income-soft)] p-3 text-xs text-[var(--color-income)] font-bold text-center flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{t('plan.saveSuccess', 'Đã lưu kế hoạch ngân sách thành công!')}</span>
                  </p>
                )}

                {/* Save Budget Button */}
                <button
                  type="submit"
                  disabled={saving || !isAllocationValid}
                  className="w-full rounded-2xl bg-[var(--color-primary)] px-5 py-3.5 text-center text-sm font-bold text-white shadow-md hover:bg-[var(--color-primary-hover)] active:scale-[0.99] disabled:bg-[var(--color-bg-subtle)] disabled:text-[var(--color-text-muted)] disabled:cursor-not-allowed cursor-pointer transition-all flex items-center justify-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  <span>{saving ? t('plan.savingBtn', 'Đang Lưu…') : t('plan.saveBtn', 'Lưu Kế Hoạch Ngân Sách')}</span>
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </PageContainer>
  )
}
