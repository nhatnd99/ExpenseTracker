import type { DateString } from '@/types/models'

export interface CalendarDayData {
  date: DateString
  dayNumber: number
  limit: number
  spent: number
  balance: number
  isToday: boolean
  isPast: boolean
  isFuture: boolean
}

