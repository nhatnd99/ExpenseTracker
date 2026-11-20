export type BillPaymentStatus = 'PAID' | 'UNPAID'

export interface BillPaymentRecord {
  status: BillPaymentStatus
  paidAt?: string | null
}

export interface FixedBillItem {
  id: string
  name: string
  amountVnd: number
  amount?: number
  paymentHistory?: Record<string, BillPaymentRecord>
}

export interface FixedBillsSummary {
  totalAmount: number
  paidAmount: number
  unpaidAmount: number
  paidCount: number
  totalCount: number
  completionPercentage: number
  calculatedPercent: number
}

export type FixedBillsFilter = 'ALL' | 'UNPAID' | 'PAID'

export interface BudgetItemState {
  id: string
  name: string
  icon: string
  percent: number
  isDefault?: boolean
}

export type BudgetSaveScope = 'all_months' | 'current_month_only'
