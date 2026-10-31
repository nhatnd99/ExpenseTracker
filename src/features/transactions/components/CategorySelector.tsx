import React from 'react'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import type { BudgetCategory } from '@/types/models'
import { CategoryIconRenderer } from '@/components/ui/CategoryIconRenderer'

interface CategorySelectorProps {
  categories: BudgetCategory[]
  selectedCategoryId: string
  onSelectCategory: (id: string) => void
  onOpenManager: () => void
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
  onOpenManager,
}) => {
  const { t } = useTranslation()

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">
          {t('transactions.categories', 'Danh mục')}
        </span>
        <button
          type="button"
          onClick={onOpenManager}
          className="flex items-center gap-1 text-xs font-semibold text-[var(--color-primary)] hover:underline cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>{t('transactions.customize', 'Tùy chỉnh')}</span>
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {categories.map((cat) => {
          const isSelected = selectedCategoryId === cat.id
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all active:scale-95 cursor-pointer touch-target ${
                isSelected
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)] shadow-2xs font-bold ring-2 ring-[var(--color-primary)]/20'
                  : 'border-[var(--color-border)] bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]'
              }`}
            >
              <span className="flex h-7 w-7 items-center justify-center mb-1">
                <CategoryIconRenderer icon={cat.icon} size={22} />
              </span>
              <span className="text-[11px] truncate w-full text-center tracking-tight">
                {cat.name}
              </span>
            </button>
          )
        })}

        {/* Plus button to quickly add or manage */}
        <button
          type="button"
          onClick={onOpenManager}
          className="flex flex-col items-center justify-center p-2.5 rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] active:scale-95 cursor-pointer touch-target"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--color-bg-surface)] text-sm mb-1">
            <Plus className="h-4 w-4" />
          </div>
          <span className="text-[11px] tracking-tight">{t('common.add', 'Thêm')}</span>
        </button>
      </div>
    </div>
  )
}

