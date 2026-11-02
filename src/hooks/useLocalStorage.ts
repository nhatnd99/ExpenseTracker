import { useState, useEffect, useCallback, type Dispatch, type SetStateAction } from 'react'

/**
 * Custom hook useLocalStorage<T>
 * Works exactly like useState<T>, but automatically reads and synchronizes with localStorage.
 *
 * @param key - The localStorage key
 * @param initialValue - Default value or initializer function if no item is stored
 * @param transform - Optional sanitizer / transform function applied to values read from localStorage
 * @returns [storedValue, setValue, removeValue]
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T | (() => T),
  transform?: (val: unknown) => T,
): [T, Dispatch<SetStateAction<T>>, () => void] {
  // 1. Initial State: Read from localStorage or use initialValue
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      if (typeof window === 'undefined') {
        return typeof initialValue === 'function'
          ? (initialValue as () => T)()
          : initialValue
      }

      const item = window.localStorage.getItem(key)
      if (item !== null && item !== undefined && item !== '') {
        const parsed = JSON.parse(item)
        return transform ? transform(parsed) : (parsed as T)
      }
    } catch (error) {
      console.warn(`[useLocalStorage] Error reading key "${key}":`, error)
    }

    return typeof initialValue === 'function'
      ? (initialValue as () => T)()
      : initialValue
  })

  // 2. Synchronize to localStorage whenever storedValue changes
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(storedValue))
      }
    } catch (error) {
      console.warn(`[useLocalStorage] Error writing key "${key}":`, error)
    }
  }, [key, storedValue])

  // 3. Listen to cross-tab/window storage changes
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          const parsed = JSON.parse(e.newValue)
          setStoredValue(transform ? transform(parsed) : (parsed as T))
        } catch {
          // ignore parsing error
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [key, transform])

  // 4. Remove helper
  const removeValue = useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key)
      }
      setStoredValue(
        typeof initialValue === 'function'
          ? (initialValue as () => T)()
          : initialValue,
      )
    } catch (error) {
      console.warn(`[useLocalStorage] Error removing key "${key}":`, error)
    }
  }, [key, initialValue])

  return [storedValue, setStoredValue, removeValue]
}
