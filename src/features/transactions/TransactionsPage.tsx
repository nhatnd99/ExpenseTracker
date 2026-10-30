import { useEffect, useState, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Plus,
  Trash2,
  Calendar,
  X,
  Receipt,
  FileText,
  Tag,
  AlertCircle,
  Coins,
} from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { useCurrentMonth } from '@/hooks/useCurrentMonth'
import {
  getTransactionsForMonth,
  getCategories,
  createTransaction,
  deleteTransaction,
  type EnrichedTransaction,
} from './transactionService'
import { formatVnd, getTodayString } from '@/services/dateService'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type { BudgetCategory } from '@/types/models'

export function TransactionsPage() {
  const { t } = useTranslation()
  const currentMonth = useCurrentMonth()
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth)
  const [transactions, setTransactions] = useState<EnrichedTransaction[]>([])
  const [categories, setCategories] = useState<BudgetCategory[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [showAddForm, setShowAddForm] = useState<boolean>(false)

  // Form states
  const [amount, setAmount] = useState<number>(0)
  const [categoryId, setCategoryId] = useState<string>('')
  const [date, setDate] = useState<string>(getTodayString())
  const [description, setDescription] = useState<string>('')
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Load categories once
  useEffect(() => {
    getCategories().then((cats) => {
      setCategories(cats)
      if (cats.length > 0) {
        setCategoryId((prev) => (prev ? prev : cats[0].id))
      }
    })
  }, [])

  // Load transactions whenever selectedMonth changes
  const reloadTransactions = useCallback(async () => {
    try {
      const data = await getTransactionsForMonth(selectedMonth)
      setTransactions(data)
    } finally {
      setLoading(false)
    }
  }, [selectedMonth])

  useEffect(() => {
    void reloadTransactions()
  }, [reloadTransactions])

  // Total spent in this month
  const totalSpent = useMemo(() => {
    return transactions.reduce((sum, tx) => sum + tx.amountVnd, 0)
  }, [transactions])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (amount <= 0) {
      setFormError(t('transactions.amountRequired'))
      return
    }
    if (!categoryId) {
      setFormError('Please select a category.')
      return
    }

    setSubmitting(true)
    setFormError(null)

    try {
      await createTransaction({
        amountVnd: Math.round(amount),
        categoryId,
        date,
        description,
      })

      // Reset form & reload
      setAmount(0)
      setDescription('')
      setDate(getTodayString())
      setShowAddForm(false)
      await reloadTransactions()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error adding transaction.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('transactions.confirmDelete'))) return
    await deleteTransaction(id)
    await reloadTransactions()
  }

  return (
    <PageContainer title={t('app.transactions')}>
      <div className="space-y-4">
        {/* Month selector & quick summary */}
        <div className="flex items-center justify-between rounded-3xl border border-slate-100 bg-white p-4 shadow-xs transition-colors dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                {t('common.month')}
              </span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="block text-sm font-bold text-slate-900 bg-transparent focus:outline-none dark:text-white"
              />
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400">{t('transactions.totalSpent')}</span>
            <p className="text-base font-bold text-slate-900 amount-display dark:text-white">
              {formatVnd(totalSpent)}
            </p>
          </div>
        </div>

        {/* Add Transaction Button or Form */}
        {!showAddForm ? (
          <button
            type="button"
            onClick={() => {
              setShowAddForm(true)
              setFormError(null)
            }}
            className="w-full rounded-2xl bg-slate-900 px-5 py-4 text-center text-sm font-bold text-white shadow-md transition-all hover:bg-slate-850 active:scale-[0.99] dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400 touch-target cursor-pointer flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>{t('transactions.addExpenseBtn')}</span>
          </button>
        ) : (
          <form
            onSubmit={handleCreate}
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-lg transition-colors dark:border-slate-800 dark:bg-slate-900 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-cyan-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {t('transactions.recordExpenseTitle')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Amount input */}
            <div>
              <label htmlFor="tx-amount" className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                <Coins className="h-3.5 w-3.5 text-slate-400" />
                <span>{t('transactions.amountLabel')}</span>
              </label>
              <div className="mt-1.5 relative">
                <input
                  id="tx-amount"
                  type="number"
                  min="1"
                  step="1000"
                  value={amount || ''}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  placeholder="50000"
                  autoFocus
                  required
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-lg font-bold text-slate-900 focus:bg-white focus:border-slate-800 focus:outline-none dark:border-slate-800 dark:bg-slate-850 dark:text-white dark:focus:bg-slate-800 dark:focus:border-cyan-400"
                />
                <span className="absolute right-4 top-3 text-sm font-bold text-slate-400">₫</span>
              </div>
              {amount > 0 && (
                <p className="mt-1 text-right text-xs font-bold text-emerald-600 amount-display dark:text-emerald-400">
                  {formatVnd(amount)}
                </p>
              )}
            </div>

            {/* Category Select */}
            <div>
              <label htmlFor="tx-category" className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                <Tag className="h-3.5 w-3.5 text-slate-400" />
                <span>{t('transactions.categoryLabel')}</span>
              </label>
              <select
                id="tx-category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm font-semibold text-slate-800 focus:bg-white focus:border-slate-800 focus:outline-none dark:border-slate-800 dark:bg-slate-850 dark:text-white dark:focus:bg-slate-800 dark:focus:border-cyan-400"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id} className="dark:bg-slate-900">
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Input */}
            <div>
              <label htmlFor="tx-date" className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span>{t('transactions.dateLabel')}</span>
              </label>
              <input
                id="tx-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:bg-white focus:border-slate-800 focus:outline-none dark:border-slate-800 dark:bg-slate-850 dark:text-white dark:focus:bg-slate-800 dark:focus:border-cyan-400"
              />
            </div>

            {/* Description note */}
            <div>
              <label htmlFor="tx-desc" className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                <FileText className="h-3.5 w-3.5 text-slate-400" />
                <span>{t('transactions.noteLabel')}</span>
              </label>
              <input
                id="tx-desc"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('transactions.notePlaceholder')}
                className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 focus:bg-white focus:border-slate-800 focus:outline-none dark:border-slate-800 dark:bg-slate-850 dark:text-white dark:focus:bg-slate-800 dark:focus:border-cyan-400"
              />
            </div>

            {formError && (
              <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="flex-1 rounded-2xl border border-slate-200 bg-slate-100 py-3 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-200 dark:border-slate-750 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-750 cursor-pointer"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={submitting || amount <= 0}
                className="flex-2 rounded-2xl bg-slate-900 py-3 text-xs font-bold text-white shadow-md transition-all hover:bg-slate-850 active:scale-[0.99] disabled:bg-slate-300 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400 dark:disabled:bg-slate-800 dark:disabled:text-slate-600 cursor-pointer"
              >
                {submitting ? t('transactions.saving') : t('transactions.saveExpense')}
              </button>
            </div>
          </form>
        )}

        {/* Transaction List */}
        {loading ? (
          <div className="py-16 flex justify-center">
            <LoadingSpinner label={t('common.loading')} />
          </div>
        ) : transactions.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900/50">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
              <Receipt className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm font-bold text-slate-800 dark:text-slate-200">
              {t('transactions.noTransactions')}
            </p>
            <p className="mt-1 text-xs text-slate-400 max-w-xs mx-auto">
              {t('transactions.noTransactionsDesc', { month: selectedMonth })}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1 dark:text-slate-400">
              {t('transactions.expensesListTitle', { count: transactions.length })}
            </p>
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between rounded-3xl border border-slate-100 bg-white p-4 shadow-xs transition-colors dark:border-slate-800/80 dark:bg-slate-900"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-xl shadow-2xs dark:bg-slate-800">
                    {tx.categoryIcon}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {tx.categoryName}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-400">
                      {tx.date} {tx.description && `• ${tx.description}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-slate-900 amount-display dark:text-white">
                    -{formatVnd(tx.amountVnd)}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleDelete(tx.id)}
                    aria-label={t('common.delete')}
                    title={t('common.delete')}
                    className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:text-slate-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  )
}
