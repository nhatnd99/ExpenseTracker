export interface FixedBillItem {
  id: string
  name: string
  amountVnd: number
}

export interface BudgetItemState {
  id: string
  name: string
  icon: string
  percent: number
  isDefault?: boolean
}

export type BudgetSaveScope = 'all_months' | 'current_month_only'

