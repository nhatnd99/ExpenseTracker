/**
 * crypto.ts
 * Thin wrapper around the Web Crypto API for UUID generation.
 * Centralises the API call so it can be easily mocked in tests.
 */
export const crypto = {
  randomUUID(): string {
    return globalThis.crypto.randomUUID()
  },
}

