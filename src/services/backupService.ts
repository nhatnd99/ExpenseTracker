/**
 * backupService.ts
 * Handles export and import of local financial data as JSON files.
 *
 * IMPORTANT: This service deals with personal financial data.
 * - Data is exported to the user's local file system only.
 * - No data is transmitted to any server.
 * - Users are responsible for securing their backup files.
 *
 * NOTE: Full backup/restore is not implemented in the initial release.
 * This module documents the intended interface for future implementation.
 */

export interface BackupData {
  version: number
  exportedAt: string
  /** Placeholder for future full data export */
  data: Record<string, unknown>
}

/**
 * Triggers a browser download of a JSON backup file.
 * Not yet fully implemented — reserved for a future release.
 */
export async function exportBackup(): Promise<void> {
  throw new Error('Backup export is not yet implemented.')
}

/**
 * Reads a JSON backup file and restores data to IndexedDB.
 * Not yet fully implemented — reserved for a future release.
 */
export async function importBackup(_file: File): Promise<void> {
  throw new Error('Backup import is not yet implemented.')
}

