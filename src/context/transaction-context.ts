import { createContext } from 'react'
import type { Transaction, BudgetCategory } from '@/types/models'

export interface TransactionContextType {
  transactions: Transaction[]
  setTransactions: (transactions: Transaction[] | ((prev: Transaction[]) => Transaction[])) => void
  categories: BudgetCategory[]
  setCategories: (categories: BudgetCategory[] | ((prev: BudgetCategory[]) => BudgetCategory[])) => void
  addTransaction: (tx: Transaction) => Promise<void>
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>
  deleteTransaction: (id: string) => Promise<void>
  addCategory: (cat: BudgetCategory) => Promise<void>
  updateCategory: (id: string, updates: Partial<BudgetCategory>) => Promise<void>
  deleteCategory: (id: string) => Promise<void>
  isRehydrated: boolean
}

export const TRANSACTIONS_STORAGE_KEY = 'expense_tracker_transactions'
export const CATEGORIES_STORAGE_KEY = 'expense_tracker_categories'

export const DEFAULT_BUDGET_CATEGORIES: BudgetCategory[] = [
  { id: 'cat-expenses', name: 'Daily Expenses', icon: '🛒', type: 'expense', isFixedBill: false, sortOrder: 1, createdAt: '', updatedAt: '' },
  { id: 'cat-fixed', name: 'Fixed Bills', icon: '🏠', type: 'expense', isFixedBill: true, sortOrder: 2, createdAt: '', updatedAt: '' },
  { id: 'cat-savings', name: 'Savings', icon: '🏦', type: 'expense', isFixedBill: true, sortOrder: 3, createdAt: '', updatedAt: '' },
  { id: 'cat-investment', name: 'Investment', icon: '📈', type: 'expense', isFixedBill: true, sortOrder: 4, createdAt: '', updatedAt: '' },
  { id: 'cat-emergency', name: 'Emergency Fund', icon: '🆘', type: 'expense', isFixedBill: true, sortOrder: 5, createdAt: '', updatedAt: '' },
  { id: 'cat-inc-salary', name: 'Tiền lương', icon: 'Banknote', type: 'income', isFixedBill: false, sortOrder: 101, createdAt: '', updatedAt: '' },
  { id: 'cat-inc-bonus', name: 'Tiền thưởng', icon: 'Gift', type: 'income', isFixedBill: false, sortOrder: 102, createdAt: '', updatedAt: '' },
  { id: 'cat-inc-debt', name: 'Được trả nợ', icon: 'HandCoins', type: 'income', isFixedBill: false, sortOrder: 103, createdAt: '', updatedAt: '' },
  { id: 'cat-inc-selling', name: 'Bán thanh lý', icon: 'Tag', type: 'income', isFixedBill: false, sortOrder: 104, createdAt: '', updatedAt: '' },
  { id: 'cat-inc-extra', name: 'Thu nhập phụ', icon: 'Sparkles', type: 'income', isFixedBill: false, sortOrder: 105, createdAt: '', updatedAt: '' },
  { id: 'cat-inc-other', name: 'Thu nhập khác', icon: 'Coins', type: 'income', isFixedBill: false, sortOrder: 106, createdAt: '', updatedAt: '' },
]

export const TransactionContext = createContext<TransactionContextType | null>(null)

