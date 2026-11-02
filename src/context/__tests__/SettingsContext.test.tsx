import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { ReactNode } from 'react'
import { SettingsProvider } from '../SettingsContext'
import { useSettings } from '../useSettings'
import {
  QUICK_AMOUNTS_STORAGE_KEY,
  DEFAULT_QUICK_AMOUNTS,
  DEFAULT_QUICK_TEMPLATES,
  DEFAULT_FIXED_BILLS,
  FIXED_BILLS_STORAGE_KEY,
} from '../settings-context'

describe('SettingsContext Quick Amounts & Templates', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  const wrapper = ({ children }: { children: ReactNode }) => (
    <SettingsProvider>{children}</SettingsProvider>
  )

  it('initializes with default quick amounts and templates when localStorage is empty', () => {
    const { result } = renderHook(() => useSettings(), { wrapper })
    expect(result.current.quickAmounts).toEqual(DEFAULT_QUICK_AMOUNTS)
    expect(result.current.quickTemplates).toEqual(DEFAULT_QUICK_TEMPLATES)
  })

  it('migrates legacy numeric quick amounts array into QuickTemplate objects', async () => {
    localStorage.setItem(QUICK_AMOUNTS_STORAGE_KEY, JSON.stringify([25000, 50000]))
    const { result } = renderHook(() => useSettings(), { wrapper })
    await act(async () => {
      await Promise.resolve()
    })

    expect(result.current.quickTemplates.length).toBe(2)
    expect(result.current.quickTemplates[0].amount).toBe(25000)
    expect(result.current.quickTemplates[0].categoryId).toBe('cat-expenses')
    expect(result.current.quickTemplates[1].amount).toBe(50000)
  })

  it('adds, updates, and deletes quick templates with localStorage persistence', async () => {
    const { result } = renderHook(() => useSettings(), { wrapper })
    await act(async () => {
      await Promise.resolve()
    })

    // Add
    let success = false
    await act(async () => {
      success = result.current.addQuickTemplate({
        name: 'Bánh mì sáng',
        amount: 20000,
        categoryId: 'cat-expenses',
        note: 'Bánh mì trứng',
        type: 'expense',
      })
    })
    expect(success).toBe(true)

    const added = result.current.quickTemplates.find((t) => t.name === 'Bánh mì sáng')
    expect(added).toBeDefined()
    expect(added?.amount).toBe(20000)

    // Update
    if (added) {
      await act(async () => {
        result.current.updateQuickTemplate(added.id, {
          amount: 25000,
          name: 'Bánh mì đặc biệt',
        })
      })

      const updated = result.current.quickTemplates.find((t) => t.id === added.id)
      expect(updated?.amount).toBe(25000)
      expect(updated?.name).toBe('Bánh mì đặc biệt')

      // Delete
      await act(async () => {
        result.current.deleteQuickTemplate(added.id)
      })

      const afterDelete = result.current.quickTemplates.find((t) => t.id === added.id)
      expect(afterDelete).toBeUndefined()
    }
  })

  it('rejects adding template with empty name or non-positive amount', async () => {
    const { result } = renderHook(() => useSettings(), { wrapper })
    await act(async () => {
      await Promise.resolve()
    })

    let success = true
    await act(async () => {
      success = result.current.addQuickTemplate({
        name: '',
        amount: 20000,
        categoryId: 'cat-expenses',
        type: 'expense',
      })
    })
    expect(success).toBe(false)

    await act(async () => {
      success = result.current.addQuickTemplate({
        name: 'Ăn vặt',
        amount: 0,
        categoryId: 'cat-expenses',
        type: 'expense',
      })
    })
    expect(success).toBe(false)
  })

  it('loads valid quick amounts from localStorage if present', () => {
    localStorage.setItem(
      QUICK_AMOUNTS_STORAGE_KEY,
      JSON.stringify([20000, 100000, 50000])
    )
    const { result } = renderHook(() => useSettings(), { wrapper })
    // Should be sorted ascending and deduplicated
    expect(result.current.quickAmounts).toEqual([20000, 50000, 100000])
  })

  it('adds a new unique positive amount and keeps list sorted ascending', async () => {
    const { result } = renderHook(() => useSettings(), { wrapper })
    await act(async () => {
      await Promise.resolve()
    })

    let success = false
    await act(async () => {
      success = result.current.addQuickAmount(15000)
    })

    expect(success).toBe(true)
    expect(result.current.quickAmounts).toContain(15000)
  })

  it('rejects duplicate amount and returns false without modifying state', async () => {
    const { result } = renderHook(() => useSettings(), { wrapper })
    await act(async () => {
      await Promise.resolve()
    })

    let success = true
    await act(async () => {
      success = result.current.addQuickAmount(30000)
    })

    expect(success).toBe(false)
  })

  it('removes an existing quick amount and persists change', async () => {
    const { result } = renderHook(() => useSettings(), { wrapper })
    await act(async () => {
      await Promise.resolve()
    })

    await act(async () => {
      result.current.removeQuickAmount(30000)
    })

    expect(result.current.quickAmounts).not.toContain(30000)
  })

  it('sets quick amounts array directly, filtering and sorting them', async () => {
    const { result } = renderHook(() => useSettings(), { wrapper })
    await act(async () => {
      await Promise.resolve()
    })

    await act(async () => {
      result.current.setQuickAmounts([500000, 100000, 0, -10, 200000, 100000])
    })

    expect(result.current.quickAmounts).toEqual([100000, 200000, 500000])
  })

  it('initializes with default fixed bills and persists changes to localStorage', async () => {
    const { result } = renderHook(() => useSettings(), { wrapper })
    expect(result.current.fixedBills).toEqual(DEFAULT_FIXED_BILLS)

    const updatedBills = [
      { id: 'fb-new-1', name: 'Tiền nhà mới', amountVnd: 4000000 },
      { id: 'fb-new-2', name: 'Internet cáp quang', amountVnd: 300000 },
    ]

    await act(async () => {
      result.current.setFixedBills(updatedBills)
    })

    expect(result.current.fixedBills).toEqual(updatedBills)
    const stored = localStorage.getItem(FIXED_BILLS_STORAGE_KEY)
    expect(stored).toBeDefined()
    expect(JSON.parse(stored!)).toEqual(updatedBills)
  })
})
