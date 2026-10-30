import { useState, useEffect } from 'react'
import { db } from '@/db/database'

export function useSmartNotes(categoryId?: string) {
  const [topNotes, setTopNotes] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    let active = true

    async function calculateTopNotes() {
      setIsLoading(true)
      try {
        let transactions = await db.transactions.toArray()
        if (categoryId) {
          transactions = transactions.filter((t) => t.categoryId === categoryId)
        }

        // Frequency map of non-empty notes
        const noteCounts = new Map<string, number>()
        for (const tx of transactions) {
          const desc = tx.description?.trim()
          if (desc && desc.length > 0) {
            noteCounts.set(desc, (noteCounts.get(desc) ?? 0) + 1)
          }
        }

        // Sort descending by count and take top 5
        const sorted = [...noteCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([note]) => note)

        const defaultSuggestions = ['Cơm trưa', 'Cafe', 'Siêu thị', 'Đổ xăng', 'Tiền phòng']
        const finalNotes = sorted.length > 0 ? sorted : defaultSuggestions

        if (active) {
          setTopNotes(finalNotes)
        }
      } catch (err) {
        console.error('Error fetching smart notes:', err)
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    void calculateTopNotes()

    return () => {
      active = false
    }
  }, [categoryId])

  return { topNotes, isLoading }
}

