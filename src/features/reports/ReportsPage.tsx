import { useEffect, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { BarChart3, Calendar, PieChart } from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { useCurrentMonth } from '@/hooks/useCurrentMonth'
import { getTransactionsForMonth, type EnrichedTransaction } from '@/features/transactions/transactionService'
import { formatVnd } from '@/services/dateService'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface CategoryStat {
  categoryId: string
  name: string
  icon: string
  totalVnd: number
  percent: number
}

export function ReportsPage() {
  const { t } = useTranslation()
  const currentMonth = useCurrentMonth()
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth)
  const [transactions, setTransactions] = useState<EnrichedTransaction[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    let active = true

    getTransactionsForMonth(selectedMonth)
      .then((txs) => {
        if (active) setTransactions(txs)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [selectedMonth])

  const { totalSpent, categoryStats } = useMemo(() => {
    const total = transactions.reduce((sum, tx) => sum + tx.amountVnd, 0)
    const map = new Map<string, { name: string; icon: string; total: number }>()

    for (const tx of transactions) {
      const existing = map.get(tx.categoryId) ?? {
        name: tx.categoryName,
        icon: tx.categoryIcon,
        total: 0,
      }
      existing.total += tx.amountVnd
      map.set(tx.categoryId, existing)
    }

    const stats: CategoryStat[] = [...map.entries()]
      .map(([categoryId, { name, icon, total: catTotal }]) => ({
        categoryId,
        name,
        icon,
        totalVnd: catTotal,
        percent: total > 0 ? Math.round((catTotal / total) * 100) : 0,
      }))
      .sort((a, b) => b.totalVnd - a.totalVnd)

    return { totalSpent: total, categoryStats: stats }
  }, [transactions])

  return (
    <PageContainer title={t('app.reports')}>
      <div className="space-y-4">
        {/* Month selector */}
        <div className="flex items-center justify-between rounded-3xl border border-slate-100 bg-white p-4 shadow-xs transition-colors dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                {t('reports.reportMonth')}
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
            <span className="text-xs text-slate-400">{t('reports.totalSpent')}</span>
            <p className="text-base font-bold text-slate-900 amount-display dark:text-white">
              {formatVnd(totalSpent)}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-16 flex justify-center">
            <LoadingSpinner label={t('common.loading')} />
          </div>
        ) : transactions.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900/50">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
              <PieChart className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm font-bold text-slate-800 dark:text-slate-200">
              {t('reports.noRecords')}
            </p>
            <p className="mt-1 text-xs text-slate-400 max-w-xs mx-auto">
              {t('reports.noRecordsDesc', { month: selectedMonth })}
            </p>
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-xs transition-colors dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-cyan-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {t('reports.spendingByCategory')}
              </h3>
            </div>

            <div className="space-y-3.5 pt-1">
              {categoryStats.map((stat) => (
                <div key={stat.categoryId} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 flex items-center gap-2 dark:text-slate-200">
                      <span className="text-sm">{stat.icon}</span>
                      <span>{stat.name}</span>
                    </span>
                    <span className="font-bold text-slate-900 amount-display dark:text-white">
                      {formatVnd(stat.totalVnd)}{' '}
                      <span className="text-slate-400 font-normal">({stat.percent}%)</span>
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-slate-900 rounded-full transition-all duration-500 dark:from-cyan-400 dark:to-cyan-600"
                      style={{ width: `${stat.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  )
}
