import { useContext } from 'react'
import { TransactionContext, type TransactionContextType } from './transaction-context'

export function useTransactions(): TransactionContextType {
  const context = useContext(TransactionContext)
  if (!context) {
    throw new Error('useTransactions must be used within a TransactionProvider')
  }
  return context
}

