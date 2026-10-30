import { useEffect, useState, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Trash2, Calendar, Receipt } from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { useCurrentMonth } from '@/hooks/useCurrentMonth'
import {
  getTransactionsForMonth,
  getCategories,
  createTransaction,
  deleteTransaction,
  type EnrichedTransaction,
} from './transactionService'
import { formatVnd } from '@/services/dateService'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type { BudgetCategory } from '@/types/models'
import { CreateExpenseModal } from './components/CreateExpenseModal'

export function TransactionsPage() {
  const { t } = useTranslation()
  const currentMonth = useCurrentMonth()
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth)
  const [transactions, setTransactions] = useState<EnrichedTransaction[]>([])
  const [categories, setCategories] = useState<BudgetCategory[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false)

  // Load categories and transactions whenever selectedMonth changes
  const reloadTransactions = useCallback(async () => {
    try {
      const data = await getTransactionsForMonth(selectedMonth)
      setTransactions(data)
    } finally {
      setLoading(false)
    }
  }, [selectedMonth])

  const reloadCategories = useCallback(async () => {
    const cats = await getCategories()
    setCategories(cats)
  }, [])

  useEffect(() => {
    let active = true

    async function loadInitialData() {
      const [cats, txs] = await Promise.all([
        getCategories(),
        getTransactionsForMonth(selectedMonth),
      ])
      if (active) {
        setCategories(cats)
        setTransactions(txs)
        setLoading(false)
      }
    }

    void loadInitialData()

    return () => {
      active = false
    }
  }, [selectedMonth])

  // Total spent in this month
  const totalSpent = useMemo(() => {
    return transactions.reduce((sum, tx) => sum + tx.amountVnd, 0)
  }, [transactions])

  const handleCreateSubmit = async (data: {
    amountVnd: number
    categoryId: string
    date: string
    description?: string
  }) => {
    await createTransaction(data)
    await reloadTransactions()
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
        <div className="flex items-center justify-between rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-4 shadow-2xs transition-colors">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)]">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                {t('common.month')}
              </span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="block text-sm font-bold text-[var(--color-text-primary)] bg-transparent focus:outline-none"
              />
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-[var(--color-text-muted)]">{t('transactions.totalSpent')}</span>
            <p className="text-base font-bold text-[var(--color-expense)] amount-display">
              {formatVnd(totalSpent)}
            </p>
          </div>
        </div>

        {/* Add Transaction Button */}
        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="w-full rounded-2xl bg-[var(--color-primary)] px-5 py-4 text-center text-sm font-bold text-white shadow-md transition-all hover:bg-[var(--color-primary-hover)] active:scale-[0.99] touch-target cursor-pointer flex items-center justify-center gap-2"
        >
          <Plus className="h-5 w-5 stroke-[2.5]" />
          <span>{t('transactions.addExpenseBtn')}</span>
        </button>

        {/* Transaction List */}
        {loading ? (
          <div className="py-16 flex justify-center">
            <LoadingSpinner label={t('common.loading')} />
          </div>
        ) : transactions.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg-surface)] p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)]">
              <Receipt className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm font-bold text-[var(--color-text-primary)]">
              {t('transactions.noTransactions')}
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)] max-w-xs mx-auto">
              {t('transactions.noTransactionsDesc', { month: selectedMonth })}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider px-1">
              {t('transactions.expensesListTitle', { count: transactions.length })}
            </p>
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-4 shadow-2xs transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-bg-subtle)] text-xl shadow-2xs">
                    {tx.categoryIcon}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[var(--color-text-primary)]">
                      {tx.categoryName}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {tx.date} {tx.description && `• ${tx.description}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-[var(--color-expense)] amount-display">
                    -{formatVnd(tx.amountVnd)}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleDelete(tx.id)}
                    aria-label={t('common.delete')}
                    title={t('common.delete')}
                    className="flex h-8 w-8 items-center justify-center rounded-xl text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-expense-soft)] hover:text-[var(--color-expense)] cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mobile-first Create Expense Modal */}
      <CreateExpenseModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        categories={categories}
        onCategoriesChanged={reloadCategories}
        onSubmit={handleCreateSubmit}
      />
    </PageContainer>
  )
}
