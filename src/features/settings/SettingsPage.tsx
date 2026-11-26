import React, { useEffect, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Save,
  Coins,
  CheckCircle2,
  CalendarRange,
  ChevronDown,
  ChevronRight,
  Receipt,
  Wallet,
  Trash2,
  Lock,
  Settings2,
  AlertTriangle,
  Sparkles,
} from 'lucide-react'
import type { BudgetCategory } from '@/types/models'
import { ManageQuickTemplateModal } from './components/ManageQuickTemplateModal'
import { db } from '@/db/database'
import { PageContainer } from '@/components/layout/PageContainer'
import { useSettings } from '@/context/useSettings'
import { getTodayString, formatVnd } from '@/services/dateService'
import {
  getPaydayCycle,
  getCycleMonthForDate,
  type PaydayCycle,
} from '@/features/reports/paydayCycle'
import {
  getPlanWithAllocations,
  saveMonthlyPlan,
  type PlanWithDetails,
} from '@/features/monthly-plans/monthlyPlanService'
import { budgetCategoryRepository, isBaseBudgetCategory } from '@/repositories/budgetCategoryRepository'
import { expenseCategoryRepository } from '@/repositories/expenseCategoryRepository'
import { CategoryIconRenderer } from '@/components/ui/CategoryIconRenderer'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useBudgetCalculator } from './hooks/useBudgetCalculator'
import { PercentageInput } from './components/PercentageInput'
import { ManageFixedBillsModal } from './components/ManageFixedBillsModal'
import { normalizeFixedBills, mergeBills } from './utils/fixedBillsUtils'
import type { FixedBillItem } from './types'
import type { CategoryRecord, ExpenseCategory } from '@/types/models'
import { categoryRecordRepository } from '@/repositories/categoryRecordRepository'
import { BudgetCategoryModal } from './components/BudgetCategoryModal'
import type { BudgetCategoryChangeEvent } from './components/BudgetCategoryManagement'
import { ManageCategoryRecordsModal } from '@/features/categories/components/ManageCategoryRecordsModal'

