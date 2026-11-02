/**
 * providers.tsx
 * Central location for React context providers and app initialization.
 */
import { useEffect, type ReactNode } from 'react'
import { seedDefaultCategories } from '@/db/seed'
import { ThemeProvider } from '@/context/ThemeContext'
import { SettingsProvider } from '@/context/SettingsContext'
import { TransactionProvider } from '@/context/TransactionContext'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  useEffect(() => {
    // Seed default categories idempotently on app launch
    void seedDefaultCategories()
  }, [])

  return (
    <ThemeProvider>
      <SettingsProvider>
        <TransactionProvider>{children}</TransactionProvider>
      </SettingsProvider>
    </ThemeProvider>
  )
}
