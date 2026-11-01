import React, { useEffect, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import {
  Calendar,
  Save,
  Coins,
  CheckCircle2,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Lock,
  GripVertical,
  ChevronUp,
  ChevronDown,
} from 'lucide-react'
import {
  DndContext,
  closestCenter,
  TouchSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { PageContainer } from '@/components/layout/PageContainer'
import { useSettings } from '@/context/useSettings'
import { getTodayString, formatVnd } from '@/services/dateService'
import {
  getPaydayCycle,
  getCycleMonthForDate,
  shiftMonthId,
  type PaydayCycle,
} from '@/features/reports/paydayCycle'
import {
  getPlanWithAllocations,
  saveMonthlyPlan,
  type PlanWithDetails,
} from '@/features/monthly-plans/monthlyPlanService'
import { calculateDailyLimit } from '@/domain/budgetCalculator'
import { categoryRepository } from '@/repositories/categoryRepository'
import { CategoryIconRenderer } from '@/components/ui/CategoryIconRenderer'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export interface BudgetItemState {
  id: string
  name: string
  icon: string
  percent: number
}

const DEFAULT_CATEGORY_IDS = new Set(['cat-expenses', 'cat-fixed', 'cat-savings'])

function isDefaultCategory(id: string): boolean {
  return DEFAULT_CATEGORY_IDS.has(id)
}

function getDefaultCategoryName(id: string, t: TFunction): string {
  switch (id) {
    case 'cat-expenses':
      return t('plan.cat_expenses', { defaultValue: 'Chi Tiêu Hàng Ngày' })
    case 'cat-fixed':
      return t('plan.cat_fixed', { defaultValue: 'Chi Phí Cố Định' })
    case 'cat-savings':
      return t('plan.cat_savings', { defaultValue: 'Tiết Kiệm' })
    default:
      return ''
  }
}

const DEFAULT_BUDGET_ITEMS: BudgetItemState[] = [
  { id: 'cat-expenses', name: 'Daily Expenses', icon: '🛒', percent: 50 },
  { id: 'cat-fixed', name: 'Fixed Amount', icon: '🏠', percent: 30 },
  { id: 'cat-savings', name: 'Savings', icon: '🏦', percent: 20 },
]

interface SortableBudgetItemProps {
  item: BudgetItemState
  index: number
  totalItems: number
  income: number
  onPercentChange: (id: string, val: string) => void
  onNameChange: (id: string, newName: string) => void
  onRemove: (id: string) => void
  onMove: (index: number, direction: 'up' | 'down') => void
}

function SortableBudgetItem({
  item,
  index,
  totalItems,
  income,
  onPercentChange,
  onNameChange,
  onRemove,
  onMove,
}: SortableBudgetItemProps) {
  const { t } = useTranslation()
  const isDefault = isDefaultCategory(item.id)
  const allocatedAmount = Math.round(((Number(item.percent) || 0) / 100) * income)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    disabled: isDefault,
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-2xl border bg-[var(--color-bg-subtle)] p-3 space-y-2 transition-all box-border w-full max-w-full ${
        isDragging
          ? 'opacity-60 border-2 border-[var(--color-primary)] shadow-lg scale-[1.02]'
          : 'border-[var(--color-border)] hover:border-[var(--color-border-focused)]/50'
      }`}
    >
      {/* Row 1: Drag handle, Icon, Editable/Locked Name, Quick reorder, Delete */}
      <div className="flex items-center justify-between gap-2 w-full max-w-full box-border">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Drag Handle: Locked for default categories (Daily Expenses, Fixed Amount, Savings), draggable for custom categories */}
          {isDefault ? (
            <div
              className="p-1 shrink-0 text-[var(--color-text-muted)]"
              title={t('plan.defaultLocked', 'Hạng mục mặc định cố định')}
            >
              <Lock className="h-3.5 w-3.5" />
            </div>
          ) : (
            <button
              type="button"
              {...attributes}
              {...listeners}
              className="touch-none cursor-grab active:cursor-grabbing text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] p-1 shrink-0 rounded-lg hover:bg-[var(--color-bg-surface)] active:scale-95"
              style={{ touchAction: 'none' }}
              title={t('plan.dragToReorder', 'Kéo thả để sắp xếp')}
              aria-label={t('plan.dragToReorder', 'Kéo thả')}
            >
              <GripVertical className="h-4 w-4" />
            </button>
          )}

          {/* Category Icon */}
          <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[var(--color-bg-surface)] text-sm shadow-2xs shrink-0 text-[var(--color-primary)]">
            <CategoryIconRenderer icon={item.icon} size={16} />
          </span>

          {/* Category Name: Locked for default categories, Editable for custom categories */}
          {isDefault ? (
            <div className="flex items-center min-w-0 flex-1 gap-1.5">
              <span className="font-bold text-xs text-[var(--color-text-primary)] truncate">
                {getDefaultCategoryName(item.id, t)}
              </span>
              <span className="text-[10px] font-bold text-[var(--color-primary)] bg-[var(--color-primary-soft)] px-1.5 py-0.5 rounded-md shrink-0 border border-[var(--color-primary)]/20">
                {t('plan.defaultCategory', 'Mặc định')}
              </span>
            </div>
          ) : (
            <input
              type="text"
              value={item.name}
              onChange={(e) => onNameChange(item.id, e.target.value)}
              className="font-bold text-xs text-[var(--color-text-primary)] bg-transparent border-b border-transparent focus:border-[var(--color-border-focused)] focus:outline-none min-w-0 flex-1 truncate"
              placeholder={t('plan.categoryNamePlaceholder', 'Tên danh mục')}
            />
          )}
        </div>

        {/* Actions: Move Up / Down & Delete (Only for custom categories, hidden for default categories) */}
        <div className="flex items-center gap-0.5 shrink-0">
          {!isDefault && (
            <>
              <button
                type="button"
                disabled={index <= 3}
                onClick={() => onMove(index, 'up')}
                className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                aria-label={t('plan.moveUp', 'Lên')}
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                disabled={index === totalItems - 1}
                onClick={() => onMove(index, 'down')}
                className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                aria-label={t('plan.moveDown', 'Xuống')}
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={() => onRemove(item.id)}
                className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-expense)] cursor-pointer ml-1 rounded-lg hover:bg-[var(--color-expense-soft)] transition-colors"
                title={t('plan.deleteCategory', 'Xóa danh mục')}
                aria-label={t('plan.deleteCategory', 'Xóa danh mục')}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Row 2: Direct % Input and Auto-calculated Money */}
      <div className="flex items-center justify-between gap-3 pt-1 border-t border-[var(--color-border)]/60 w-full max-w-full box-border">
        {/* % Input */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] font-semibold text-[var(--color-text-secondary)]">
            {t('plan.ratio', 'Tỷ lệ:')}
          </span>
          <div className="relative flex items-center">
            <input
              type="number"
              min="0"
              max="100"
              value={item.percent === 0 ? '' : item.percent}
              onChange={(e) => onPercentChange(item.id, e.target.value)}
              placeholder="0"
              className="w-14 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-2 py-1 text-center text-xs font-bold text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-border-focused)]"
            />
            <span className="ml-1 text-xs font-bold text-[var(--color-text-muted)]">
              %
            </span>
          </div>
        </div>

        {/* Auto-calculated Money Amount */}
        <div className="text-right min-w-0 flex-1">
          <span className="text-[10px] text-[var(--color-text-muted)] block truncate">
            {t('plan.allocatedAmount', 'Số tiền phân bổ')}
          </span>
          <span className="text-xs font-bold text-[var(--color-text-primary)] amount-display truncate block">
            {formatVnd(allocatedAmount)}
          </span>
        </div>
      </div>
    </div>
  )
}

export function SettingsPage() {
  const { t } = useTranslation()
  const { payDay, setPayDay, refreshDailyLimit } = useSettings()
  const todayStr = useMemo(() => getTodayString(), [])
  const initialCycleMonth = useMemo(() => getCycleMonthForDate(todayStr, payDay), [todayStr, payDay])

  // Selected Billing Cycle month
  const [selectedMonth, setSelectedMonth] = useState<string>(initialCycleMonth)
  const [isPaydayOpen, setIsPaydayOpen] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)
  const [saving, setSaving] = useState<boolean>(false)
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Monthly income & items
  const [income, setIncome] = useState<number>(10_000_000)
  const [items, setItems] = useState<BudgetItemState[]>(DEFAULT_BUDGET_ITEMS)

  // DND Sensors configured specifically for iOS Safari and mobile PWA
  const sensors = useSensors(
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200, // 200ms hold before drag begins (allows natural scrolling)
        tolerance: 5, // 5px movement tolerance
      },
    }),
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px movement on desktop before dragging
      },
    }),
  )

  // Current cycle details for selectedMonth
  const activeCycle: PaydayCycle = useMemo(() => {
    return getPaydayCycle(selectedMonth, payDay)
  }, [selectedMonth, payDay])

  // Load monthly plan
  useEffect(() => {
    let active = true

    getPlanWithAllocations(selectedMonth)
      .then((data: PlanWithDetails) => {
        if (!active) return
        if (data.plan && data.allocations.length > 0) {
          setIncome(data.plan.incomeVnd)
          const loadedItems: BudgetItemState[] = data.allocations.map((a) => {
            const cat = data.categories.find((c) => c.id === a.categoryId)
            return {
              id: a.categoryId,
              name: cat?.name ?? t('transactions.categories', 'Danh mục'),
              icon: cat?.icon ?? '📁',
              percent: a.allocationPercent,
            }
          })

          // Ensure the 3 default categories are ALWAYS pinned at indices 0, 1, 2:
          // 0: cat-expenses (Daily Expenses)
          // 1: cat-fixed (Fixed Amount)
          // 2: cat-savings (Savings)
          const dailyItem = loadedItems.find((it) => it.id === 'cat-expenses') ?? {
            id: 'cat-expenses',
            name: 'Daily Expenses',
            icon: '🛒',
            percent: 50,
          }
          const fixedItem = loadedItems.find((it) => it.id === 'cat-fixed') ?? {
            id: 'cat-fixed',
            name: 'Fixed Amount',
            icon: '🏠',
            percent: 30,
          }
          const savingsItem = loadedItems.find((it) => it.id === 'cat-savings') ?? {
            id: 'cat-savings',
            name: 'Savings',
            icon: '🏦',
            percent: 20,
          }
          const customItems = loadedItems.filter((it) => !DEFAULT_CATEGORY_IDS.has(it.id))
          setItems([dailyItem, fixedItem, savingsItem, ...customItems])
        } else {
          // Default initial state
          setIncome(10_000_000)
          setItems(DEFAULT_BUDGET_ITEMS)
        }
      })
      .catch((err) => {
        if (!active) return
        setErrorMsg(err instanceof Error ? err.message : t('common.error', 'Lỗi'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [selectedMonth, t])

  // Total allocation percentage
  const totalAllocationPercent = useMemo(() => {
    return items.reduce((sum, it) => sum + (Number(it.percent) || 0), 0)
  }, [items])

  const isAllocationValid = totalAllocationPercent === 100

  // Calculate daily budget preview strictly based on Daily Expenses (cat-expenses) and dynamic cycle days
  const dailyBudgetPreview = useMemo(() => {
    const expenseItem = items.find((it) => it.id === 'cat-expenses')
    const expensePercent = expenseItem ? Number(expenseItem.percent) || 0 : 0
    return calculateDailyLimit(income, expensePercent, activeCycle.totalDays)
  }, [items, income, activeCycle.totalDays])

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

  // Formatted income string (e.g. 10,000,000)
  const formattedIncome = useMemo(() => {
    if (income === 0) return ''
    return new Intl.NumberFormat('en-US').format(income)
  }, [income])

  const handleIncomeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '')
    const val = raw ? parseInt(raw, 10) : 0
    setIncome(val)
  }

  // Update category item percentage
  const handlePercentChange = (id: string, valStr: string) => {
    const parsed = valStr === '' ? 0 : Math.min(100, Math.max(0, parseInt(valStr, 10) || 0))
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, percent: parsed } : it)),
    )
  }

  // Update category item name
  const handleNameChange = (id: string, newName: string) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, name: newName } : it)),
    )
  }

  // Add new budget category
  const handleAddCategory = () => {
    const newItem: BudgetItemState = {
      id: `cat-${Date.now()}`,
      name: t('plan.newCategoryDefaultName', { index: items.length + 1 }),
      icon: '🏷️',
      percent: 0,
    }
    setItems((prev) => [...prev, newItem])
  }

  // Remove budget category (Default categories: Daily Expenses, Fixed Amount, Savings cannot be deleted)
  const handleRemoveCategory = (id: string) => {
    if (isDefaultCategory(id)) return
    setItems((prev) => prev.filter((it) => it.id !== id))
  }

  // Reorder: Move Up / Down (Default categories 0, 1, 2 are fixed and cannot be moved or replaced)
  const handleMove = (index: number, direction: 'up' | 'down') => {
    if (index < 3) return
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 3 || targetIndex >= items.length) return
    setItems((prev) => arrayMove(prev, index, targetIndex))
  }

  // Dnd drag end handler (Default categories 0, 1, 2 cannot be dragged or replaced)
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    if (isDefaultCategory(String(active.id)) || isDefaultCategory(String(over.id))) return

    setItems((prev) => {
      const oldIndex = prev.findIndex((it) => it.id === active.id)
      const newIndex = prev.findIndex((it) => it.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return prev
      // Ensure custom item cannot be moved into default positions (0, 1, 2)
      const safeTargetIndex = Math.max(3, newIndex)
      return arrayMove(prev, oldIndex, safeTargetIndex)
    })
  }

  // Save budget plan and update category records
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
      // 1. Ensure categories are saved/updated with their current names and sortOrder
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        const existingCat = await categoryRepository.findById(item.id)
        let resolvedName = item.name.trim() || t('transactions.categories', 'Danh mục')
        if (item.id === 'cat-expenses') resolvedName = 'Daily Expenses'
        else if (item.id === 'cat-fixed') resolvedName = 'Fixed Amount'
        else if (item.id === 'cat-savings') resolvedName = 'Savings'

        if (existingCat) {
          await categoryRepository.update(item.id, {
            name: resolvedName,
            sortOrder: i + 1,
          })
        } else {
          await categoryRepository.create({
            id: item.id,
            name: resolvedName,
            icon: item.icon || '🏷️',
            sortOrder: i + 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
        }
      }

      // 2. Save monthly plan with allocations
      const allocationList = items.map((it) => ({
        categoryId: it.id,
        allocationPercent: it.percent,
      }))

      await saveMonthlyPlan({
        month: selectedMonth,
        incomeVnd: Math.max(0, Math.round(income)),
        allocations: allocationList,
      })

      // 3. Refresh global Daily Limit state for Dashboard & Report
      await refreshDailyLimit()

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t('plan.saveError', 'Lỗi khi lưu kế hoạch ngân sách.'))
    } finally {
      setSaving(false)
    }
  }

  // Cycle navigation title & subtitle
  const cycleTitle = useMemo(() => {
    const [y, m] = selectedMonth.split('-')
    return `${t('reports.reportMonth', 'Tháng')} ${m}/${y}`
  }, [selectedMonth, t])

  const cycleSubtitle = useMemo(() => {
    const [sy, sm, sd] = activeCycle.startDate.split('-')
    const [ey, em, ed] = activeCycle.endDate.split('-')
    return `${sd}/${sm}/${sy} – ${ed}/${em}/${ey} (${activeCycle.totalDays} ${t('common.days', 'ngày')})`
  }, [activeCycle, t])

  return (
    <PageContainer title={t('app.settings', 'Cài Đặt')}>
      <div className="space-y-4 pb-6 w-full min-w-0 max-w-full box-border">
        {/* ========================================================
            Section 1: Accordion / Collapse Payday Setting
            ======================================================== */}
        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-2xs transition-colors overflow-hidden box-border">
          {/* Header Toggle Button */}
          <button
            type="button"
            onClick={() => setIsPaydayOpen((prev) => !prev)}
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
                  {cyclePreview.formatted} ({cyclePreview.days} {t('common.days', 'ngày')})
                </p>
              </div>
            </div>

            {/* Current Selected Day Badge & Chevron */}
            <div className="flex items-center gap-2 shrink-0 ml-2">
              <span className="rounded-lg bg-[var(--color-primary-soft)] px-2.5 py-1 text-xs font-bold text-[var(--color-primary)] border border-[var(--color-primary)]/20">
                {t('settings.dayOption', { day: payDay })}
              </span>
              <ChevronDown
                className={`h-4 w-4 text-[var(--color-text-muted)] transition-transform duration-200 ${
                  isPaydayOpen ? 'rotate-180' : ''
                }`}
              />
            </div>
          </button>

          {/* Expanded Content with Fixed Height Day Picker */}
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
                    onClick={() => setPayDay(d)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all active:scale-95 shrink-0 cursor-pointer ${
                      payDay === d
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
                  {t('settings.dayOption', { day: payDay })}
                </span>
              </div>

              {/* Fixed Height Day Picker Grid (h-36, exactly 144px, prevents layout shift) */}
              <div className="h-36 overflow-y-auto overflow-x-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-2 box-border">
                <div className="grid grid-cols-7 gap-1.5 w-full">
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setPayDay(d)}
                      className={`h-8 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center justify-center ${
                        payDay === d
                          ? 'bg-[var(--color-primary)] text-white shadow-2xs font-extrabold'
                          : 'border border-[var(--color-border)] bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] hover:bg-[var(--color-border)]'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================
            Section 2: Monthly Budget Plan (Main Focus)
            ======================================================== */}
        <form onSubmit={handleSaveBudget} className="space-y-4">
          <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-5 shadow-2xs space-y-4 transition-colors box-border">
            {/* Header & Sync Month Selector */}
            <div className="flex items-center gap-2.5 border-b border-[var(--color-border)] pb-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-income-soft)] text-[var(--color-income)] shrink-0">
                <Coins className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-bold text-[var(--color-text-primary)]">
                  {t('plan.title', 'Kế Hoạch Ngân Sách Tháng')}
                </h2>
                <p className="text-xs text-[var(--color-text-muted)] truncate">
                  {t('plan.subtitle', 'Nhập thu nhập và phân bổ ngân sách các danh mục')}
                </p>
              </div>
            </div>

            {/* Synchronized Cycle Month Selector (< Cycle >) */}
            <div className="flex items-center justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-2 box-border">
              <button
                type="button"
                onClick={() => setSelectedMonth((m) => shiftMonthId(m, -1))}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] active:scale-95 transition-all cursor-pointer shadow-2xs shrink-0"
                aria-label="Previous cycle"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="text-center min-w-0 px-2 flex-1">
                <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-[var(--color-text-primary)]">
                  <Calendar className="h-3.5 w-3.5 text-[var(--color-primary)] shrink-0" />
                  <span className="truncate">{cycleTitle}</span>
                </div>
                <p className="text-[10px] text-[var(--color-text-muted)] font-medium truncate font-mono">
                  {cycleSubtitle}
                </p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {selectedMonth !== initialCycleMonth && (
                  <button
                    type="button"
                    onClick={() => setSelectedMonth(initialCycleMonth)}
                    className="rounded-xl px-2 py-1 text-[10px] font-semibold text-[var(--color-primary)] bg-[var(--color-primary-soft)] hover:underline cursor-pointer"
                  >
                    {t('common.today', 'Hôm nay')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedMonth((m) => shiftMonthId(m, 1))}
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] active:scale-95 transition-all cursor-pointer shadow-2xs"
                  aria-label="Next cycle"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="py-8 flex justify-center">
                <LoadingSpinner label={t('common.loading', 'Đang tải…')} />
              </div>
            ) : (
              <>
                {/* Monthly Income Formatted Input */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="income-input"
                    className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]"
                  >
                    {t('plan.incomeLabel', 'Thu Nhập Hàng Tháng')}
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

                {/* Daily Spending Preview Callout (Strictly based on Daily Expenses) */}
                <div className="rounded-2xl border border-[var(--color-income-border)] bg-[var(--color-income-soft)] p-3.5 text-xs box-border">
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
                      percent: items.find((it) => it.id === 'cat-expenses')?.percent ?? 0,
                      amount: formatVnd(
                        calculateDailyLimit(
                          income,
                          items.find((it) => it.id === 'cat-expenses')?.percent ?? 0,
                          activeCycle.totalDays,
                        ) * activeCycle.totalDays,
                      ),
                      defaultValue: `Dựa trên ${items.find((it) => it.id === 'cat-expenses')?.percent ?? 0}% cho Chi Tiêu Hàng Ngày (${activeCycle.totalDays} ngày)`,
                    })}
                  </p>
                </div>

                {/* ========================================================
                    Budget Allocation & Cumulative Total Progress Bar
                    ======================================================== */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                        {t('plan.allocationTitle', 'Phân Bổ Ngân Sách')}
                      </span>
                      <span className="text-[10px] text-[var(--color-text-muted)]">
                        ({items.length} {t('plan.categories', 'danh mục')})
                      </span>
                    </div>

                    <span
                      className={`font-bold amount-display ${
                        isAllocationValid
                          ? 'text-[var(--color-income)]'
                          : totalAllocationPercent > 100
                            ? 'text-[var(--color-expense)]'
                            : 'text-[var(--color-primary)]'
                      }`}
                    >
                      {totalAllocationPercent}% / 100%
                    </span>
                  </div>

                  {/* Cumulative Total Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="h-3 w-full overflow-hidden rounded-full bg-[var(--color-bg-subtle)] border border-[var(--color-border)] p-0.5 box-border">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isAllocationValid
                            ? 'bg-[var(--color-income)]'
                            : totalAllocationPercent > 100
                              ? 'bg-[var(--color-expense)]'
                              : 'bg-[var(--color-primary)]'
                        }`}
                        style={{ width: `${Math.min(100, totalAllocationPercent)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-semibold">
                      {isAllocationValid ? (
                        <span className="text-[var(--color-income)] flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>{t('plan.allocated100', 'Đã đủ 100%')}</span>
                        </span>
                      ) : totalAllocationPercent > 100 ? (
                        <span className="text-[var(--color-expense)] font-bold">
                          ⚠️ {t('plan.overAllocated', { percent: totalAllocationPercent - 100 })}
                        </span>
                      ) : (
                        <span className="text-[var(--color-text-muted)]">
                          {t('plan.unallocated', { percent: 100 - totalAllocationPercent })}
                        </span>
                      )}

                      <span className="text-[10px] text-[var(--color-text-muted)]">
                        {t('plan.dragToReorder', 'Kéo thả hoặc dùng mũi tên để sắp xếp')}
                      </span>
                    </div>
                  </div>

                  {/* Budget Allocation Items List with @dnd-kit (iOS Optimized TouchSensor) */}
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={items.map((it) => it.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2.5 w-full max-w-full box-border">
                        {items.map((item, index) => (
                          <SortableBudgetItem
                            key={item.id}
                            item={item}
                            index={index}
                            totalItems={items.length}
                            income={income}
                            onPercentChange={handlePercentChange}
                            onNameChange={handleNameChange}
                            onRemove={handleRemoveCategory}
                            onMove={handleMove}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>

                  {/* Add Category Button */}
                  <button
                    type="button"
                    onClick={handleAddCategory}
                    className="w-full py-2.5 rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg-subtle)] text-xs font-bold text-[var(--color-primary)] hover:bg-[var(--color-border)] active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 cursor-pointer box-border"
                  >
                    <Plus className="h-4 w-4" />
                    <span>{t('plan.addCategory', 'Thêm Danh Mục Phân Bổ')}</span>
                  </button>
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
                  className="w-full rounded-2xl bg-[var(--color-primary)] px-5 py-3.5 text-center text-sm font-bold text-white shadow-md hover:bg-[var(--color-primary-hover)] active:scale-[0.99] disabled:bg-[var(--color-bg-subtle)] disabled:text-[var(--color-text-muted)] disabled:cursor-not-allowed cursor-pointer transition-all flex items-center justify-center gap-2 box-border"
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
