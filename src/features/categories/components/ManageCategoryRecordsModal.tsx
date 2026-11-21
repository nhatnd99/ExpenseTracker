import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Check,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Calendar,
  FileText,
} from 'lucide-react'
import { formatVnd, getCurrentMonthId, getTodayString } from '@/services/dateService'
import { shiftMonthId, formatBillingMonth } from '@/features/settings/utils/fixedBillsUtils'
import { CategoryIconRenderer } from '@/components/ui/CategoryIconRenderer'
import type { CategoryRecord } from '@/types/models'
import { categoryRecordRepository } from '@/repositories/categoryRecordRepository'
import {
  filterRecordsByMonth,
  calculateRecordsTotal,
  compareRecordsDesc,
  validateRecordInput,
} from '../categoryRecordUtils'

export interface ManageCategoryRecordsModalProps {
  isOpen: boolean
  onClose: () => void
  categoryId: string
  categoryName: string
  categoryIcon?: string
  initialMonth?: string
  onRecordsChanged?: () => void
}

export const ManageCategoryRecordsModal: React.FC<ManageCategoryRecordsModalProps> = ({
  isOpen,
  onClose,
  categoryId,
  categoryName,
  categoryIcon,
  initialMonth,
  onRecordsChanged,
}) => {
  const { t, i18n } = useTranslation()
  const todayStr = useMemo(() => getTodayString(), [])
  const currentMonthId = useMemo(() => getCurrentMonthId(), [])
  const [selectedMonth, setSelectedMonth] = useState<string>(
    () => initialMonth || currentMonthId,
  )

  const [records, setRecords] = useState<CategoryRecord[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  // Form states
  const [recordName, setRecordName] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayStr)
  const [note, setNote] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Edit mode state
  const [editingId, setEditingId] = useState<string | null>(null)

  // Load records from repository
  const loadRecords = useCallback(async () => {
    try {
      setLoading(true)
      const data = await categoryRecordRepository.findByCategoryId(categoryId)
      setRecords(data)
    } finally {
      setLoading(false)
    }
  }, [categoryId])

  useEffect(() => {
    if (isOpen && categoryId) {
      void loadRecords()
    }
  }, [isOpen, categoryId, loadRecords])

  // Filter records for selected month
  const monthlyRecords = useMemo(() => {
    const filtered = filterRecordsByMonth(records, selectedMonth)
    return [...filtered].sort(compareRecordsDesc)
  }, [records, selectedMonth])

  // Monthly summary
  const totalAmount = useMemo(() => calculateRecordsTotal(monthlyRecords), [monthlyRecords])
  const recordCount = monthlyRecords.length

  const handlePrevMonth = () => {
    setSelectedMonth((prev) => shiftMonthId(prev, -1))
  }

  const handleNextMonth = () => {
    setSelectedMonth((prev) => shiftMonthId(prev, 1))
  }

  const handleResetMonth = () => {
    setSelectedMonth(currentMonthId)
  }

  const handleStartEdit = (record: CategoryRecord) => {
    setEditingId(record.id)
    setRecordName(record.name)
    setAmount(String(record.amount))
    setDate(record.date)
    setNote(record.note || '')
    setFormError(null)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setRecordName('')
    setAmount('')
    setDate(todayStr)
    setNote('')
    setFormError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const parsedAmount = parseInt(amount.replace(/\D/g, ''), 10)
    const validation = validateRecordInput(recordName, parsedAmount, date)
    if (!validation.valid) {
      setFormError(
        validation.error === 'Record name is required'
          ? t('records.nameRequired', 'Vui lòng nhập tên khoản ghi chép.')
          : validation.error === 'Amount must be greater than zero'
          ? t('records.amountRequired', 'Số tiền phải lớn hơn 0.')
          : t('records.dateRequired', 'Ngày không hợp lệ.')
      )
      return
    }

    setIsSubmitting(true)
    try {
      if (editingId) {
        await categoryRecordRepository.update(editingId, {
          name: recordName.trim(),
          amount: parsedAmount,
          date,
          note: note.trim() || undefined,
        })
        handleCancelEdit()
      } else {
        const now = new Date().toISOString()
        const newRecord: CategoryRecord = {
          id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          categoryId,
          name: recordName.trim(),
          amount: parsedAmount,
          date,
          note: note.trim() || undefined,
          createdAt: now,
          updatedAt: now,
        }
        await categoryRecordRepository.create(newRecord)
        setRecordName('')
        setAmount('')
        setDate(todayStr)
        setNote('')
      }
      await loadRecords()
      onRecordsChanged?.()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t('common.error', 'Lỗi'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (
      !confirm(
        t('records.deleteConfirm', {
          name,
          defaultValue: `Bạn có chắc chắn muốn xóa "${name}"?`,
        })
      )
    ) {
      return
    }

    try {
      await categoryRecordRepository.delete(id)
      if (editingId === id) {
        handleCancelEdit()
      }
      await loadRecords()
      onRecordsChanged?.()
    } catch (err) {
      alert(err instanceof Error ? err.message : t('common.error', 'Lỗi'))
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 overflow-hidden">
      <div className="w-full sm:w-[92vw] sm:max-w-lg max-w-full rounded-t-3xl sm:rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-4 sm:p-5 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] sm:pb-5 shadow-2xl max-h-[90dvh] flex flex-col overflow-hidden box-border mx-auto">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between border-b border-[var(--color-border)] pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)] text-lg shrink-0">
              <CategoryIconRenderer icon={categoryIcon || 'FileText'} size={18} />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-[var(--color-text-primary)] truncate">
                {categoryName}
              </h2>
              <span className="text-[11px] text-[var(--color-text-muted)] block">
                {t('records.manageTitle', 'Quản lý ghi chép')}
              </span>
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

        {/* Scroll Content Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden w-full max-w-full py-3 space-y-4 overscroll-y-contain box-border">
          {/* Month Selector */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-2.5 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              aria-label={t('common.prevMonth', 'Tháng trước')}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[var(--color-text-primary)]">
                {formatBillingMonth(selectedMonth, i18n.language)}
              </span>
              {selectedMonth !== currentMonthId && (
                <button
                  type="button"
                  onClick={handleResetMonth}
                  title={t('common.currentMonth', 'Về tháng hiện tại')}
                  className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--color-primary-soft)] text-[var(--color-primary)] hover:opacity-80 cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              aria-label={t('common.nextMonth', 'Tháng sau')}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Summary Section */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-3">
              <span className="text-[11px] font-semibold text-[var(--color-text-muted)] block">
                {t('records.totalExpense', 'Tổng chi')}
              </span>
              <span className="text-base font-extrabold text-[var(--color-text-primary)] mt-0.5 block">
                {formatVnd(totalAmount)}
              </span>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-3">
              <span className="text-[11px] font-semibold text-[var(--color-text-muted)] block">
                {t('records.itemCount', 'Số khoản')}
              </span>
              <span className="text-base font-extrabold text-[var(--color-primary)] mt-0.5 block">
                {recordCount} {t('records.itemsUnit', 'khoản')}
              </span>
            </div>
          </div>

          {/* Add / Edit Form */}
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-3.5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider block">
                {editingId
                  ? t('records.editTitle', 'Chỉnh sửa khoản ghi chép')
                  : t('records.addTitle', 'Thêm khoản ghi chép mới')}
              </span>
              {editingId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] cursor-pointer"
                >
                  {t('common.cancel', 'Hủy')}
                </button>
              )}
            </div>

            <div className="space-y-2.5">
              {/* Name & Amount Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  data-testid="record-name-input"
                  value={recordName}
                  onChange={(e) => setRecordName(e.target.value)}
                  placeholder={t('records.namePlaceholder', 'Tên khoản (vd: Vé xem phim, Mua sách…)')}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-border-focused)]"
                />
                <input
                  type="text"
                  data-testid="record-amount-input"
                  inputMode="numeric"
                  value={amount ? Number(amount).toLocaleString('vi-VN') : ''}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/\D/g, '')
                    setAmount(clean)
                  }}
                  placeholder={t('records.amountPlaceholder', 'Số tiền (₫)')}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-border-focused)]"
                />
              </div>

              {/* Date & Note Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="relative">
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-border-focused)]"
                  />
                </div>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t('records.notePlaceholder', 'Ghi chú (tùy chọn)')}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-border-focused)]"
                />
              </div>
            </div>

            {formError && (
              <p className="text-xs text-[var(--color-expense)] font-medium">⚠️ {formError}</p>
            )}

            <button
              type="submit"
              data-testid="record-submit-btn"
              disabled={isSubmitting || !recordName.trim() || !amount}
              className="w-full py-2.5 rounded-xl bg-[var(--color-primary)] text-xs font-bold text-white hover:bg-[var(--color-primary-hover)] active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all flex items-center justify-center gap-1.5"
            >
              {editingId ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              <span>
                {editingId
                  ? t('records.saveChanges', 'Lưu thay đổi')
                  : t('records.addBtn', 'Thêm khoản')}
              </span>
            </button>
          </form>

          {/* Record History */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider px-1 block">
              {t('records.historyTitle', 'Lịch sử ghi chép')} ({recordCount})
            </span>

            {loading ? (
              <div className="p-6 text-center text-xs text-[var(--color-text-muted)]">
                {t('common.loading', 'Đang tải…')}
              </div>
            ) : monthlyRecords.length === 0 ? (
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-6 text-center text-xs text-[var(--color-text-muted)] space-y-1">
                <FileText className="h-7 w-7 mx-auto opacity-30 text-[var(--color-text-muted)]" />
                <p>{t('records.noRecords', 'Chưa có ghi chép nào trong tháng này.')}</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--color-border)] rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] overflow-hidden">
                {monthlyRecords.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 gap-2.5 hover:bg-[var(--color-bg-subtle)] transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
                          {item.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-[var(--color-text-muted)] mt-0.5">
                        <span className="inline-flex items-center gap-0.5">
                          <Calendar className="h-3 w-3" />
                          <span>{item.date}</span>
                        </span>
                        {item.note && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-[140px] sm:max-w-[200px]" title={item.note}>
                              {item.note}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-bold text-sm text-[var(--color-text-primary)]">
                        {formatVnd(item.amount)}
                      </span>
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          data-testid={`record-edit-${item.id}`}
                          onClick={() => handleStartEdit(item)}
                          title={t('common.edit', 'Sửa')}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-bg-subtle)] cursor-pointer"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          data-testid={`record-delete-${item.id}`}
                          onClick={() => void handleDelete(item.id, item.name)}
                          title={t('common.delete', 'Xóa')}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-expense)] hover:bg-[var(--color-expense-soft)] cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 pt-2 border-t border-[var(--color-border)] mt-1">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl bg-[var(--color-bg-subtle)] border border-[var(--color-border)] py-3 text-xs font-bold text-[var(--color-text-primary)] hover:bg-[var(--color-border)] cursor-pointer"
          >
            {t('common.cancel', 'Đóng')}
          </button>
        </div>
      </div>
    </div>
  )
}