export function SettingsPage() {
  const { t } = useTranslation()
  const {
    payDay,
    setPayDay,
    refreshDailyLimit,
    quickTemplates,
    fixedBills,
    setFixedBills,
    monthlyIncome,
    setMonthlyIncome,
    setBudgetPlan,
  } = useSettings()
  const todayStr = useMemo(() => getTodayString(), [])
  const currentCycleMonth = useMemo(() => getCycleMonthForDate(todayStr, payDay), [todayStr, payDay])

  const [loading, setLoading] = useState<boolean>(true)
  const [savingBudget, setSavingBudget] = useState<boolean>(false)
  const [budgetSaveSuccess, setBudgetSaveSuccess] = useState<boolean>(false)
  const [budgetErrorMsg, setBudgetErrorMsg] = useState<string | null>(null)

  // Quick Templates Modal & Separated Categories State
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false)
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([])
  const [allCategories, setAllCategories] = useState<BudgetCategory[]>([])
  const [allRecords, setAllRecords] = useState<CategoryRecord[]>([])
  const [selectedRecordCategory, setSelectedRecordCategory] = useState<BudgetCategory | null>(null)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)

  const reloadCategoriesAndRecords = React.useCallback(() => {
    budgetCategoryRepository.findAll().then(setAllCategories).catch(() => {})
    expenseCategoryRepository.findAll().then(setExpenseCategories).catch(() => {})
    categoryRecordRepository.findAll().then(setAllRecords).catch(() => {})
  }, [])

  useEffect(() => {
    reloadCategoriesAndRecords()
  }, [reloadCategoriesAndRecords])

  // Monthly income initialized from persistent SettingsContext
  const [income, setIncome] = useState<number>(monthlyIncome || 10_000_000)

  // Fixed Bills Modal State
  const [isFixedBillsModalOpen, setIsFixedBillsModalOpen] = useState(false)

  // Danger Zone - Reset All Data State
  const [isResetModalOpen, setIsResetModalOpen] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  const handleResetAllData = async () => {
    setIsResetting(true)
    try {
      await db.delete()
    } catch {
      await Promise.all([
        db.monthlyPlans.clear(),
        db.categories.clear(),
        db.allocations.clear(),
        db.transactions.clear(),
      ])
    }
    localStorage.clear()
    window.location.reload()
  }

  // Total Fixed Bills VND
  const fixedBillsTotalVnd = useMemo(() => {
    return fixedBills.reduce((sum, b) => sum + (Number(b.amountVnd) || 0), 0)
  }, [fixedBills])

  // Custom Budget Allocation Calculator Hook (handles 100% auto-balancing)
  const {
    fixedBillsPercent,
    dailyPercent,
    savingsPercent,
    customItems,
    setDailyPercent,
    setSavingsPercent,
    setCustomItemPercent,
    updateCustomItemName,
    addCustomItem,
    syncCustomItemsFromCategories,
    removeCustomItem,
    initializeFromPlan,
    totalPercent,
    isAllocationValid,
    dailyExpensesAmount,
    savingsAmount,
  } = useBudgetCalculator({
    income,
    fixedBillsTotalVnd,
    initialDailyPercent: 50,
    initialSavingsPercent: 20,
  })

  const handleBudgetCategoriesChanged = React.useCallback(
    (event?: BudgetCategoryChangeEvent) => {
      budgetCategoryRepository
        .findAll()
        .then((budgetCats) => {
          setAllCategories(budgetCats)

          if (event?.type === 'created') {
            if (!event.category.excludeFromExpenseTracking && event.category.type !== 'income') {
              addCustomItem(event.category.name, event.category.id, event.category.icon)
            }
          } else if (event?.type === 'updated') {
            if (event.category.excludeFromExpenseTracking) {
              if (customItems.some((c) => c.id === event.category.id)) {
                removeCustomItem(event.category.id)
              }
            } else {
              syncCustomItemsFromCategories(budgetCats)
            }
          } else if (event?.type === 'deleted') {
            if (customItems.some((c) => c.id === event.categoryId)) {
              removeCustomItem(event.categoryId)
            }
          } else if (event?.type === 'reordered') {
            syncCustomItemsFromCategories(budgetCats)
          }
        })
        .catch(() => {})
      categoryRecordRepository.findAll().then(setAllRecords).catch(() => {})
    },
    [addCustomItem, removeCustomItem, syncCustomItemsFromCategories, customItems],
  )

  // Current cycle details
  const activeCycle: PaydayCycle = useMemo(() => {
    return getPaydayCycle(currentCycleMonth, payDay)
  }, [currentCycleMonth, payDay])

  // Daily Limit based strictly on Daily Expenses and dynamic cycle days
  const calculatedDailyLimit = useMemo(() => {
    if (activeCycle.totalDays <= 0 || dailyExpensesAmount <= 0) return 0
    return Math.round(dailyExpensesAmount / activeCycle.totalDays)
  }, [dailyExpensesAmount, activeCycle.totalDays])

  // Secondary Section: Payday Selection State (Independent from Budget Plan)
  const [selectedPayDay, setSelectedPayDay] = useState<number>(payDay)
  const [isPaydayOpen, setIsPaydayOpen] = useState<boolean>(false)
  const [paydaySaveSuccess, setPaydaySaveSuccess] = useState<boolean>(false)

  // Load monthly plan and saved fixed bills
  interface InitialBudgetValues {
    income: number
    payDay: number
    dailyPercent: number
    savingsPercent: number
    fixedBillsPercent: number
    customItems: { id: string; percent: number; name: string }[]
  }
  const [initialValues, setInitialValues] = useState<InitialBudgetValues | null>(null)

  useEffect(() => {
    let active = true

    getPlanWithAllocations(currentCycleMonth)
      .then((data: PlanWithDetails) => {
        if (!active) return

        // 1. Load fixed bills from localStorage (check month override, fallback to global default)
        try {
          const storedDefault = localStorage.getItem('budget_fixed_bills_default')
          const defaultBills = storedDefault ? normalizeFixedBills(JSON.parse(storedDefault)) : []

          const storedMonth = localStorage.getItem(`budget_fixed_bills_${currentCycleMonth}`)
          if (storedMonth) {
            const parsed = JSON.parse(storedMonth)
            const monthBills = normalizeFixedBills(parsed)
            if (monthBills.length > 0) {
              setFixedBills(mergeBills(defaultBills, monthBills))
            } else if (defaultBills.length > 0) {
              setFixedBills(defaultBills)
            }
          } else if (defaultBills.length > 0) {
            setFixedBills(defaultBills)
          }
        } catch {
          // keep current global fixedBills
        }

        // 2. Initialize Income & Percentages
        if (data.plan && data.allocations.length > 0) {
          const inc = data.plan.incomeVnd
          setIncome(inc)
          setMonthlyIncome(inc)
          setBudgetPlan(data.plan)

          const dailyAlloc = data.allocations.find((a) => a.categoryId === 'cat-expenses')
          const savingsAlloc = data.allocations.find((a) => a.categoryId === 'cat-savings')
          const fixedAlloc = data.allocations.find((a) => a.categoryId === 'cat-fixed')

          const customAllocs = data.allocations.filter((a) => !isBaseBudgetCategory(a.categoryId))
          const categoryOrderMap = new Map(data.categories.map((c) => [c.id, c.sortOrder]))
          const loadedCustoms = customAllocs
            .map((a) => {
              const cat = data.categories.find((c) => c.id === a.categoryId)
              return {
                id: a.categoryId,
                name: cat?.name ?? t('transactions.categories', 'Danh mục'),
                icon: cat?.icon ?? '🏷️',
                percent: a.allocationPercent,
              }
            })
            .sort((a, b) => {
              const orderA = categoryOrderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER
              const orderB = categoryOrderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER
              return orderA - orderB
            })

          const dailyP = dailyAlloc ? dailyAlloc.allocationPercent : 50
          const savingsP = savingsAlloc ? savingsAlloc.allocationPercent : 20
          const fixedP = fixedAlloc ? fixedAlloc.allocationPercent : 30

          initializeFromPlan(dailyP, savingsP, loadedCustoms, fixedP)
          setInitialValues({
            income: inc,
            payDay,
            dailyPercent: dailyP,
            savingsPercent: savingsP,
            fixedBillsPercent: fixedP,
            customItems: loadedCustoms.map((c) => ({ id: c.id, percent: c.percent, name: c.name })),
          })
        } else {
          setIncome(10_000_000)
          initializeFromPlan(50, 20, [], 30)
          setInitialValues({
            income: 10_000_000,
            payDay,
            dailyPercent: 50,
            savingsPercent: 20,
            fixedBillsPercent: 30,
            customItems: [],
          })
        }
      })
      .catch((err) => {
        if (!active) return
        setBudgetErrorMsg(err instanceof Error ? err.message : t('common.error', 'Lỗi'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [currentCycleMonth, t, initializeFromPlan, setFixedBills, setMonthlyIncome, setBudgetPlan, payDay])

  // ── Dirty State Checking (hasChanges / isDirty) ──
  const hasChanges = useMemo(() => {
    if (!initialValues) return false

    // 1. Monthly Income comparison
    const incomeChanged = Math.round(Number(income) || 0) !== Math.round(Number(initialValues.income) || 0)

    // 2. Cycle Start Day (Payday) comparison
    const paydayChanged = Number(selectedPayDay) !== Number(initialValues.payDay)

    // 3. Allocations (Daily Expenses, Savings, Fixed Bills) comparison
    const dailyChanged = dailyPercent !== initialValues.dailyPercent
    const savingsChanged = savingsPercent !== initialValues.savingsPercent
    const fixedBillsChanged = fixedBillsPercent !== initialValues.fixedBillsPercent

    // 4. Custom Categories comparison
    const customsChanged =
      customItems.length !== initialValues.customItems.length ||
      customItems.some((item) => {
        const initial = initialValues.customItems.find((c) => c.id === item.id)
        return !initial || initial.percent !== item.percent || initial.name.trim() !== item.name.trim()
      })

    return incomeChanged || paydayChanged || dailyChanged || savingsChanged || fixedBillsChanged || customsChanged
  }, [
    initialValues,
    income,
    selectedPayDay,
    dailyPercent,
    savingsPercent,
    fixedBillsPercent,
    customItems,
  ])

  // Formatted income input display
  const formattedIncome = useMemo(() => {
    if (income === 0) return ''
    return new Intl.NumberFormat('en-US').format(income)
  }, [income])

  const handleIncomeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '')
    const val = raw ? parseInt(raw, 10) : 0
    setIncome(val)
  }

  // Handle Fixed Bills modal save
  const handleSaveFixedBills = (updatedBills: FixedBillItem[]) => {
    setFixedBills(updatedBills)
    try {
      localStorage.setItem(`budget_fixed_bills_${currentCycleMonth}`, JSON.stringify(updatedBills))
      localStorage.setItem('budget_fixed_bills_default', JSON.stringify(updatedBills))
    } catch {
      // ignore
    }
  }

  // Handle Save Budget Plan (Independent Form Submit)
  const handleSaveBudgetPlan = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isAllocationValid) {
      setBudgetErrorMsg(t('plan.errorSum', { current: totalPercent }))
      return
    }

    setSavingBudget(true)
    setBudgetErrorMsg(null)
    setBudgetSaveSuccess(false)

    try {
      // 1. Save fixed bills to localStorage (and set as default template for upcoming months)
      try {
        localStorage.setItem(`budget_fixed_bills_${currentCycleMonth}`, JSON.stringify(fixedBills))
        localStorage.setItem('budget_fixed_bills_default', JSON.stringify(fixedBills))
      } catch {
        // ignore
      }

      // 2. Sync custom budget category names without mutating Display Order (sortOrder)
      for (let i = 0; i < customItems.length; i++) {
        const item = customItems[i]
        const existingCat = await budgetCategoryRepository.findById(item.id)
        if (existingCat) {
          await budgetCategoryRepository.update(item.id, {
            name: item.name.trim() || t('transactions.categories', 'Danh mục'),
          })
        } else {
          await budgetCategoryRepository.create({
            id: item.id,
            name: item.name.trim() || t('transactions.categories', 'Danh mục'),
            icon: item.icon || '🏷️',
            sortOrder: i + 4,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
        }
      }

      // 3. Prepare allocations
      const allocations = [
        { categoryId: 'cat-expenses', allocationPercent: dailyPercent },
        { categoryId: 'cat-fixed', allocationPercent: fixedBillsPercent },
        { categoryId: 'cat-savings', allocationPercent: savingsPercent },
        ...customItems.map((c) => ({
          categoryId: c.id,
          allocationPercent: c.percent,
        })),
      ]

      const safeIncome = Math.max(0, Math.round(income))
      // Always save for this month AND set as default template for all subsequent months
      await saveMonthlyPlan(
        {
          month: currentCycleMonth,
          incomeVnd: safeIncome,
          allocations,
        },
        true,
      )

      if (selectedPayDay !== payDay) {
        setPayDay(selectedPayDay)
      }

      setMonthlyIncome(safeIncome)
      setBudgetPlan({
        month: currentCycleMonth,
        incomeVnd: safeIncome,
        allocations,
      })

      // 4. Refresh global Daily Limit state in SettingsContext for Dashboard & Report
      await refreshDailyLimit()

      // Reset dirty state to current saved values
      setInitialValues({
        income: safeIncome,
        payDay: selectedPayDay,
        dailyPercent,
        savingsPercent,
        fixedBillsPercent,
        customItems: customItems.map((c) => ({ id: c.id, percent: c.percent, name: c.name })),
      })

      setBudgetSaveSuccess(true)
      setTimeout(() => setBudgetSaveSuccess(false), 3000)
    } catch (err) {
      setBudgetErrorMsg(err instanceof Error ? err.message : t('plan.saveError', 'Lỗi khi lưu kế hoạch ngân sách.'))
    } finally {
      setSavingBudget(false)
    }
  }

  // Handle Save Payday Independently (Independent Action)
  const handleSavePayday = () => {
    setPayDay(selectedPayDay)
    setInitialValues((prev) => (prev ? { ...prev, payDay: selectedPayDay } : null))
    setPaydaySaveSuccess(true)
    setTimeout(() => setPaydaySaveSuccess(false), 3000)
  }

  return (
    <PageContainer title={t('app.settings', 'Cài Đặt')}>
      <div className="space-y-5 pb-8 w-full min-w-0 max-w-full box-border">
        {/* ========================================================
            SECTION 1: Monthly Budget Plan (MAIN FOCUS - TOP PRIORITY)
            ======================================================== */}
        <form onSubmit={handleSaveBudgetPlan} className="space-y-4">
          <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-5 shadow-2xs space-y-4 transition-colors box-border">
            {/* Header with Title */}
            <div className="flex items-center gap-2.5 border-b border-[var(--color-border)] pb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--color-income-soft)] text-[var(--color-income)] shrink-0">
                <Coins className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-bold text-[var(--color-text-primary)] leading-tight">
                  {t('plan.title', 'Kế Hoạch Ngân Sách')}
                </h2>
              </div>
            </div>

            {loading ? (
              <div className="py-12 flex justify-center">
                <LoadingSpinner label={t('common.loading', 'Đang tải…')} />
              </div>
            ) : (
              <>
                {/* 1. Monthly Income Formatted Input */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="income-input"
                    className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]"
                  >
                    {t('plan.incomeLabel', 'Tổng Thu Nhập Hàng Tháng (Monthly Income)')}
                  </label>
                  <div className="relative">
                    <input
                      id="income-input"
                      type="text"
                      inputMode="numeric"
                      value={formattedIncome}
                      onChange={handleIncomeChange}
                      placeholder="10,000,000"
                      className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)] pl-4 pr-14 py-3.5 text-base sm:text-lg font-bold amount-display text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:bg-[var(--color-bg-surface)] focus:border-[var(--color-border-focused)] focus:outline-none transition-colors box-border"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--color-text-muted)]">
                      VND
                    </span>
                  </div>
                </div>

                {/* 2. Prominent Daily Spending Limit Preview Callout */}
                <div className="rounded-2xl border border-[var(--color-income-border)] bg-[var(--color-income-soft)] p-4 text-xs box-border space-y-1.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[var(--color-text-primary)] flex items-center gap-1.5">
                      <Wallet className="h-4 w-4 text-[var(--color-income)] shrink-0" />
                      <span>{t('plan.calculatedDaily', 'Hạn Mức Chi Tiêu Mỗi Ngày')}:</span>
                    </span>
                    <span className="text-xl font-extrabold amount-display text-[var(--color-income)]">
                      {formatVnd(calculatedDailyLimit)} 
                    </span>
                  </div>
                </div>

                {/* 4. Budget Allocation Categories List */}
                <div className="space-y-3 pt-1">
                  {/* ===================================================
                      CATEGORY 1: Daily Expenses (Mandatory Default)
                      =================================================== */}
                  <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-3.5 space-y-2.5 box-border">
                    <div className="flex items-center justify-between gap-2.5 sm:gap-3 w-full">
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                        <div className="p-1 shrink-0 text-[var(--color-text-muted)]" title={t('plan.defaultLocked', 'Hạng mục mặc định')}>
                          <Lock className="h-3.5 w-3.5" />
                        </div>
                        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[var(--color-bg-surface)] text-sm shadow-2xs shrink-0 text-[var(--color-primary)]">
                          <CategoryIconRenderer icon="🛒" size={16} />
                        </span>
                        <span className="font-bold text-xs text-[var(--color-text-primary)] min-w-0 flex-1 whitespace-normal break-words">
                          {t('plan.cat_expenses', 'Chi Tiêu Hàng Ngày (Daily Expenses)')}
                        </span>
                      </div>

                      <PercentageInput
                        value={dailyPercent}
                        onChange={setDailyPercent}
                        ariaLabel="Daily Expenses Percent"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)]/60 text-xs">
                      <span className="text-[11px] text-[var(--color-text-muted)]">
                        {t('plan.allocatedAmount', 'Số tiền phân bổ')}:
                      </span>
                      <span className="font-bold text-xs text-[var(--color-text-primary)] amount-display">
                        {formatVnd(dailyExpensesAmount)}
                      </span>
                    </div>
                  </div>

                  {/* ===================================================
                      CATEGORY 2: Fixed Bills (Mandatory Default - CLICKABLE)
                      Layout identical, clickable to open ManageFixedBillsModal
                      =================================================== */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setIsFixedBillsModalOpen(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        setIsFixedBillsModalOpen(true)
                      }
                    }}
                    className="rounded-2xl border-2 border-[var(--color-primary)]/30 bg-[var(--color-bg-surface)] p-3.5 space-y-2.5 box-border cursor-pointer hover:border-[var(--color-primary)] transition-all active:scale-[0.99] shadow-2xs group"
                  >
                    <div className="flex items-center justify-between gap-2.5 sm:gap-3 w-full">
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                        <div className="p-1 shrink-0 text-[var(--color-text-muted)]" title={t('plan.defaultLocked', 'Hạng mục mặc định')}>
                          <Lock className="h-3.5 w-3.5" />
                        </div>
                        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-sm shadow-2xs shrink-0 text-[var(--color-primary)]">
                          <Receipt className="h-4 w-4" />
                        </span>
                        <div className="flex items-center gap-1.5 min-w-0 flex-1 flex-wrap">
                          <span className="font-bold text-xs text-[var(--color-text-primary)] whitespace-normal break-words group-hover:text-[var(--color-primary)] transition-colors">
                            {t('plan.cat_fixed', 'Hóa Đơn Cố Định (Fixed Bills)')}
                          </span>
                          <span className="text-[10px] font-semibold text-[var(--color-primary)] bg-[var(--color-primary-soft)] px-1.5 py-0.5 rounded-md shrink-0 border border-[var(--color-primary)]/20 inline-flex items-center gap-0.5">
                            <Settings2 className="h-3 w-3" />
                            <span>{fixedBills.length} {t('settings.billsCountUnit', 'khoản')}</span>
                          </span>
                        </div>
                      </div>

                      <PercentageInput
                        value={fixedBillsPercent}
                        readOnly={true}
                        ariaLabel="Fixed Bills Percent"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)]/60 text-xs">
                      <span className="text-[11px] text-[var(--color-primary)] group-hover:underline flex items-center gap-1">
                        <span>{t('plan.clickToManageBills', 'Chạm để sửa chi tiết các khoản')}</span>
                        <span>→</span>
                      </span>
                      <span className="font-bold text-xs text-[var(--color-text-primary)] amount-display">
                        {formatVnd(fixedBillsTotalVnd)}
                      </span>
                    </div>
                  </div>

                  {/* ===================================================
                      CATEGORY 3: Savings (Mandatory Default - Fixed Pos 3)
                      =================================================== */}
                  <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-3.5 space-y-2.5 box-border">
                    <div className="flex items-center justify-between gap-2.5 sm:gap-3 w-full">
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                        <div className="p-1 shrink-0 text-[var(--color-text-muted)]" title={t('plan.defaultLocked', 'Hạng mục mặc định')}>
                          <Lock className="h-3.5 w-3.5" />
                        </div>
                        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[var(--color-bg-surface)] text-sm shadow-2xs shrink-0 text-[var(--color-primary)]">
                          <CategoryIconRenderer icon="🏦" size={16} />
                        </span>
                        <span className="font-bold text-xs text-[var(--color-text-primary)] min-w-0 flex-1 whitespace-normal break-words">
                          {t('plan.cat_savings', 'Tiết Kiệm (Savings)')}
                        </span>
                      </div>

                      <PercentageInput
                        value={savingsPercent}
                        onChange={setSavingsPercent}
                        ariaLabel="Savings Percent"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)]/60 text-xs">
                      <span className="text-[11px] text-[var(--color-text-muted)]">
                        {t('plan.allocatedAmount', 'Số tiền phân bổ')}:
                      </span>
                      <span className="font-bold text-xs text-[var(--color-text-primary)] amount-display">
                        {formatVnd(savingsAmount)}
                      </span>
                    </div>
                  </div>

                  {/* ===================================================
                      CATEGORY 4+: Custom Categories (Sorted strictly by Display Order)
                      =================================================== */}
                  {(() => {
                    const customCatsSorted = [...allCategories]
                      .filter((c) => !isBaseBudgetCategory(c.id))
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                    const customItemsMap = new Map(customItems.map((ci) => [ci.id, ci]))
                    const renderedIds = new Set<string>()
                    const orderedNodes: React.ReactNode[] = []

                    const renderAllocatedItem = (item: (typeof customItems)[number], catDef?: BudgetCategory) => {
                      const itemAllocated = Math.round((income * item.percent) / 100)
                      return (
                        <div
                          key={item.id}
                          data-testid={`budget-plan-custom-item-${item.id}`}
                          className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-3.5 space-y-2.5 box-border transition-colors hover:border-[var(--color-border-focused)]/50"
                        >
                          <div className="flex items-center justify-between gap-2.5 sm:gap-3 w-full">
                            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[var(--color-bg-surface)] text-sm shadow-2xs shrink-0 text-[var(--color-primary)]">
                                <CategoryIconRenderer icon={item.icon} size={16} />
                              </span>
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <input
                                  type="text"
                                  value={item.name}
                                  onChange={(e) => updateCustomItemName(item.id, e.target.value)}
                                  className="font-bold text-xs text-[var(--color-text-primary)] bg-transparent border-b border-transparent focus:border-[var(--color-border-focused)] focus:outline-none min-w-0 flex-1 truncate"
                                  placeholder={t('plan.categoryNamePlaceholder', 'Tên danh mục')}
                                />
                                <button
                                  type="button"
                                  onClick={() => removeCustomItem(item.id)}
                                  className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-expense)] cursor-pointer rounded-lg hover:bg-[var(--color-expense-soft)] transition-colors shrink-0"
                                  title={t('plan.deleteCategory', 'Xóa danh mục')}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>

                            <PercentageInput
                              value={item.percent}
                              onChange={(val) => setCustomItemPercent(item.id, val)}
                              ariaLabel={`${item.name} percent`}
                            />
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)]/60 text-xs">
                            {catDef?.enableItemizedRecords ? (
                              <button
                                type="button"
                                onClick={() => setSelectedRecordCategory(catDef)}
                                className="text-[11px] text-[var(--color-primary)] hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <span>{t('records.clickToManage', 'Chạm để sửa chi tiết các khoản')}</span>
                                <span>→</span>
                              </button>
                            ) : (
                              <span className="text-[11px] text-[var(--color-text-muted)]">
                                {t('plan.allocatedAmount', 'Số tiền phân bổ')}:
                              </span>
                            )}
                            <span className="font-bold text-xs text-[var(--color-text-primary)] amount-display">
                              {formatVnd(itemAllocated)}
                            </span>
                          </div>
                        </div>
                      )
                    }

                    for (const cat of customCatsSorted) {
                      if (cat.enableItemizedRecords && cat.excludeFromExpenseTracking) {
                        renderedIds.add(cat.id)
                        const catRecords = allRecords.filter(
                          (r) => r.categoryId === cat.id && r.date.startsWith(currentCycleMonth),
                        )
                        const catTotal = catRecords.reduce((sum, r) => sum + r.amount, 0)
                        orderedNodes.push(
                          <div
                            key={cat.id}
                            data-testid={`budget-plan-custom-item-${cat.id}`}
                            role="button"
                            tabIndex={0}
                            onClick={() => setSelectedRecordCategory(cat)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                setSelectedRecordCategory(cat)
                              }
                            }}
                            className="rounded-2xl border-2 border-purple-500/30 bg-[var(--color-bg-surface)] p-3.5 space-y-2.5 box-border cursor-pointer hover:border-purple-500 transition-all active:scale-[0.99] shadow-2xs group"
                          >
                            <div className="flex items-center justify-between gap-2.5 sm:gap-3 w-full">
                              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-purple-500/15 text-sm shadow-2xs shrink-0 text-purple-600 dark:text-purple-400">
                                  <CategoryIconRenderer icon={cat.icon || 'Layers'} size={16} />
                                </span>
                                <div className="flex items-center gap-1.5 min-w-0 flex-1 flex-wrap">
                                  <span className="font-bold text-xs text-[var(--color-text-primary)] whitespace-normal break-words group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                                    {cat.name}
                                  </span>
                                  <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-500/15 px-1.5 py-0.5 rounded-md shrink-0 border border-purple-500/20 inline-flex items-center gap-0.5">
                                    <span>{catRecords.length} {t('records.itemsUnit', 'khoản')}</span>
                                  </span>
                                </div>
                              </div>

                              <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-1 rounded-xl border border-purple-500/20 shrink-0">
                                {t('transactions.excludedBadge', 'Tách riêng')}
                              </span>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)]/60 text-xs">
                              <span className="text-[11px] text-purple-600 dark:text-purple-400 group-hover:underline flex items-center gap-1">
                                <span>{t('records.clickToManage', 'Chạm để sửa chi tiết các khoản')}</span>
                                <span>→</span>
                              </span>
                              <span className="font-bold text-xs text-[var(--color-text-primary)] amount-display">
                                {formatVnd(catTotal)}
                              </span>
                            </div>
                          </div>,
                        )
                        continue
                      }

                      const matchedItem = customItemsMap.get(cat.id)
                      if (matchedItem) {
                        renderedIds.add(cat.id)
                        orderedNodes.push(renderAllocatedItem(matchedItem, cat))
                      }
                    }

                    for (const item of customItems) {
                      if (!renderedIds.has(item.id)) {
                        orderedNodes.push(renderAllocatedItem(item))
                      }
                    }

                    return orderedNodes
                  })()}

                  {/* Single Budget Category Management Entry Point */}
                  <button
                    type="button"
                    data-testid="budget-manage-categories-btn"
                    onClick={() => setIsCategoryModalOpen(true)}
                    className="w-full py-2.5 px-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)] text-xs font-bold text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-border)] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer box-border"
                    title={t('transactions.categoryManagerTitle', 'Quản Lý Danh Mục')}
                  >
                    <Settings2 className="h-4 w-4 shrink-0" />
                    <span>{t('transactions.categoryManagerTitle', 'Quản Lý Danh Mục')}</span>
                  </button>
                </div>

                {budgetErrorMsg && (
                  <p className="rounded-xl border border-[var(--color-expense-border)] bg-[var(--color-expense-soft)] p-3 text-xs text-[var(--color-expense)] font-medium text-center">
                    ⚠️ {budgetErrorMsg}
                  </p>
                )}

                {budgetSaveSuccess && (
                  <p className="rounded-xl border border-[var(--color-income-border)] bg-[var(--color-income-soft)] p-3 text-xs text-[var(--color-income)] font-bold text-center flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{t('plan.saveSuccess', 'Đã lưu kế hoạch ngân sách thành công!')}</span>
                  </p>
                )}

                {/* Save Budget Button (Independent Form Action) */}
                <button
                  type="submit"
                  disabled={!hasChanges || savingBudget || !isAllocationValid}
                  className={`w-full rounded-2xl px-5 py-3.5 text-center text-sm font-bold transition-all flex items-center justify-center gap-2 box-border ${
                    !hasChanges || savingBudget || !isAllocationValid
                      ? 'bg-gray-200 text-gray-400 dark:bg-gray-800 dark:text-gray-500 cursor-not-allowed opacity-60 shadow-none border border-[var(--color-border)]'
                      : 'bg-[var(--color-primary)] text-white shadow-md hover:bg-[var(--color-primary-hover)] active:scale-[0.99] cursor-pointer'
                  }`}
                >
                  <Save className="h-4 w-4" />
                  <span>
                    {savingBudget ? t('plan.savingBtn', 'Đang Lưu…') : t('plan.saveBtn', 'Lưu Kế Hoạch Ngân Sách')}
                  </span>
                </button>
              </>
            )}
          </div>
        </form>

        {/* ========================================================
            SECTION 2: Cycle Start Day (Payday) (SECONDARY SECTION)
            Compact layout with independent Save action
            ======================================================== */}
        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-2xs transition-colors overflow-hidden box-border">
          {/* Header Toggle Button */}
          <button
            type="button"
            onClick={() =>
              setIsPaydayOpen((prev) => {
                if (!prev) setSelectedPayDay(payDay)
                return !prev
              })
            }
            className="w-full flex items-center justify-between p-4 text-left cursor-pointer hover:bg-[var(--color-bg-subtle)] transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)] shrink-0">
                <CalendarRange className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-xs font-bold text-[var(--color-text-primary)] leading-tight truncate">
                  {t('settings.compactPayday', 'Ngày Bắt Đầu Chu Kỳ (Payday)')}
                </h2>
                <p className="text-[10px] text-[var(--color-text-muted)] truncate font-mono">
                  {t('settings.dayOption', { day: payDay })} {t('settings.defaultPaydayNotice', '(Mặc định: ngày 1)')}
                </p>
              </div>
            </div>

            {/* Current Selected Day Badge & Chevron */}
            <div className="flex items-center gap-2 shrink-0 ml-2">
              <span className="rounded-lg bg-[var(--color-primary-soft)] px-2.5 py-1 text-xs font-bold text-[var(--color-primary)] border border-[var(--color-primary)]/20">
                {t('settings.dayOption', { day: selectedPayDay })}
              </span>
              <ChevronDown
                className={`h-4 w-4 text-[var(--color-text-muted)] transition-transform duration-200 ${isPaydayOpen ? 'rotate-180' : ''
                  }`}
              />
            </div>
          </button>

          {/* Expanded Content with Fixed Height Day Picker & Independent Save Button */}
          {isPaydayOpen && (
            <div className="border-t border-[var(--color-border)] p-4 pt-3 space-y-3 bg-[var(--color-bg-surface)] box-border">
              {/* Quick preset chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full max-w-full box-border">
                <span className="text-[10px] font-semibold text-[var(--color-text-muted)] shrink-0">
                  {t('settings.quickSelect', 'Chọn nhanh:')}
                </span>
                {[1, 5, 10, 15, 20, 25].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setSelectedPayDay(d)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all active:scale-95 shrink-0 cursor-pointer ${selectedPayDay === d
                        ? 'bg-[var(--color-primary)] text-white shadow-2xs'
                        : 'bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-border)]'
                      }`}
                  >
                    {d === 1 ? '1' : `${d}`}
                  </button>
                ))}
              </div>

              {/* Day Selection Label */}
              <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--color-text-muted)]">
                <span>{t('settings.selectDayLabel', 'Chọn ngày bất kỳ trong tháng (1 - 28):')}</span>
                <span className="text-[var(--color-primary)] font-bold">
                  {t('settings.dayOption', { day: selectedPayDay })}
                </span>
              </div>

              {/* Fixed Height Day Picker Grid (h-36, exactly 144px, prevents layout shift) */}
              <div className="h-36 overflow-y-auto overflow-x-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-2 box-border">
                <div className="grid grid-cols-7 gap-1.5 w-full">
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setSelectedPayDay(d)}
                      className={`h-8 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center justify-center ${selectedPayDay === d
                          ? 'bg-[var(--color-primary)] text-white shadow-2xs font-extrabold'
                          : 'border border-[var(--color-border)] bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] hover:bg-[var(--color-border)]'
                        }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {paydaySaveSuccess && (
                <p className="rounded-xl border border-[var(--color-income-border)] bg-[var(--color-income-soft)] p-2 text-xs text-[var(--color-income)] font-bold text-center flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>{t('settings.savePaydaySuccess', 'Đã lưu ngày bắt đầu chu kỳ thành công!')}</span>
                </p>
              )}

              {/* Independent Payday Save Button */}
              <button
                type="button"
                onClick={handleSavePayday}
                disabled={selectedPayDay === payDay && !paydaySaveSuccess}
                className="w-full py-2.5 rounded-xl bg-[var(--color-primary)] text-xs font-bold text-white shadow-xs hover:bg-[var(--color-primary-hover)] active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all flex items-center justify-center gap-1.5"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{t('settings.savePaydayBtn', 'Lưu Ngày Bắt Đầu')}</span>
              </button>
            </div>
          )}
        </div>

        {/* ========================================================
            SECTION 3: Manage Quick Templates (Quản lý biểu mẫu nhanh)
            ======================================================== */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setIsTemplateModalOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              setIsTemplateModalOpen(true)
            }
          }}
          className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-4 sm:p-5 shadow-2xs space-y-3 transition-all hover:border-[var(--color-primary)] cursor-pointer active:scale-[0.99] group box-border"
        >
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0 group-hover:scale-105 transition-transform">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-primary)] transition-colors leading-tight">
                    {t('settings.manageTemplatesTitle', 'Quản lý biểu mẫu nhanh')}
                  </h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                    {quickTemplates.length}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 text-xs font-bold text-[var(--color-primary)]">
              <span className="hidden sm:inline">{t('common.edit', 'Chỉnh sửa')}</span>
              <ChevronRight className="h-4 w-4 text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)] group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>

          {/* Quick preview of template chips */}
          {quickTemplates.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
              {quickTemplates.slice(0, 5).map((tpl) => (
                <span
                  key={tpl.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[var(--color-bg-subtle)] border border-[var(--color-border)] text-[11px] font-semibold text-[var(--color-text-secondary)] shrink-0"
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${tpl.type === 'income' ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                  />
                  <span className="truncate max-w-[120px]">{tpl.name}</span>
                </span>
              ))}
              {quickTemplates.length > 5 && (
                <span className="text-[10px] font-bold text-[var(--color-text-muted)] px-1 shrink-0">
                  +{quickTemplates.length - 5}
                </span>
              )}
            </div>
          )}
        </div>

        {/* ===================================================
            SECTION 4: Danger Zone - Reset All Data
            =================================================== */}
        <div className="rounded-3xl border border-rose-500/30 bg-rose-500/5 p-4 sm:p-5 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <h3 className="text-sm font-bold uppercase tracking-wider">
              {t('settings.dangerZoneTitle', 'Khu Vực Nguy Hiểm')}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setIsResetModalOpen(true)}
            className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-[0.99] text-white text-xs font-bold shadow-xs cursor-pointer transition-all flex items-center justify-center gap-2"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>{t('settings.resetAppDataBtn', 'Xóa toàn bộ dữ liệu')}</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Reset All Data */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-hidden">
          <div className="w-full max-w-sm rounded-3xl border border-rose-500/40 bg-[var(--color-bg-surface)] p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 mx-auto">
              <AlertTriangle className="h-6 w-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                {t('settings.resetModalTitle', 'Xác Nhận Xóa Toàn Bộ Dữ Liệu?')}
              </h3>
              <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                {t(
                  'settings.resetModalWarning',
                  'Hành động này sẽ xóa toàn bộ giao dịch, cài đặt ngân sách và không thể khôi phục. Bạn có chắc chắn muốn tiếp tục?',
                )}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                disabled={isResetting}
                className="py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)] text-xs font-bold text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] cursor-pointer transition-all"
              >
                {t('common.cancel', 'Hủy')}
              </button>
              <button
                type="button"
                onClick={() => void handleResetAllData()}
                disabled={isResetting}
                className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-xs font-bold text-white shadow-md disabled:opacity-50 cursor-pointer transition-all flex items-center justify-center gap-1.5"
              >
                {isResetting ? (
                  <span>{t('settings.resetting', 'Đang xóa…')}</span>
                ) : (
                  <span>{t('settings.confirmResetBtn', 'Xác nhận xóa')}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Fixed Bills Modal */}
      {isFixedBillsModalOpen && (
        <ManageFixedBillsModal
          isOpen={isFixedBillsModalOpen}
          onClose={() => setIsFixedBillsModalOpen(false)}
          bills={fixedBills}
          onSaveBills={handleSaveFixedBills}
          monthlyIncome={income}
          initialMonth={currentCycleMonth}
        />
      )}

      {/* Manage Quick Templates Modal (uses Expense Categories) */}
      <ManageQuickTemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        categories={expenseCategories}
      />

      {/* Budget Category Manager Modal (uses Budget Categories) */}
      <BudgetCategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categories={allCategories}
        onCategoriesChanged={handleBudgetCategoriesChanged}
      />

      {/* Itemized Category Records Modal */}
      {selectedRecordCategory && (
        <ManageCategoryRecordsModal
          isOpen={Boolean(selectedRecordCategory)}
          onClose={() => setSelectedRecordCategory(null)}
          categoryId={selectedRecordCategory.id}
          categoryName={selectedRecordCategory.name}
          categoryIcon={selectedRecordCategory.icon}
          initialMonth={currentCycleMonth}
          onRecordsChanged={reloadCategoriesAndRecords}
        />
      )}
    </PageContainer>
  )
}
