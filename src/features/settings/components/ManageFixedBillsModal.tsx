import React, { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Check,
  Receipt,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  CircleDashed,
  RotateCcw,
} from 'lucide-react'
import { formatVnd, getCurrentMonthId, formatTime } from '@/services/dateService'
import type { FixedBillItem, FixedBillsFilter } from '../types'
import {
  normalizeFixedBills,
  getBillPaymentStatus,
  getBillPaidAt,
  toggleBillPaymentStatus,
  calculateFixedBillsSummary,
  filterFixedBills,
  shiftMonthId,
  formatBillingMonth,
} from '../utils/fixedBillsUtils'

export interface ManageFixedBillsModalProps {
  isOpen: boolean
  onClose: () => void
  bills: FixedBillItem[]
  onSaveBills: (newBills: FixedBillItem[]) => void
  monthlyIncome: number
  initialMonth?: string
}

interface ManageFixedBillsDialogProps {
  onClose: () => void
  bills: FixedBillItem[]
  onSaveBills: (newBills: FixedBillItem[]) => void
  monthlyIncome: number
  initialMonth?: string
}

const ManageFixedBillsDialog: React.FC<ManageFixedBillsDialogProps> = ({
  onClose,
  bills,
  onSaveBills,
  monthlyIncome,
  initialMonth,
}) => {
  const { t, i18n } = useTranslation()
  const currentMonthId = useMemo(() => getCurrentMonthId(), [])
  const [selectedMonth, setSelectedMonth] = useState<string>(
    () => initialMonth || currentMonthId,
  )
  const [filter, setFilter] = useState<FixedBillsFilter>('ALL')

  const [items, setItems] = useState<FixedBillItem[]>(() =>
    normalizeFixedBills(bills),
  )
  const [newName, setNewName] = useState('')
  const [newAmount, setNewAmount] = useState('')

  // Editing state for an existing item
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editAmount, setEditAmount] = useState('')

  // Calculate dynamic payment summary for the selected month (preserves RATE)
  const summary = useMemo(
    () => calculateFixedBillsSummary(items, selectedMonth, monthlyIncome),
    [items, selectedMonth, monthlyIncome],
  )

  // Filtered items to display
  const displayedItems = useMemo(
    () => filterFixedBills(items, selectedMonth, filter),
    [items, selectedMonth, filter],
  )

  const handlePrevMonth = () => {
    setSelectedMonth((prev) => shiftMonthId(prev, -1))
  }

  const handleNextMonth = () => {
    setSelectedMonth((prev) => shiftMonthId(prev, 1))
  }

  const handleResetToCurrentMonth = () => {
    setSelectedMonth(currentMonthId)
  }

  const handleTogglePayment = (id: string) => {
    const updated = toggleBillPaymentStatus(items, id, selectedMonth)
    setItems(updated)
    onSaveBills(updated)
  }

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    const rawAmt = newAmount.replace(/\D/g, '')
    const amt = rawAmt ? parseInt(rawAmt, 10) : 0
    if (amt <= 0) return

    const newItem: FixedBillItem = {
      id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: newName.trim(),
      amountVnd: amt,
      paymentHistory: {},
    }
    const updated = [...items, newItem]
    setItems(updated)
    onSaveBills(updated)
    setNewName('')
    setNewAmount('')
  }

  const handleDelete = (id: string) => {
    const updated = items.filter((b) => b.id !== id)
    setItems(updated)
    onSaveBills(updated)
  }

  const handleStartEdit = (item: FixedBillItem) => {
    setEditingId(item.id)
    setEditName(item.name)
    setEditAmount(String(item.amountVnd))
  }

  const handleSaveEdit = (id: string) => {
    if (!editName.trim()) return
    const rawAmt = editAmount.replace(/\D/g, '')
    const amt = rawAmt ? parseInt(rawAmt, 10) : 0
    if (amt <= 0) return

    const updated = items.map((b) =>
      b.id === id ? { ...b, name: editName.trim(), amountVnd: amt } : b,
    )
    setItems(updated)
    onSaveBills(updated)
    setEditingId(null)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
  }

  const handleApplyAndClose = (e?: React.MouseEvent) => {
    if (e) e.preventDefault()
    let finalItems = [...items]
    if (editingId && editName.trim()) {
      const rawAmt = editAmount.replace(/\D/g, '')
      const amt = rawAmt ? parseInt(rawAmt, 10) : 0
      if (amt > 0) {
        finalItems = finalItems.map((b) =>
          b.id === editingId
            ? { ...b, name: editName.trim(), amountVnd: amt }
            : b,
        )
      }
    }
    onSaveBills(finalItems)
    onClose()
  }

  const isCurrentMonth = selectedMonth === currentMonthId
  const unpaidCount = summary.totalCount - summary.paidCount

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 overflow-hidden">
      <div className="w-full sm:w-[92vw] sm:max-w-md max-w-full rounded-t-3xl sm:rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-4 sm:p-5 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] sm:pb-5 shadow-2xl max-h-[90dvh] flex flex-col overflow-hidden box-border mx-auto">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between border-b border-[var(--color-border)] pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
              <Receipt className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--color-text-primary)]">
                {t('plan.manageFixedBillsTitle', 'Quản Lý Hóa Đơn Cố Định')}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.cancel', 'Đóng')}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)] cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scroll Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden w-full max-w-full py-3 space-y-3.5 overscroll-y-contain box-border">
          {/* 4.1. Billing Period Selector */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-2.5 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              aria-label={t('plan.prevMonth', 'Tháng trước')}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-surface)] hover:text-[var(--color-primary)] active:scale-95 cursor-pointer transition-all"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <div className="flex flex-col items-center justify-center min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap justify-center">
                <span className="text-sm font-extrabold text-[var(--color-text-primary)] tracking-tight">
                  {formatBillingMonth(selectedMonth, i18n.language)}
                </span>
                {isCurrentMonth ? (
                  <span className="text-[10px] font-bold text-[var(--color-primary)] bg-[var(--color-primary-soft)] border border-[var(--color-primary)]/20 px-1.5 py-0.5 rounded-md">
                    {t('plan.currentMonthBadge', 'Tháng này')}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResetToCurrentMonth}
                    title={t('plan.currentMonthBadge', 'Về tháng này')}
                    className="flex items-center gap-0.5 text-[10px] font-bold text-[var(--color-primary)] hover:underline cursor-pointer bg-[var(--color-primary-soft)] px-1.5 py-0.5 rounded-md"
                  >
                    <RotateCcw className="h-2.5 w-2.5" />
                    <span>{t('plan.currentMonthBadge', 'Tháng này')}</span>
                  </button>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              aria-label={t('plan.nextMonth', 'Tháng sau')}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-surface)] hover:text-[var(--color-primary)] active:scale-95 cursor-pointer transition-all"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* 4.3. Payment Summary & Progress */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-3.5 space-y-3 box-border shadow-2xs">
            {/* Row 1: Total Bills & Preserved Auto-calculated RATE */}
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[var(--color-border)]/70">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)] block">
                  {t('plan.totalFixedBills', 'Tổng tiền hóa đơn')}:
                </span>
                <span className="text-base font-extrabold amount-display text-[var(--color-primary)]">
                  {formatVnd(summary.totalAmount)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)] block">
                  {t('plan.ratio', 'Tỷ lệ % tự tính')}:
                </span>
                <span className="text-sm font-extrabold amount-display text-[var(--color-primary)] bg-[var(--color-bg-surface)] px-2 py-0.5 rounded-lg border border-[var(--color-primary)]/20 inline-block">
                  {summary.calculatedPercent}%
                </span>
              </div>
            </div>

            {/* Row 2: Paid Amount & Unpaid Amount */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl bg-[var(--color-bg-surface)] p-2.5 border border-[var(--color-border)]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-income)] flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 shrink-0" />
                  <span className="truncate">{t('plan.paidAmount', 'Đã thanh toán')}</span>
                </span>
                <span className="text-xs sm:text-sm font-extrabold amount-display text-[var(--color-income)] mt-0.5 block truncate">
                  {formatVnd(summary.paidAmount)}
                </span>
              </div>

              <div className="rounded-xl bg-[var(--color-bg-surface)] p-2.5 border border-[var(--color-border)]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-warning)] flex items-center gap-1">
                  <CircleDashed className="h-3 w-3 shrink-0" />
                  <span className="truncate">{t('plan.unpaidAmount', 'Chưa thanh toán')}</span>
                </span>
                <span className="text-xs sm:text-sm font-extrabold amount-display text-[var(--color-text-primary)] mt-0.5 block truncate">
                  {formatVnd(summary.unpaidAmount)}
                </span>
              </div>
            </div>

            {/* Row 3: Payment Progress & Progress Bar */}
            <div className="space-y-1.5 pt-0.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[11px] font-bold text-[var(--color-text-secondary)]">
                  {t('plan.paymentProgress', 'Tiến độ thanh toán')}:
                </span>
                <span className="text-[11px] font-extrabold amount-display text-[var(--color-text-primary)]">
                  {summary.paidCount}/{summary.totalCount} {t('settings.billsCountUnit', 'khoản')} ({summary.completionPercentage}%)
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-[var(--color-bg-surface)] border border-[var(--color-border)] overflow-hidden">
                <div
                  className="h-full bg-[var(--color-income)] rounded-full transition-all duration-300"
                  style={{ width: `${summary.completionPercentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* 4.4. Filtering Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[var(--color-bg-subtle)] border border-[var(--color-border)] text-xs">
            <button
              type="button"
              data-testid="filter-all"
              onClick={() => setFilter('ALL')}
              className={`flex-1 py-1.5 px-2 rounded-xl font-bold text-center transition-all cursor-pointer ${
                filter === 'ALL'
                  ? 'bg-[var(--color-bg-surface)] text-[var(--color-primary)] shadow-2xs border border-[var(--color-border)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              {t('plan.filterAll', 'Tất cả')} ({items.length})
            </button>
            <button
              type="button"
              data-testid="filter-unpaid"
              onClick={() => setFilter('UNPAID')}
              className={`flex-1 py-1.5 px-2 rounded-xl font-bold text-center transition-all cursor-pointer ${
                filter === 'UNPAID'
                  ? 'bg-[var(--color-bg-surface)] text-[var(--color-warning)] shadow-2xs border border-[var(--color-border)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              {t('plan.filterUnpaid', 'Chưa thanh toán')} ({unpaidCount})
            </button>
            <button
              type="button"
              data-testid="filter-paid"
              onClick={() => setFilter('PAID')}
              className={`flex-1 py-1.5 px-2 rounded-xl font-bold text-center transition-all cursor-pointer ${
                filter === 'PAID'
                  ? 'bg-[var(--color-bg-surface)] text-[var(--color-income)] shadow-2xs border border-[var(--color-border)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              {t('plan.filterPaid', 'Đã thanh toán')} ({summary.paidCount})
            </button>
          </div>

          {/* Add Bill Form */}
          <form
            onSubmit={handleAdd}
            className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-3 space-y-2.5 box-border"
          >
            <span className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider block">
              {t('plan.addBillItem', 'Thêm khoản hóa đơn mới')}
            </span>

            <div className="space-y-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t('plan.billNamePlaceholder', 'Tên khoản (VD: Tiền nhà, Wifi, Điện…)')}
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-3 py-2 text-xs text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-border-focused)]"
              />

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={
                      newAmount
                        ? new Intl.NumberFormat('en-US').format(parseInt(newAmount.replace(/\D/g, ''), 10) || 0)
                        : ''
                    }
                    onChange={(e) => setNewAmount(e.target.value.replace(/\D/g, ''))}
                    placeholder={t('plan.billAmountPlaceholder', 'Số tiền (VND)')}
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] pl-3 pr-10 py-2 text-xs font-bold text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-border-focused)]"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[var(--color-text-muted)]">
                    VND
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={!newName.trim() || !newAmount}
                  className="shrink-0 flex items-center justify-center gap-1 rounded-xl bg-[var(--color-primary)] px-4 py-2 text-xs font-bold text-white disabled:opacity-40 cursor-pointer active:scale-95 transition-all"
                >
                  <Plus className="h-4 w-4" />
                  <span>{t('plan.addBillBtn', 'Thêm')}</span>
                </button>
              </div>
            </div>
          </form>

          {/* 4.2. List of Fixed Bill items */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider px-1 block">
              {t('plan.billsListTitle', 'Danh sách hóa đơn')} ({displayedItems.length})
            </span>

            {items.length === 0 ? (
              <p className="text-xs text-[var(--color-text-muted)] italic py-3 text-center">
                {t('plan.noBillsYet', 'Chưa có khoản hóa đơn nào. Nhập tên và số tiền phía trên để thêm.')}
              </p>
            ) : displayedItems.length === 0 ? (
              <p className="text-xs text-[var(--color-text-muted)] italic py-3 text-center">
                {t('plan.noBillsMatchFilter', 'Không có khoản hóa đơn nào phù hợp với bộ lọc.')}
              </p>
            ) : (
              <div className="divide-y divide-[var(--color-border)] rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] overflow-hidden">
                {displayedItems.map((item) => {
                  const isEditing = editingId === item.id
                  const isPaid = getBillPaymentStatus(item, selectedMonth) === 'PAID'
                  const paidAt = getBillPaidAt(item, selectedMonth)

                  return (
                    <div
                      key={item.id}
                      className="p-3 flex items-center justify-between gap-2.5 hover:bg-[var(--color-bg-subtle)] transition-colors"
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                handleSaveEdit(item.id)
                              } else if (e.key === 'Escape') {
                                handleCancelEdit()
                              }
                            }}
                            className="min-w-0 flex-1 rounded-lg border border-[var(--color-border-focused)] bg-[var(--color-bg-surface)] px-2 py-1 text-xs text-[var(--color-text-primary)] focus:outline-none"
                          />
                          <input
                            type="text"
                            inputMode="numeric"
                            value={
                              editAmount
                                ? new Intl.NumberFormat('en-US').format(parseInt(editAmount.replace(/\D/g, ''), 10) || 0)
                                : ''
                            }
                            onChange={(e) => setEditAmount(e.target.value.replace(/\D/g, ''))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                handleSaveEdit(item.id)
                              } else if (e.key === 'Escape') {
                                handleCancelEdit()
                              }
                            }}
                            className="w-24 rounded-lg border border-[var(--color-border-focused)] bg-[var(--color-bg-surface)] px-2 py-1 text-xs font-bold text-[var(--color-text-primary)] text-right focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(item.id)}
                            className="p-1.5 rounded-lg bg-[var(--color-income-soft)] text-[var(--color-income)] hover:bg-[var(--color-income-soft)]/80 cursor-pointer"
                            aria-label={t('common.save', 'Lưu')}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)] cursor-pointer"
                            aria-label={t('common.cancel', 'Hủy')}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          {/* Payment Status Checkbox Toggle */}
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={isPaid}
                            onClick={() => handleTogglePayment(item.id)}
                            className="flex items-center gap-1.5 group/check cursor-pointer shrink-0 py-1"
                            aria-label={
                              isPaid
                                ? t('plan.markAsUnpaid', 'Đánh dấu chưa thanh toán')
                                : t('plan.markAsPaid', 'Đánh dấu đã thanh toán')
                            }
                          >
                            <div
                              className={`flex h-5 w-5 items-center justify-center rounded-lg border transition-all duration-200 ${
                                isPaid
                                  ? 'bg-[var(--color-income)] border-[var(--color-income)] text-white shadow-2xs'
                                  : 'border-[var(--color-border)] bg-[var(--color-bg-surface)] group-hover/check:border-[var(--color-primary)]'
                              }`}
                            >
                              {isPaid && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                            </div>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border transition-all duration-200 ${
                                isPaid
                                  ? 'bg-[var(--color-income-soft)] text-[var(--color-income)] border-[var(--color-income-border)]'
                                  : 'bg-[var(--color-bg-subtle)] text-[var(--color-warning)] border-[var(--color-warning)]/30'
                              }`}
                            >
                              {isPaid
                                ? t('plan.paidStatus', 'Đã thanh toán')
                                : t('plan.unpaidStatus', 'Chưa thanh toán')}
                            </span>
                          </button>

                          {/* Bill details */}
                          <div className="min-w-0 flex-1 px-1">
                            <span className="text-xs font-semibold text-[var(--color-text-primary)] block truncate">
                              {item.name}
                            </span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[11px] font-bold amount-display text-[var(--color-text-secondary)]">
                                {formatVnd(item.amountVnd)}
                              </span>
                              {isPaid && paidAt && (
                                <span
                                  className="text-[9px] text-[var(--color-text-muted)] truncate"
                                  title={`${t('plan.paidAtTooltip', 'Thanh toán lúc')}: ${paidAt}`}
                                >
                                  • {formatTime(paidAt)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Action icons */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(item)}
                              aria-label={t('common.edit', 'Sửa')}
                              className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-bg-subtle)] rounded-lg cursor-pointer transition-colors"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(item.id)}
                              aria-label={t('common.delete', 'Xóa')}
                              className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-expense)] hover:bg-[var(--color-expense-soft)] rounded-lg cursor-pointer transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 pt-2 border-t border-[var(--color-border)] mt-1">
          <button
            type="button"
            onClick={handleApplyAndClose}
            className="w-full rounded-2xl bg-[var(--color-primary)] py-3 text-xs font-bold text-white hover:bg-[var(--color-primary-hover)] active:scale-[0.99] cursor-pointer transition-colors"
          >
            {t('common.save', 'Xong & Áp Dụng')}
          </button>
        </div>
      </div>
    </div>
  )
}

export const ManageFixedBillsModal: React.FC<ManageFixedBillsModalProps> = ({
  isOpen,
  onClose,
  bills,
  onSaveBills,
  monthlyIncome,
  initialMonth,
}) => {
  if (!isOpen) return null

  return (
    <ManageFixedBillsDialog
      onClose={onClose}
      bills={bills}
      onSaveBills={onSaveBills}
      monthlyIncome={monthlyIncome}
      initialMonth={initialMonth}
    />
  )
}
