import { createContext } from 'react'

export interface SettingsContextType {
  payDay: number
  setPayDay: (day: number) => void
}

export const SettingsContext = createContext<SettingsContextType | null>(null)

