import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { ReactNode } from 'react'
import { SettingsProvider } from '../SettingsContext'
import { useSettings } from '../useSettings'
import { QUICK_AMOUNTS_STORAGE_KEY, DEFAULT_QUICK_AMOUNTS } from '../settings-context'

describe('SettingsContext Quick Amounts', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  const wrapper = ({ children }: { children: ReactNode }) => (
    <SettingsProvider>{children}</SettingsProvider>
  )

  it('initializes with default quick amounts when localStorage is empty', () => {
    const { result } = renderHook(() => useSettings(), { wrapper })
    expect(result.current.quickAmounts).toEqual(DEFAULT_QUICK_AMOUNTS)
    expect(result.current.quickAmounts).toEqual([25000, 30000, 50000])
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
    expect(result.current.quickAmounts).toEqual([15000, 25000, 30000, 50000])
    expect(
      JSON.parse(localStorage.getItem(QUICK_AMOUNTS_STORAGE_KEY) || '[]')
    ).toEqual([15000, 25000, 30000, 50000])
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
    expect(result.current.quickAmounts).toEqual([25000, 30000, 50000])
  })

  it('rejects invalid or non-positive amount and returns false', async () => {
    const { result } = renderHook(() => useSettings(), { wrapper })
    await act(async () => {
      await Promise.resolve()
    })

    let success = true
    await act(async () => {
      success = result.current.addQuickAmount(0)
    })
    expect(success).toBe(false)

    await act(async () => {
      success = result.current.addQuickAmount(-50000)
    })
    expect(success).toBe(false)
    expect(result.current.quickAmounts).toEqual([25000, 30000, 50000])
  })

  it('removes an existing quick amount and persists change', async () => {
    const { result } = renderHook(() => useSettings(), { wrapper })
    await act(async () => {
      await Promise.resolve()
    })

    await act(async () => {
      result.current.removeQuickAmount(30000)
    })

    expect(result.current.quickAmounts).toEqual([25000, 50000])
    expect(
      JSON.parse(localStorage.getItem(QUICK_AMOUNTS_STORAGE_KEY) || '[]')
    ).toEqual([25000, 50000])
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
})
