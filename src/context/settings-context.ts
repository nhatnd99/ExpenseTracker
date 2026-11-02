import { createContext } from 'react'
import type { QuickTemplate } from '@/types/models'

export interface SettingsContextType {
  payDay: number
  setPayDay: (day: number) => void
  dailyLimit: number
  refreshDailyLimit: () => Promise<number>
  quickAmounts: number[]
  addQuickAmount: (amount: number) => boolean
  removeQuickAmount: (amount: number) => void
  setQuickAmounts: (amounts: number[]) => void
  // Quick Transaction Templates
  quickTemplates: QuickTemplate[]
  addQuickTemplate: (template: Omit<QuickTemplate, 'id'>) => boolean
  updateQuickTemplate: (id: string, updates: Partial<Omit<QuickTemplate, 'id'>>) => boolean
  deleteQuickTemplate: (id: string) => void
  setQuickTemplates: (templates: QuickTemplate[]) => void
}

export const PAYDAY_STORAGE_KEY = 'expense_tracker_payday'
export const QUICK_AMOUNTS_STORAGE_KEY = 'expense_tracker_quick_amounts'
export const QUICK_TEMPLATES_STORAGE_KEY = 'expense_tracker_quick_templates'
export const DEFAULT_QUICK_AMOUNTS: number[] = [25000, 30000, 50000, 100000]
export const MAX_QUICK_AMOUNTS = 6

export const DEFAULT_QUICK_TEMPLATES: QuickTemplate[] = [
  {
    id: 'tpl-default-1',
    name: 'Ăn trưa',
    amount: 35000,
    categoryId: 'cat-expenses',
    note: 'Cơm trưa',
    type: 'expense',
  },
  {
    id: 'tpl-default-2',
    name: 'Cà phê',
    amount: 25000,
    categoryId: 'cat-expenses',
    note: 'Cà phê sáng',
    type: 'expense',
  },
  {
    id: 'tpl-default-3',
    name: 'Đi chợ',
    amount: 100000,
    categoryId: 'cat-expenses',
    note: 'Thực phẩm gia đình',
    type: 'expense',
  },
  {
    id: 'tpl-default-4',
    name: 'Đổ xăng',
    amount: 50000,
    categoryId: 'cat-expenses',
    note: 'Xăng xe',
    type: 'expense',
  },
]

export const SettingsContext = createContext<SettingsContextType | null>(null)
