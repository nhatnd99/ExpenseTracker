import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Plus, Trash2, Edit2, Check, Receipt } from 'lucide-react'
import { formatVnd } from '@/services/dateService'
import type { FixedBillItem } from '../types'

export interface ManageFixedBillsModalProps {
  isOpen: boolean
  onClose: () => void
  bills: FixedBillItem[]
  onSaveBills: (newBills: FixedBillItem[]) => void
  monthlyIncome: number
}

interface ManageFixedBillsDialogProps {
  onClose: () => void
  bills: FixedBillItem[]
  onSaveBills: (newBills: FixedBillItem[]) => void
  monthlyIncome: number
}

const ManageFixedBillsDialog: React.FC<ManageFixedBillsDialogProps> = ({
  onClose,
  bills,
  onSaveBills,
  monthlyIncome,
}) => {
  const { t } = useTranslation()
  const [items, setItems] = useState<FixedBillItem[]>(bills)
  const [newName, setNewName] = useState('')
  const [newAmount, setNewAmount] = useState('')

  // Editing state for an existing item
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editAmount, setEditAmount] = useState('')

  // Total amount of current items in modal
  const totalAmount = items.reduce((sum, b) => sum + (Number(b.amountVnd) || 0), 0)
  const calculatedPercent = monthlyIncome > 0 ? Math.round((totalAmount / monthlyIncome) * 100) : 0

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    const rawAmt = newAmount.replace(/\D/g, '')
    const amt = rawAmt ? parseInt(rawAmt, 10) : 0
    if (amt <= 0) return

    const newItem: FixedBillItem = {
      id: `fb-${Date.now()}`,
      name: newName.trim(),
      amountVnd: amt,
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

    const updated = items.map((b) => (b.id === id ? { ...b, name: editName.trim(), amountVnd: amt } : b))
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
          b.id === editingId ? { ...b, name: editName.trim(), amountVnd: amt } : b
        )
      }
    }
    onSaveBills(finalItems)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 overflow-hidden">
      <div className="w-full sm:w-[92vw] sm:max-w-md max-w-full rounded-t-3xl sm:rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-4 sm:p-5 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] sm:pb-5 shadow-2xl max-h-[88dvh] flex flex-col overflow-hidden box-border mx-auto">
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
          {/* Summary Callout Banner */}
          <div className="rounded-2xl border border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)] p-3 text-xs flex items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)] block">
                {t('plan.totalFixedBills', 'Tổng tiền hóa đơn')}:
              </span>
              <span className="text-base font-extrabold amount-display text-[var(--color-primary)]">
                {formatVnd(totalAmount)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)] block">
                {t('plan.ratio', 'Tỷ lệ % tự tính')}:
              </span>
              <span className="text-sm font-extrabold amount-display text-[var(--color-primary)] bg-[var(--color-bg-surface)] px-2 py-0.5 rounded-lg border border-[var(--color-primary)]/20 inline-block">
                {calculatedPercent}%
              </span>
            </div>
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

          {/* List of Bill items */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider px-1 block">
              {t('plan.billsListTitle', 'Danh sách hóa đơn')} ({items.length})
            </span>

            {items.length === 0 ? (
              <p className="text-xs text-[var(--color-text-muted)] italic py-3 text-center">
                {t('plan.noBillsYet', 'Chưa có khoản hóa đơn nào. Nhập tên và số tiền phía trên để thêm.')}
              </p>
            ) : (
              <div className="divide-y divide-[var(--color-border)] rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] overflow-hidden">
                {items.map((item) => {
                  const isEditing = editingId === item.id
                  return (
                    <div
                      key={item.id}
                      className="p-3 flex items-center justify-between gap-2 hover:bg-[var(--color-bg-subtle)] transition-colors"
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
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-semibold text-[var(--color-text-primary)] block truncate">
                              {item.name}
                            </span>
                            <span className="text-[11px] font-bold amount-display text-[var(--color-text-secondary)]">
                              {formatVnd(item.amountVnd)}
                            </span>
                          </div>

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
}) => {
  if (!isOpen) return null

  return (
    <ManageFixedBillsDialog
      onClose={onClose}
      bills={bills}
      onSaveBills={onSaveBills}
      monthlyIncome={monthlyIncome}
    />
  )
}

