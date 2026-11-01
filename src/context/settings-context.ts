import { createContext } from 'react'

export interface SettingsContextType {
  payDay: number
  setPayDay: (day: number) => void
  dailyLimit: number
  refreshDailyLimit: () => Promise<number>
  quickAmounts: number[]
  addQuickAmount: (amount: number) => boolean
  removeQuickAmount: (amount: number) => void
  setQuickAmounts: (amounts: number[]) => void
}

export const PAYDAY_STORAGE_KEY = 'expense_tracker_payday'
export const QUICK_AMOUNTS_STORAGE_KEY = 'expense_tracker_quick_amounts'
export const DEFAULT_QUICK_AMOUNTS: number[] = [25000, 30000, 50000]

export const SettingsContext = createContext<SettingsContextType | null>(null)
