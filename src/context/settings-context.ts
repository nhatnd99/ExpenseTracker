import { createContext } from 'react'

export interface SettingsContextType {
  payDay: number
  setPayDay: (day: number) => void
  dailyLimit: number
  refreshDailyLimit: () => Promise<number>
}

export const SettingsContext = createContext<SettingsContextType | null>(null)
