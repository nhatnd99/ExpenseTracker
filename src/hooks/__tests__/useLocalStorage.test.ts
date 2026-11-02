import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLocalStorage } from '../useLocalStorage'

describe('useLocalStorage hook', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('initializes with default value when localStorage is empty', () => {
    const { result } = renderHook(() => useLocalStorage('test_key', 'initial'))
    expect(result.current[0]).toBe('initial')
    // Should persist initial value to localStorage
    expect(localStorage.getItem('test_key')).toBe(JSON.stringify('initial'))
  })

  it('initializes with stored value from localStorage if already present', () => {
    localStorage.setItem('test_number', JSON.stringify(42))
    const { result } = renderHook(() => useLocalStorage('test_number', 0))
    expect(result.current[0]).toBe(42)
  })

  it('updates state and localStorage synchronously when setValue is called', () => {
    const { result } = renderHook(() => useLocalStorage('test_str', 'hello'))

    act(() => {
      result.current[1]('world')
    })

    expect(result.current[0]).toBe('world')
    expect(localStorage.getItem('test_str')).toBe(JSON.stringify('world'))
  })

  it('supports functional updates like standard useState', () => {
    const { result } = renderHook(() => useLocalStorage('counter', 10))

    act(() => {
      result.current[1]((prev) => prev + 5)
    })

    expect(result.current[0]).toBe(15)
    expect(localStorage.getItem('counter')).toBe(JSON.stringify(15))
  })

  it('removes item and resets to initial value when removeValue is called', () => {
    localStorage.setItem('temp_item', JSON.stringify('active'))
    const { result } = renderHook(() => useLocalStorage('temp_item', 'default'))

    expect(result.current[0]).toBe('active')

    act(() => {
      result.current[2]() // removeValue
    })

    expect(result.current[0]).toBe('default')
  })

  it('safely falls back to initial value when stored JSON is corrupted', () => {
    localStorage.setItem('corrupt_key', '{not valid json}')
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { result } = renderHook(() => useLocalStorage('corrupt_key', { fallback: true }))
    expect(result.current[0]).toEqual({ fallback: true })
    warnSpy.mockRestore()
  })

  it('synchronizes cross-window storage event', () => {
    const { result } = renderHook(() => useLocalStorage('sync_key', 'local'))

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'sync_key',
          newValue: JSON.stringify('remote_update'),
        }),
      )
    })

    expect(result.current[0]).toBe('remote_update')
  })
})

